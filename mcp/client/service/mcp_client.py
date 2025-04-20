import dotenv
from contextlib import AsyncExitStack
from typing import Dict, List
import asyncio
import httpx
import os
import datetime
import json
from collections import defaultdict

dotenv.load_dotenv()
from loguru import logger
from uuid import uuid4
from ollama import Client
from openai import OpenAI
from mcp import ClientSession, StdioServerParameters
from mcp.types import Tool as mcp_tool
from mcp.client.stdio import stdio_client

from schemas.mcp import MCPPlanRequest, MCPTaskRequest, PlanData
from schemas.mcp import MCPTool, MCPServer
from prompts.plan_create import PLAN_SYSTEM_PROMPT, PLAN_CREATE_PROMPT
from prompts.mcp_reqeust import MCP_REQUEST_SYSTEM_PROMPT, MCP_REQUEST_PROMPT
from prompts.onlysaid_admin_prompt import ONLYSAID_ADMIN_PROMPT, ONLYSAID_ADMIN_PROMPT_TEMPLATE
from utils.mcp import parse_mcp_tools
from service.socket_client import SocketClient
from messages.plan_create import format_plan_created_message

class MCPClient:
    """
    A MCP client manager that contains connections to mcp servers
    """
    def __init__(
        self, servers: dict,
        socket_client: SocketClient
    ):
        self.servers = servers
        self.server_names = list(self.servers.keys())
        self.exit_stack = {server: AsyncExitStack() for server in self.servers}
        self.ollama_client = Client(host=os.getenv("OLLAMA_API_BASE_URL"))
        self.ollama_model = os.getenv("OLLAMA_MODEL", "")
        self.openai_client = OpenAI(
            api_key=os.getenv("OPENAI_API_KEY"),
            base_url=os.getenv("OPENAI_API_BASE_URL")
        )
        self.server_descriptions_dict = {}
        self.server_tools_dict = {}
        self.mcp_tools_dict = {}
        for server in self.servers:
            self.server_descriptions_dict[server] = self.load_server_description(self.servers[server]["description"])
        self.server_descriptions = self.format_server_descriptions()
        self.socket_client = socket_client

    async def connect_to_servers(self) -> None:
        logger.info(f"Connecting to servers: {self.servers}")
        for server, server_info in self.servers.items():
            server_script_path = server_info["path"]
            is_python = server_script_path.endswith('.py')
            is_js = server_script_path.endswith('.js')
            if not (is_python or is_js):
                raise ValueError("Server script must be a .py or .js file")
            command = "python" if is_python else "node"

            server_params = StdioServerParameters(
                command=command,
                args=[server_script_path],
                env=None
            )
            stdio_transport = await self.exit_stack[server].enter_async_context(stdio_client(server_params))
            self.stdio, self.write = stdio_transport
            self.servers[server] = await self.exit_stack[server].enter_async_context(ClientSession(self.stdio, self.write))
            
            await self.servers[server].initialize()

            response = await self.servers[server].list_tools()
            tools = response.tools
            self.server_tools_dict[server] = tools
            logger.info(f"Server tools: {tools}")
            self.mcp_tools_dict[server] = [self.tools_from_mcp(tool) for tool in tools]

    def tools_from_mcp(self, tool: mcp_tool):
        """
        Convert MCP tool format to OpenAI function calling format.
        
        Args:
            tool: An MCP tool object
            
        Returns:
            dict: A tool description in OpenAI function calling format
        """
        function_obj = {
            "name": tool.name,
            "description": tool.description,
            "parameters": tool.inputSchema
        }
        
        return {
            "type": "function",
            "function": function_obj
        }

    async def create_plan(
    self, 
    plan_request: MCPPlanRequest, 
) -> None:
        client_url = os.environ.get("CLIENT_URL", "")

        async with httpx.AsyncClient() as client:
            try:
                response = await client.post(
                    f"{client_url}/api/chat/get_messages", 
                    json={"roomId": plan_request.room_id, "limit": 100},
                    headers={"Content-Type": "application/json"}
                )
                response.raise_for_status()
                messages = response.json()
            except Exception as e:
                logger.error(f"Error fetching messages: {e}")
                messages = []
        
        query = plan_request.query
        query = query.replace("@agent", "")
        query = [{"role": "user", "content": query}]

        conversations = [
            {
                "role": "assistant" if msg["sender"] == "agent" else "user",
                "content": msg["content"],
                "created_at": msg.get("created_at", "")
            }
            for msg in messages
        ] + query
        
        additional_context = f"""
        Current datetime: {datetime.datetime.now(datetime.timezone(datetime.timedelta(hours=8))).isoformat()}
        """
        
        response = self.openai_client.chat.completions.create(
            model="deepseek-chat",
            messages=[
                {
                    "role": "system", 
                    "content": PLAN_SYSTEM_PROMPT
                },
                {
                    "role": "user", 
                    "content": PLAN_CREATE_PROMPT.format(
                        conversations=self.format_conversation(conversations),
                        additional_context=additional_context,
                        assistants=self.server_names,
                        assistant_descriptions=self.format_server_descriptions()
                    )
                }
            ],
            temperature=0.7
        )
        
        # Extract and parse the JSON plan from the response
        plan_json = self.extract_json_from_response(response)
        if plan_json:
            # First, create a plan record in the database
            plan_overview = plan_json.get("plan_overview", "No plan overview provided")
            plan_name = plan_json.get("plan_name", "No plan name provided")
            try:
                # Create a context object that includes both the plan and conversations
                context = {
                    "plan": plan_json,
                    "conversations": conversations,
                    "query": query
                }
                
                # Check if this plan requires any tools
                no_tools_needed = False
                if "plan" not in plan_json or not plan_json["plan"] or plan_json.get("no_skills_needed", False):
                    no_tools_needed = True
                elif plan_json.get("plan_name", "").lower() == "null_plan":
                    no_tools_needed = True
                
                # Generate plan_id (client-side ID)
                plan_id = str(uuid4())
                
                # Use timezone-aware datetime
                current_time = datetime.datetime.now(datetime.timezone(datetime.timedelta(hours=8))).isoformat()
                
                # Create the plan via API
                async with httpx.AsyncClient() as client:
                    plan_response = await client.post(
                        f"{client_url}/api/plan/create_plan",
                        json={
                            "id": plan_id,  # Changed from plan_id to id
                            "plan_name": plan_name,
                            "plan_overview": plan_overview,
                            "room_id": plan_request.room_id,
                            "context": context,
                            "assigner": plan_request.assigner,
                            "assignee": plan_request.assignee,
                            "reviewer": getattr(plan_request, 'reviewer', None),
                            "no_skills_needed": no_tools_needed
                        },
                        headers={"Content-Type": "application/json"}
                    )
                    plan_response.raise_for_status()
                    plan_data = plan_response.json()
                    
                    # Create plan_created log using the create_plan_log API
                    log_response = await client.post(
                        f"{client_url}/api/plan/create_plan_log",
                        json={
                            "type": "plan_created",
                            "plan_id": plan_data["plan"]["id"],  # Use the ID from the response
                            "content": f"Plan **{plan_name}** has been created",
                        },
                        headers={"Content-Type": "application/json"}
                    )
                    log_response.raise_for_status()
                    log_data = log_response.json()
                    
                    # Update the plan with the log ID
                    update_response = await client.put(  # Changed from post to put to match the API
                        f"{client_url}/api/plan/update_plan",
                        json={
                            "plan_id": plan_data["plan"]["id"],  # Changed from id to plan_id
                            "logs": [log_data["log"]["id"]]  # Changed from log_ids to logs
                        },
                        headers={"Content-Type": "application/json"}
                    )
                    update_response.raise_for_status()
                    
                    # Fetch user information from the API
                    user_response = await client.get(
                        f"{client_url}/api/user/get_user_by_id?id={plan_request.assignee}",
                        headers={"Content-Type": "application/json"}
                    )
                    user_response.raise_for_status()
                    user_data = user_response.json()
                    
                    # Use the entire user data from the API response
                    sender_data = user_data["user"]
                    
                    # Compose a natural language, markdown-supported message for plan creation
                    plan_created_message = format_plan_created_message(
                        plan_name=plan_name,
                        plan_id=plan_data['plan']['id'],
                        plan_overview=plan_overview
                    )

                    await self.socket_client.send_message(
                        {
                            "id": str(uuid4()),
                            "created_at": datetime.datetime.now(datetime.timezone(datetime.timedelta(hours=8))).isoformat(),
                            "sender": sender_data,
                            "content": plan_created_message,
                            "avatar": sender_data.get("avatar", None),
                            "room_id": plan_request.room_id,
                            "mentions": []
                        }
                    )
                                        
                    # Then create tasks associated with this plan
                    tasks = await self.create_tasks(
                        plan_json, 
                        plan_id
                    )
                    
                    if tasks:
                        # Create the tasks via API
                        tasks_response = await client.post(
                            f"{client_url}/api/plan/create_tasks",
                            json={
                                "plan_id": plan_data["plan"]["id"],
                                "tasks": tasks
                            },
                            headers={"Content-Type": "application/json"}
                        )
                        tasks_response.raise_for_status()
                        tasks_data = tasks_response.json()
                    else:
                        # Mark the plan as completed if no tasks were created
                        await client.put(
                            f"{client_url}/api/plan/update_plan",
                            json={
                                "id": plan_id,
                                "status": "success",
                                "progress": 100,
                                "completed_at": datetime.datetime.now(datetime.timezone(datetime.timedelta(hours=8))).isoformat()
                            },
                            headers={"Content-Type": "application/json"}
                        )
                    
            except Exception as e:
                logger.error(f"Error creating plan or tasks in database: {e}")
        else:
            logger.error("Failed to extract valid JSON plan from response")


    async def create_tasks(self, data, plan_id: str) -> List[dict]:
        """
        Create complete task objects from either a plan JSON or a list of actions.
        
        Args:
            data: Either a plan JSON object or a list of actions
            plan_id: The ID of the parent plan
            
        Returns:
            List[dict]: A list of task dictionaries
        """
        logger.info(f"Creating tasks from data type: {type(data)}")
        tasks = []
        client_url = os.environ.get("CLIENT_URL", "")
        
        # Check if data is a list (actions list)
        if isinstance(data, list):
            logger.info("Processing data as actions list")
            # Process each action in the list
            for i, action in enumerate(data):
                try:
                    # Extract action details
                    tool_name = action.get("name", f"Action {i+1}")
                    args = action.get("args", {})
                    mcp_server = action.get("mcp_server", "onlysaid_admin")
                    
                    # Format args for display
                    args_str = json.dumps(args, indent=2)
                    
                    # Create a skill record for this action
                    skill_ids = []
                    try:
                        async with httpx.AsyncClient() as client:
                            # Get the proper tool description from the mcp_tools_dict
                            tool_description = self.get_tool_description(tool_name, mcp_server)
                            
                            skill_payload = {
                                "name": tool_name,
                                "mcp_server": mcp_server,
                                "description": tool_description,
                                "type": "function",
                                "args": args
                            }
                            
                            skill_response = await client.post(
                                f"{client_url}/api/skill/create_skill",
                                json=skill_payload,
                                headers={"Content-Type": "application/json"}
                            )
                            skill_response.raise_for_status()
                            skill_id = skill_response.json()["skill"]["id"]
                            skill_ids.append(skill_id)
                    except Exception as e:
                        logger.error(f"Error creating skill record for action {i}: {e}")
                    
                    # Try to fetch the plan data to get task descriptions
                    task_name = f"Execute {tool_name}"
                    task_explanation = None
                    expected_result = None
                    
                    # If this action has a plan_id in its args, try to fetch the plan data
                    plan_id_from_action = None
                    if isinstance(args, dict) and "plan_id" in args:
                        if isinstance(args["plan_id"], dict) and "value" in args["plan_id"]:
                            plan_id_from_action = args["plan_id"]["value"]
                        else:
                            plan_id_from_action = args["plan_id"]
                    
                    if plan_id_from_action:
                        try:
                            async with httpx.AsyncClient() as client:
                                plan_response = await client.get(
                                    f"{client_url}/api/plan/get_plan_by_id?id={plan_id_from_action}",
                                    headers={"Content-Type": "application/json"}
                                )
                                plan_response.raise_for_status()
                                plan_data = plan_response.json()
                                logger.info(f"Plan data: {plan_data}")
                                
                                if "context" in plan_data and "plan" in plan_data["context"]:
                                    plan_context = plan_data["context"]["plan"]
                                    # Find the step that corresponds to this action's index
                                    step_key = f"step_{i+1}"
                                    if "plan" in plan_context and step_key in plan_context["plan"]:
                                        step = plan_context["plan"][step_key]
                                        # Use the name, explanation and expected_result from the plan
                                        if "name" in step:
                                            task_name = step["name"]
                                        if "explanation" in step:
                                            task_explanation = step["explanation"]
                                        if "expected_result" in step:
                                            expected_result = step["expected_result"]
                        except Exception as e:
                            logger.error(f"Error fetching plan data for action {i}: {e}")
                            raise ValueError(f"Failed to fetch plan data for action {i}: {e}")
                    
                    # If we couldn't get explanation/result from plan, raise an error
                    if task_explanation is None or expected_result is None:
                        raise ValueError(f"Missing explanation or expected result for action {i}")
                    
                    # Create the task
                    task = {
                        "step_number": i + 1,  # 1-based step number
                        "task_name": task_name,
                        "task_explanation": task_explanation,
                        "expected_result": expected_result,
                        "mcp_server": mcp_server,
                        "skills": skill_ids,  # Store skill IDs instead of the entire action object
                        "status": "not_started",  # Initialize task status to not_started
                        "plan_id": plan_id  # Associate with the parent plan
                    }
                    
                    tasks.append(task)
                    logger.info(f"Created task from action: {task['task_name']}")
                except Exception as e:
                    logger.error(f"Error creating task for action {i}: {e}")
                    # Continue with next action
        
        # Check if data is a dict (plan JSON)
        elif isinstance(data, dict):
            logger.info("Processing data as plan JSON")
            # Check if there's a plan with steps
            if "plan" in data and isinstance(data["plan"], dict):
                # If the plan is empty, return an empty list (no tasks needed)
                if not data["plan"]:
                    logger.info(f"Empty plan detected, no tasks will be created")
                    return []
                
                # Sort steps to ensure they're processed in order (step_1, step_2, etc.)
                steps = sorted(data["plan"].keys())
                
                for i, step_key in enumerate(steps):
                    try:
                        step = data["plan"][step_key]
                        
                        # Skip steps without an assignee or with "None" as assignee
                        step_assignee_name = step.get("assignee")
                        if not step_assignee_name or step_assignee_name.lower() == "none" or "none" in step_assignee_name.lower():
                            continue
                        
                        # Extract task details from the step
                        task_name = step.get("name", f"Step {i+1}")
                        task_explanation = step.get("explanation", "")
                        expected_result = step.get("expected_result", "")
                        
                        # For plan steps, we just initialize an empty array for skills
                        # No need to create skill records for plan steps
                        
                        # Create the task matching the expected format in create_tasks API
                        task = {
                            "step_number": i + 1,  # 1-based step number
                            "task_name": task_name,
                            "task_explanation": task_explanation,
                            "expected_result": expected_result,
                            "mcp_server": step_assignee_name,
                            "skills": [],  # Initialize with empty array for skill IDs
                            "status": "not_started",  # Initialize task status to not_started
                            "plan_id": plan_id  # Associate with the parent plan
                        }
                        
                        tasks.append(task)
                        logger.info(f"Created task from plan step: {task['task_name']}")
                    except Exception as e:
                        logger.error(f"Error creating task for step {step_key}: {e}")
                        # Continue with next step
            
            # If no valid tasks were created from steps, create a default task
            if not tasks and data.get("no_skills_needed", False):
                # No tasks needed, return empty list to trigger auto-completion
                logger.info("No skills needed flag set, returning empty task list")
                return []
            elif not tasks and data.get("plan_name", "").lower() == "null_plan":
                # Special case for null plans - no tasks needed
                logger.info("Null plan detected, returning empty task list")
                return []
            elif not tasks:
                # Create a minimal task with an empty skills array
                task = {
                    "step_number": 1,
                    "task_name": "Execute request",
                    "task_explanation": "",  # No default explanation
                    "expected_result": "",   # No default expected result
                    "skills": [],  # Initialize with empty array for skill IDs
                    "status": "not_started",  # Initialize task status to not_started
                    "plan_id": plan_id  # Associate with the parent plan
                }
                
                tasks.append(task)
                logger.info(f"Created minimal task: {task['task_name']}")
        else:
            logger.error(f"Unsupported data type for create_tasks: {type(data)}")
        
        return tasks

    async def create_mcp_request(self, mcp_request: MCPTaskRequest):
        task = mcp_request.task
        mcp_server = task.mcp_server
        plan = mcp_request.plan.context.conversations
        mcp_tools = self.mcp_tools_dict[mcp_server]
        client_url = os.environ.get("CLIENT_URL", "")
        
        system_prompt = MCP_REQUEST_SYSTEM_PROMPT.format(
            mcp_server_speciality=self.server_descriptions_dict[mcp_server]
        )
        background_information = self.prepare_background_information(mcp_request.plan, mcp_request.task.step_number)
        
        user_prompt = MCP_REQUEST_PROMPT.format(
            plan_name=mcp_request.plan.plan_name,
            plan_overview=mcp_request.plan.plan_overview,
            background_information=background_information,
            task=mcp_request.task.task_name,
            reason=mcp_request.task.task_explanation,
            expectation=mcp_request.task.expected_result
        )
        
        tools = self.openai_client.chat.completions.create(
            model="deepseek-chat",
            messages=[{"role": "system", "content": system_prompt}, {"role": "user", "content": user_prompt}],
            tools=mcp_tools,
            tool_choice="required"
        )
        
        # Parse the tools response into ToolCallInfo objects
        tool_calls = parse_mcp_tools(tools, mcp_server, self.mcp_tools_dict)
        task_id = mcp_request.task.id
        
        # Convert tool_calls to a format suitable for the database
        try:
            # For Pydantic v2
            skills_data = [tool_call.model_dump() for tool_call in tool_calls]
        except AttributeError:
            # Fallback for Pydantic v1
            skills_data = [tool_call.dict() for tool_call in tool_calls]
        
        # Update the task with the skills information
        async with httpx.AsyncClient() as client:
            try:
                # First update the task with the skills information
                update_url = f"{client_url}/api/plan/update_task"
                
                # Ensure the data is properly serializable by using json.dumps/loads
                # This ensures we have valid JSON that PostgreSQL can accept
                json_string = json.dumps(skills_data)
                validated_json = json.loads(json_string)
                
                update_payload = {
                    "id": task_id,
                    "skills": validated_json,
                    "status": "pending"  # Optionally update status
                }
                
                update_response = await client.put(
                    update_url,
                    json=update_payload,
                    headers={"Content-Type": "application/json"}
                )
                update_response.raise_for_status()
                
                # Then continue with your existing code to fetch messages
                response = await client.post(
                    f"{client_url}/api/chat/get_messages", 
                    json={"roomId": mcp_request.plan.room_id, "limit": 100},
                    headers={"Content-Type": "application/json"}
                )
                response.raise_for_status()
                messages = response.json()
                
                await self.socket_client.send_notification(
                    {
                        "id": str(uuid4()),
                        "notification_id": str(uuid4()),
                        "room_id": mcp_request.plan.room_id,
                        "message": f"Task {task_id} has been created",
                        "sender": mcp_request.plan.assignee,
                        "created_at": datetime.datetime.now(datetime.timezone(datetime.timedelta(hours=8))).isoformat(),
                        "updating_plan": mcp_request.plan.id
                    }
                )
            except Exception as e:
                logger.error(f"Error updating task or fetching messages: {e}")
                if isinstance(e, httpx.HTTPStatusError):
                    logger.error(f"Response content: {e.response.content}")
                messages = []

    async def execute_mcp_request(self, mcp_request: MCPTaskRequest):
        task = mcp_request.task
        plan_size = len(mcp_request.plan.context.plan["plan"])
        step_number = task.step_number
        skills = task.skills
        session = self.servers[task.mcp_server]
        logger.info(f"Plan size: {plan_size}")
        client_url = os.environ.get("CLIENT_URL", "")
        
        results = {}
        tool_call_ct = defaultdict(int)
        for skill in skills:
            resp = None
            skill_name = skill['tool_name']
            try:
                args = skill['args']
                args = {k: arg["value"] for k, arg in args.items()}
                resp = await session.call_tool(skill_name, args)
            except Exception as e:
                logger.error(f"Error calling skill {skill_name}: {e}")
                continue
            results[f"{skill_name}_{tool_call_ct[skill_name]}"] = resp.content[0].text
            tool_call_ct[skill_name] += 1
        
        # update the task with logs and change status to success
        async with httpx.AsyncClient() as client:
            try:
                update_url = f"{client_url}/api/plan/update_task"
                response = await client.put(
                    update_url,
                    json={
                        "id": task.id,  # Use id instead of task_id
                        "status": "success",
                        "logs": results,
                        "step_number": step_number
                    }
                )
                response.raise_for_status()
                logger.info(f"Successfully updated task {task.id} with logs")
                
                # Create task_completed log using the create_plan_log API
                log_response = await client.post(
                    f"{client_url}/api/plan/create_plan_log",
                    json={
                        "type": "task_completed",
                        "plan_id": mcp_request.plan.id,
                        "task_id": task.id,  # Use id instead of task_id
                        "content": f"Task **{task.task_name}** has been completed"
                    },
                    headers={"Content-Type": "application/json"}
                )
                log_response.raise_for_status()
                logger.info(f"Successfully created task_completed log")
            except Exception as e:
                logger.error(f"Error updating task with logs or creating log: {e}")
                if isinstance(e, httpx.HTTPStatusError):
                    logger.error(f"Response content: {e.response.content}")
        
        async with httpx.AsyncClient() as client:
            try:
                update_url = f"{client_url}/api/plan/update_plan"
                plan_status = "running" if step_number < plan_size else "success"
                response = await client.put(
                    update_url,
                    json={
                        "id": mcp_request.plan.id,  # Changed from plan_id to id
                        "status": plan_status,
                        "progress": int((step_number / plan_size) * 100),
                        "logs": results,
                        "step_number": step_number
                    }
                )
                
                # If plan is completed, create plan_completed log
                if plan_status == "success":
                    log_response = await client.post(
                        f"{client_url}/api/plan/create_plan_log",
                        json={
                            "type": "plan_completed",
                            "plan_id": mcp_request.plan.id,  # Changed from plan_id to id
                            "content": f"Plan **{mcp_request.plan.plan_name}** has been completed"
                        },
                        headers={"Content-Type": "application/json"}
                    )
                    log_response.raise_for_status()
                    logger.info(f"Successfully created plan_completed log")
            except Exception as e:
                logger.error(f"Error updating plan status or creating log: {e}")
        
        await self.socket_client.send_notification(
            {
                "id": str(uuid4()),
                "notification_id": str(uuid4()),
                "room_id": mcp_request.plan.room_id,
                "message": f"Task {task.id} has been executed",
                "sender": mcp_request.plan.assignee,
                "created_at": datetime.datetime.now(datetime.timezone(datetime.timedelta(hours=8))).isoformat(),
                "updating_plan": mcp_request.plan.id
            }
        )
            
    def prepare_background_information(self, plan: PlanData, step_number: int):
        background = ""
        conversations = plan.context.conversations
        background += "Conversations:\n"

        for message in reversed(conversations):
            if "created_at" in message:
                background += f"[{message['created_at']}] {message['role']}: {message['content']}\n"
        
        for step in range(1, step_number):
            step_log = plan.logs[str(step)]
            step_log_str = ""
            for skill, result in step_log.items():
                step_log_str += f"Skill: {skill}\nResult: {result}\n"
            background += f"Step {step}: {step_log_str}\n"

        return background

    async def get_servers(self) -> Dict[str, MCPServer]:
        server_information = {}
        for server_name, server_session in self.servers.items():
            try:
                server_description = self.server_descriptions_dict[server_name]
                server_tools_response = await server_session.list_tools()
                server_tools = server_tools_response.tools
                
                mcp_tools = []
                for tool in server_tools:
                    try:
                        input_schema = tool.inputSchema
                        if hasattr(input_schema, "dict"):
                            input_schema = input_schema.dict()
                        elif hasattr(input_schema, "model_dump"):
                            input_schema = input_schema.model_dump()
                            
                        mcp_tool = MCPTool(
                            name=tool.name,
                            description=tool.description,
                            input_schema=input_schema
                        )
                        mcp_tools.append(mcp_tool)
                    except Exception as e:
                        logger.error(f"Error creating MCPTool: {e}")
                        continue
                
                server_information[server_name] = MCPServer(
                    server_name=server_name,
                    server_description=server_description,
                    server_tools=mcp_tools,
                )   
            except Exception as e:
                logger.error(f"Error processing server {server_name}: {e}")
                continue
                
        return server_information

    def load_server_description(self, server: str) -> str:
        with open(server, 'r') as file:
            return file.read()
    
    def format_server_descriptions(self) -> str:
        descriptions = []
        for idx, server in enumerate(self.server_names):
            description = self.server_descriptions_dict[server]
            # Replace "You provide the" with "The assistant has"
            description = description.replace("You provide the", "The assistant has")
            
            # Add tools information to the description
            if server in self.server_tools_dict:
                tools = self.server_tools_dict[server]
                tools_description = f"\n\nAvailable tools for Assistant {idx + 1} - {server}:\n"
                
                for tool in tools:
                    # Extract just the first line of the description
                    short_description = tool.description.split('\n')[0].strip()
                    tools_description += f"- {tool.name}: {short_description}\n"
                
                description += tools_description
            
            descriptions.append(f"assistant name: {server}\n=================\n{description}\n")
        
        return "\n" + "\n".join(descriptions)

    def format_conversation(self, messages, show_username = False):
        formatted_text = "CONVERSATION START\n\n"
        for message in messages:
            # Determine the role based on sender field if available, otherwise use the role field
            if 'sender' in message:
                role = "assistant" if message['sender'] == "agent" else "user"
                if show_username:
                    role += f" ({message['sender']})"
            else:
                role = message.get('role', 'user')
            
            content = message.get('content', '')
            # Get the timestamp from the message
            timestamp = message.get('created_at', '')
            timestamp_str = f" [{timestamp}]" if timestamp else ""
            
            # Clean up the content by removing '@agent' prefix
            if isinstance(content, str) and content.startswith('@agent'):
                content = content.replace('@agent', '', 1).strip()
            
            formatted_text += f"{role.capitalize()}{timestamp_str}: {content}\n"
        
        formatted_text += "\nCONVERSATION END"
        return formatted_text

    def extract_json_from_response(self, response):
        """
        Extract and parse JSON from the OpenAI API response.
        
        Args:
            response: The OpenAI API response object
            
        Returns:
            dict: The parsed JSON object or None if parsing fails
        """
        try:
            # Get the content from the first message in the response
            content = response.choices[0].message.content
            
            # Check if the content contains JSON code block
            import re
            import json
            
            # Look for JSON content within markdown code blocks
            json_match = re.search(r'```(?:json)?\s*([\s\S]*?)\s*```', content)
            if json_match:
                json_str = json_match.group(1)
                return json.loads(json_str)
            
            # If no code block, try to parse the entire content as JSON
            try:
                return json.loads(content)
            except json.JSONDecodeError:
                # If that fails, return None
                return None
                
        except Exception as e:
            logger.error(f"Error extracting JSON from response: {e}")
            return None

    async def check_and_update_plan_status(self, plan_id: str) -> None:
        """
        Check if all tasks for a plan are completed and update the plan status accordingly.
        
        Args:
            plan_id: The ID of the plan to check
        """
        client_url = os.environ.get("CLIENT_URL", "")
        try:
            async with httpx.AsyncClient() as client:
                # Get all tasks for this plan
                response = await client.get(
                    f"{client_url}/api/plan/get_tasks?plan_id={plan_id}",
                    headers={"Content-Type": "application/json"}
                )
                response.raise_for_status()
                tasks_data = response.json()
                
                # Check if all tasks are completed
                tasks = tasks_data.get("tasks", [])
                if not tasks:
                    return
                    
                all_completed = all(task.get("status") in ["success", "failed"] for task in tasks)
                all_successful = all(task.get("status") == "success" for task in tasks)
                
                if all_completed:
                    # Calculate progress as percentage of successful tasks
                    successful_tasks = sum(1 for task in tasks if task.get("status") == "success")
                    progress = int((successful_tasks / len(tasks)) * 100)
                    
                    # Update plan status
                    status = "success" if all_successful else "failed"
                    await client.put(
                        f"{client_url}/api/plan/update_plan",
                        json={
                            "id": plan_id,
                            "status": status,
                            "progress": progress,
                            "completed_at": datetime.datetime.now(datetime.timezone(datetime.timedelta(hours=8))).isoformat()
                        },
                        headers={"Content-Type": "application/json"}
                    )
                    
                    # Create plan status log using the create_plan_log API
                    log_type = "plan_completed" if status == "success" else "plan_failed"
                    log_content = f"Plan has been {status}"
                    await client.post(
                        f"{client_url}/api/plan/create_plan_log",
                        json={
                            "type": log_type,
                            "plan_id": plan_id,
                            "content": log_content
                        },
                        headers={"Content-Type": "application/json"}
                    )
                    
                    logger.info(f"Updated plan {plan_id} status to {status} with progress {progress}%")
        except Exception as e:
            logger.error(f"Error checking and updating plan status: {e}")

    async def cleanup(self):
        for server in self.servers:
            await self.exit_stack[server].aclose()

    async def process_admin_message(self, admin_message):
        """Process a single administrative message directly"""
        logger.info("Processing admin message")
        room_id = admin_message.room_id
        owner_message = admin_message.owner_message
        owner_id = admin_message.owner_id
        mcp_tools = self.mcp_tools_dict["onlysaid_admin"]
        trust = admin_message.trust
        logger.info(f"MCP tools: {mcp_tools}")
        client_url = os.environ.get("CLIENT_URL", "")
        try:
            try:
                async with httpx.AsyncClient() as client:
                    response = await client.post(
                        f"{client_url}/api/chat/get_messages", 
                        json={"roomId": room_id, "limit": 100},
                        headers={"Content-Type": "application/json"}
                    )
                    response.raise_for_status()
                    messages = response.json()
                    logger.info(f"Messages: {messages}")
            except Exception as e:
                logger.error(f"Error fetching messages: {e}")
                messages = []
            
            try:
                room_users = await self.get_room_users(room_id)
            except Exception as e:
                logger.error(f"Error getting room users: {e}")
                room_users = []
            
            formatted_conversation = self.format_conversation(messages, show_username=True)
            formatted_users = self.format_room_users_readable(room_users)
            

            tool_calls = self.openai_client.chat.completions.create(
                model="deepseek-chat",
                messages=[
                    {
                        "role": "system",
                        "content": ONLYSAID_ADMIN_PROMPT
                    },
                    {
                        "role": "user",
                        "content": ONLYSAID_ADMIN_PROMPT_TEMPLATE.format(
                            conversation_history=formatted_conversation,
                            chatroom_id=room_id,
                            chatroom_participants=formatted_users,
                            owner_message=owner_message,
                        )
                    }
                ],
                tools=mcp_tools,
                tool_choice="required"
            )
            tool_calls = parse_mcp_tools(tool_calls, "onlysaid_admin", self.mcp_tools_dict)
            logger.info(f"Tool calls: {tool_calls}")
            
            try:
                # For Pydantic v2
                actions = [tool_call.model_dump() for tool_call in tool_calls]
            except AttributeError:
                # Fallback for Pydantic v1
                actions = [tool_call.dict() for tool_call in tool_calls]
                
            # Check if actions list is empty before proceeding
            if not actions:
                logger.warning("No actions returned from parse_mcp_tools")
                return
        
            logger.info(f"Actions: {actions}")
                
            if actions[0]["name"] == "idle":
                return
        
            logger.info(f"Actions structure: {actions}")
            
            # Create a mapping of actions to their plan_ids
            action_plan_map = {}
            for i, action in enumerate(actions):
                logger.info(f"Processing action {i}: {action}")
                logger.info(f"Action args: {action['args']}")
                
                # Extract plan_id for this specific action
                try:
                    if isinstance(action["args"], dict):
                        logger.info(f"Args is a dictionary with keys: {action['args'].keys()}")
                        # If args is a dictionary with direct values
                        if "plan_id" in action["args"]:
                            logger.info(f"plan_id in args: {action['args']['plan_id']}")
                            if isinstance(action["args"]["plan_id"], dict) and "value" in action["args"]["plan_id"]:
                                action_plan_id = action["args"]["plan_id"]["value"]
                                logger.info(f"Extracted plan_id from value: {action_plan_id}")
                            else:
                                action_plan_id = action["args"]["plan_id"]
                                logger.info(f"Using plan_id directly: {action_plan_id}")
                        else:
                            # Generate a new plan_id if none exists
                            action_plan_id = str(uuid4())
                            logger.info(f"Generated new plan_id (no plan_id in args): {action_plan_id}")
                    else:
                        # Generate a new plan_id if args is not a dictionary
                        action_plan_id = str(uuid4())
                        logger.info(f"Generated new plan_id (args not a dict): {action_plan_id}")
                except Exception as e:
                    logger.error(f"Error extracting plan_id for action {i}: {e}")
                    action_plan_id = str(uuid4())
                    logger.info(f"Generated fallback plan_id after error: {action_plan_id}")
                
                action_plan_map[i] = action_plan_id
                logger.info(f"Action {i} mapped to plan_id: {action_plan_id}")
            
            # Group actions by plan_id
            plan_actions = {}
            for i, action in enumerate(actions):
                plan_id = action_plan_map[i]
                if plan_id not in plan_actions:
                    plan_actions[plan_id] = []
                plan_actions[plan_id].append(action)
            
            # Process each plan separately
            for plan_id, plan_specific_actions in plan_actions.items():
                logger.info(f"Processing plan {plan_id} with {len(plan_specific_actions)} actions")
                
                # Use the self.create_tasks method to create tasks from actions
                try:
                    logger.info(f"Calling create_tasks with actions for plan {plan_id}")
                    tasks = await self.create_tasks(plan_specific_actions, plan_id)
                    logger.info(f"Created tasks for plan {plan_id}: {tasks}")
                except Exception as e:
                    logger.error(f"Error creating tasks for plan {plan_id}: {e}")
                    tasks = []
            
            # TODO: if trust, call the tool directly & do follow ups.
            # if not TRUST, ask user for confirmation
            if not trust:
                async with httpx.AsyncClient() as client:
                    # Create the tasks directly from the actions
                    if tasks:
                        logger.info(f"Creating tasks via API: {tasks}")
                        task_response = await client.post(
                            f"{client_url}/api/plan/create_tasks",
                            json={
                                "plan_id": plan_id,
                                "tasks": tasks
                            },
                            headers={"Content-Type": "application/json"}
                        )
                        task_response.raise_for_status()
                        tasks_data = task_response.json()
                        logger.info(f"Tasks created successfully: {tasks_data}")
                    
                    # Create a notification log for each task
                    for i, task in enumerate(tasks):
                        task_id = tasks_data["tasks"][i]["id"] if "tasks" in tasks_data and i < len(tasks_data["tasks"]) else None
                        log_response = await client.post(
                            f"{client_url}/api/plan/create_plan_log",
                            json={
                                "type": "approval_requested",
                                "plan_id": plan_id,
                                "task_id": task_id,
                                "content": f"Task created for action: {actions[i]['name'] if i < len(actions) else actions[0]['tool_name']}"
                            },
                            headers={"Content-Type": "application/json"}
                        )
                        log_response.raise_for_status()
                        logger.info(f"Successfully created task_created log for task {task_id}")
                
                    user_response = await client.get(
                        f"{client_url}/api/user/get_user_by_id?id={owner_id}",
                        headers={"Content-Type": "application/json"}
                    )
                    
                    user_response.raise_for_status()
                    logger.info(f"User response: {user_response.json()}")
                    return
            
            # If we get here, it means trust=True, so we should execute the actions directly
            # This section would implement the direct execution flow
            # TODO: Implement direct execution for trusted actions

        except Exception as e:
            logger.error(f"Error processing admin message: {e}")

    async def get_room_users(self, room_id, limit=50, offset=0, search='', role=''):
        """
        Get all users in a specific room
        
        Args:
            room_id (str): The ID of the room to get users from
            limit (int, optional): Maximum number of users to return. Defaults to 50.
            offset (int, optional): Pagination offset. Defaults to 0.
            search (str, optional): Search term for filtering users. Defaults to ''.
            role (str, optional): Filter users by role. Defaults to ''.
            
        Returns:
            dict: Response containing users and pagination info
        """
        client_url = os.environ.get("CLIENT_URL", "")
        url = f"{client_url}/api/user/get_users"
        payload = {
            "room_id": room_id,
            "limit": limit,
            "offset": offset,
            "search": search,
            "role": role
        }
        
        try:
            async with httpx.AsyncClient() as client:
                response = await client.post(url, json=payload)
                if response.status_code != 200:
                    error_text = response.json()
                    raise Exception(f"Failed to get room users: {error_text}")
                
                return response.json()
        except Exception as e:
            logger.error(f"Error getting room users: {e}")
            return []

    def format_room_users(self, room_users_response):
        """
        Format room users response into a simplified list of user_id and username pairs
        
        Args:
            room_users_response (dict): The response from get_room_users API
            
        Returns:
            str: A string representation of the list of users in format [{user_id, username}]
        """
        if not room_users_response or 'users' not in room_users_response:
            return "[]"
        
        users = room_users_response['users']
        formatted_users = []
        
        for user in users:
            formatted_users.append({
                'user_id': user['id'],
                'username': user['username']
            })
        
        return str(formatted_users)

    def format_room_users_readable(self, room_users_response):
        """
        Format room users response into a human-readable string
        
        Args:
            room_users_response (dict): The response from get_room_users API
            
        Returns:
            str: A human-readable string listing the users in the room
        """
        if not room_users_response or 'users' not in room_users_response:
            return "No users found in this room."
        
        users = room_users_response['users']
        if not users:
            return "No users found in this room."
        
        user_strings = []
        for user in users:
            user_strings.append(f"• {user['username']} (ID: {user['id']})")
        
        total = room_users_response.get('pagination', {}).get('total', len(users))
        
        result = f"Room participants ({total}):\n" + "\n".join(user_strings)
        return result

    def get_tool_description(self, tool_name, mcp_server):
        """
        Get the description for a tool from the mcp_tools_dict.
        
        Args:
            tool_name: The name of the tool
            mcp_server: The MCP server name
            
        Returns:
            str: The tool description, or a default if not found
        """
        # Default description
        tool_description = f"Tool call for {tool_name}"
        
        # Try to find a better description from the tools dictionary
        if mcp_server in self.mcp_tools_dict:
            for tool in self.mcp_tools_dict[mcp_server]:
                # Handle OpenAI function calling format
                if isinstance(tool, dict) and 'function' in tool:
                    if tool['function']['name'] == tool_name:
                        tool_description = tool['function']['description']
                        break
                # Handle direct tool objects
                elif hasattr(tool, 'function'):
                    if tool.function.name == tool_name:
                        tool_description = tool.function.description
                        break
                # Handle MCP tool format
                elif hasattr(tool, 'name') and tool.name == tool_name:
                    tool_description = tool.description
                    break
        
        return tool_description
