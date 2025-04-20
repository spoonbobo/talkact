from contextlib import AsyncExitStack
from typing import List, Dict
import httpx
import os
import datetime
import json
from loguru import logger
import dotenv

dotenv.load_dotenv()
from loguru import logger
from uuid import uuid4
from ollama import Client
from openai import OpenAI
from mcp import ClientSession, StdioServerParameters
from mcp.types import Tool as mcp_tool
from mcp.client.stdio import stdio_client

from schemas.mcp import (
    MCPPlanRequest
)
from utils.mcp import (
    parse_mcp_tools, 
    tools_from_mcp, 
    format_server_descriptions, 
    load_server_description,
    get_tool_description,
    format_room_users,
    format_conversation,
    get_room_users,
    extract_json_from_response,
    prepare_background_information,
    prepare_background_information_from_dict
)
from prompts.plan_create import PLAN_SYSTEM_PROMPT, PLAN_CREATE_PROMPT
from prompts.mcp_reqeust import MCP_REQUEST_SYSTEM_PROMPT, MCP_REQUEST_PROMPT
from prompts.onlysaid_admin_prompt import ONLYSAID_ADMIN_PROMPT, ONLYSAID_ADMIN_PROMPT_TEMPLATE
from service.socket_client import SocketClient
from messages.plan_create import format_plan_created_message
from messages.seek_approval import seek_approval_message, seek_task_approval_message
from schemas.mcp import Skill, MCPServer, MCPTool

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
            self.server_descriptions_dict[server] = load_server_description(self.servers[server]["description"])
        self.server_descriptions = format_server_descriptions(
            self.server_names,
            self.server_descriptions_dict, 
            self.server_tools_dict
        )
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
            # logger.info(f"Server tools: {tools}")
            self.mcp_tools_dict[server] = [tools_from_mcp(tool) for tool in tools]


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
                        conversations=format_conversation(conversations),
                        additional_context=additional_context,
                        assistants=self.server_names,
                        assistant_descriptions=self.server_descriptions
                    )
                }
            ],
            temperature=0.7
        )
        
        # Extract and parse the JSON plan from the response
        plan_json = extract_json_from_response(response)
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
                    # Add better error handling and logging for debugging
                    try:
                        plan_payload = {
                            "id": plan_id,
                            "plan_name": plan_name,
                            "plan_overview": plan_overview,
                            "room_id": plan_request.room_id,
                            "context": context,
                            "assigner": plan_request.assigner,
                            "assignee": plan_request.assignee,
                            "reviewer": getattr(plan_request, 'reviewer', None),
                            "no_skills_needed": no_tools_needed
                        }
                        logger.info(f"Sending plan creation request with payload: {json.dumps(plan_payload, default=str)[:500]}...")
                        
                        plan_response = await client.post(
                            f"{client_url}/api/plan/create_plan",
                            json=plan_payload,
                            headers={"Content-Type": "application/json"}
                        )
                        plan_response.raise_for_status()
                        plan_data = plan_response.json()
                        logger.info(f"Plan created successfully with ID: {plan_data['plan']['id']}")
                    except Exception as e:
                        logger.error(f"Error creating plan: {e}")
                        if isinstance(e, httpx.HTTPStatusError):
                            logger.error(f"Response status: {e.response.status_code}")
                            logger.error(f"Response content: {e.response.text}")
                        raise
                    
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
                            tool_description = get_tool_description(
                                tool_name, 
                                mcp_server,
                                self.mcp_tools_dict
                            )
                            
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
            
            async with httpx.AsyncClient() as client:
                user_response = await client.get(
                    f"{client_url}/api/user/get_user_by_username?username=agent",
                    headers={"Content-Type": "application/json"}
                )
                user_response.raise_for_status()
                agent = user_response.json()

            try:
                room_users = await get_room_users(room_id)
                logger.info(f"Room users: {room_users}")
            except Exception as e:
                logger.error(f"Error getting room users: {e}")
                room_users = []
            
            formatted_conversation = format_conversation(messages, show_username=True)
            formatted_users = format_room_users(room_users)
            

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
            
            logger.info(f"Actions: {actions}")
            logger.info(f"Action plan map: {action_plan_map}")
            
            # Group actions by plan_id
            plan_actions = {}
            for i, action in enumerate(actions):
                plan_id = action_plan_map[i]
                if plan_id not in plan_actions:
                    plan_actions[plan_id] = []
                plan_actions[plan_id].append(action)

            # Process each plan's actions
            for plan_id, plan_specific_actions in plan_actions.items():
                logger.info(f"Processing plan {plan_id} with {len(plan_specific_actions)} actions")
                
                if not trust:
                    async with httpx.AsyncClient() as client:
                        # For each action in this plan, create a log and send approval message
                        for action_dict in plan_specific_actions:
                            # Convert action dictionary to Skill object
                            try:
                                # Create a Skill object from the action dictionary
                                action = Skill(
                                    name=action_dict.get('name', 'Unknown'),
                                    created_at=action_dict.get('created_at', datetime.datetime.now().isoformat()),
                                    updated_at=action_dict.get('updated_at', datetime.datetime.now().isoformat()),
                                    mcp_server=action_dict.get('mcp_server', 'unknown'),
                                    description=action_dict.get('description', ''),
                                    type=action_dict.get('type', 'function'),
                                    args=action_dict.get('args', {})
                                )
                                
                                # Create a notification log for the action
                                skill_response = await client.post(
                                    f"{client_url}/api/skill/create_skill",
                                    json=action.model_dump(),
                                    headers={"Content-Type": "application/json"}
                                )
                                skill_response.raise_for_status()
                                skill_id = skill_response.json()["skill"]["id"]
                                log_id = str(uuid4())

                                log_response = await client.post(
                                    f"{client_url}/api/plan/create_plan_log",
                                    json={
                                        "id": log_id,
                                        "type": "approval_requested",
                                        "skill_id": skill_id,
                                        "plan_id": plan_id,
                                        "content": f"Approval requested for action: {action.name}"
                                    },
                                    headers={"Content-Type": "application/json"}
                                )
                                log_response.raise_for_status()
                                logger.info(f"Successfully created approval_requested log for action {action.name}")
                                
                                # Send approval message to the chat
                                await self.socket_client.send_message(
                                    {
                                        "id": str(uuid4()),
                                        "created_at": datetime.datetime.now(datetime.timezone(datetime.timedelta(hours=8))).isoformat(),
                                        "sender": agent["user"],
                                        "content": seek_approval_message(action, log_id),
                                        "avatar": agent["user"].get("avatar", None),
                                        "room_id": room_id,
                                        "mentions": []
                                    }
                                )
                                logger.info(f"Sent approval message for action {action.name}")
                            except Exception as e:
                                logger.error(f"Error processing action for approval: {e}")
                                logger.error(f"Action data: {action_dict}")

        except Exception as e:
            logger.error(f"Error processing admin message: {e}")

    async def perform_skill(self, log_id):
        client_url = os.environ.get("CLIENT_URL", "")
        try:
            # First, get the log to find the associated skill
            async with httpx.AsyncClient() as client:
                log_response = await client.get(
                    f"{client_url}/api/plan/get_plan_log?logId={log_id}",
                    headers={"Content-Type": "application/json"}
                )
                log_response.raise_for_status()
                log_data = log_response.json()
                logger.info(f"Log data: {log_data}")
                skill_id = log_data.get("skill_id")
                task_id = log_data.get("task_id")
                # logger.info(f"Task: {task}")
                # TODO: assume 1 skill per task, need to fix.
                task = None
                if task_id is not None:
                    task = await client.get(
                        f"{client_url}/api/plan/get_task?taskId={task_id}",
                        headers={"Content-Type": "application/json"}
                    )
                    task.raise_for_status()
                    task = task.json()
                    # set it to running status
                    await client.put(
                        f"{client_url}/api/plan/update_task",
                        json={"id": task_id, "status": "running"},
                        headers={"Content-Type": "application/json"}
                    )
    

                if not skill_id and task is not None:
                    skill_id = task.get("skills")[0]
                
                # Get the skill details
                skill_response = await client.get(
                    f"{client_url}/api/skill/get_skill?id={skill_id}",
                    headers={"Content-Type": "application/json"}
                )
                skill_response.raise_for_status()
                skill_data = skill_response.json().get("skill", {})
                logger.info(f"Skill data: {skill_data}")
                plan_id = log_data.get("plan_id")
                raw_args = skill_data.get("args", {})
                logger.info(f"Skill data: {skill_data}")
                
        #         # Execute the skill using the appropriate MCP server
                mcp_server = skill_data.get("mcp_server", "onlysaid_admin")
                tool_name = skill_data.get("name")
                args = skill_data.get("args", {})
                logger.info(f"Executing skill {tool_name} on server {mcp_server} with args: {args}")
                
                await client.post(
                    f"{client_url}/api/plan/create_plan_log",
                    json={
                        "id": str(uuid4()),
                        "type": "performing_skill",
                        "content": f"Skill {tool_name} started execution",
                        "plan_id": plan_id,
                    },
                    headers={"Content-Type": "application/json"}
                )
                
                # Transform args to the format expected by the tool execution
                # From: {'plan_id': {'type': 'string', 'title': 'Plan Id', 'value': '8663356e-6e03-4f35-b26d-c9eb1cc082e8', 'description': ''}}
                # To: {'plan_id': '8663356e-6e03-4f35-b26d-c9eb1cc082e8'}
                args = {}
                if isinstance(raw_args, dict):
                    for key, arg in raw_args.items():
                        if isinstance(arg, dict) and 'value' in arg:
                            args[key] = arg['value']
                        else:
                            args[key] = arg

                result = await self.servers[mcp_server].call_tool(tool_name, args)
                logger.info(f"Skill result: {result}")
                resp = await client.post(
                    f"{client_url}/api/plan/create_plan_log",
                    json={
                        "id": str(uuid4()),
                        "type": "skill_executed",
                        # TODO: refine it.
                        "content": f"Skill {tool_name} was performed. Result: {result}",
                        "plan_id": plan_id,
                    },
                    headers={"Content-Type": "application/json"}
                )
                resp.raise_for_status()
                # logger.info(f"Skill result: {result}")
                task_id = log_data.get("task_id")
                if task is None:
                    return
                step_number = task.get("step_number")
                
                success = not result.isError
                logger.info(f"Success: {success}")
                
                # 1. update the progress of the task
                await client.put(
                    f"{client_url}/api/plan/update_task",
                    json={
                        "id": task_id, 
                        "status": "success" if success else "failed",
                    },
                    headers={"Content-Type": "application/json"}
                )
                # 2. update the progress of the plan
                # determine how many tasks are there.
                tasks = await client.get(
                    f"{client_url}/api/plan/get_tasks?planId={plan_id}",
                    headers={"Content-Type": "application/json"}
                )
                tasks.raise_for_status()
                tasks = tasks.json()
                logger.info(f"Tasks for plan {plan_id}: {tasks}")
                
                # Calculate progress based on completed tasks, not just current step
                completed_tasks = sum(1 for task in tasks if task.get("status") in ["success", "failed"])
                logger.info(f"Completed tasks: {completed_tasks} out of {len(tasks)}")
                
                progress = int((completed_tasks / len(tasks)) * 100)
                logger.info(f"Calculated progress: {progress}%")
                
                update_response = await client.put(
                    f"{client_url}/api/plan/update_plan",
                    json={
                        "plan_id": plan_id, 
                        "status": "running" if progress < 100 else "success",   
                        "progress": progress
                    },
                    headers={"Content-Type": "application/json"}
                )
                update_response.raise_for_status()
                logger.info(f"Plan progress update response: {update_response.status_code}")
                
                # Log the updated plan to verify changes
                updated_plan = await client.get(
                    f"{client_url}/api/plan/get_plan_by_id?id={plan_id}",
                    headers={"Content-Type": "application/json"}
                )
                updated_plan.raise_for_status()
                updated_plan_data = updated_plan.json()
                logger.info(f"Updated plan data: progress={updated_plan_data.get('progress')}, status={updated_plan_data.get('status')}")
                
                # 3. determine if the plan is completed, if not, prepare the skill and, proceed to next step with background ctx
                async with httpx.AsyncClient() as client:
                    user_response = await client.get(
                        f"{client_url}/api/user/get_user_by_username?username=agent",
                        headers={"Content-Type": "application/json"}
                    )
                    user_response.raise_for_status()
                    agent = user_response.json()
                    plan_response = await client.get(
                        f"{client_url}/api/plan/get_plan_by_id?id={plan_id}",
                        headers={"Content-Type": "application/json"}
                    )
                    plan_response.raise_for_status()
                    plan_data = plan_response.json()
                    logger.info(f"Plan data: {plan_data}")
                    room_id = plan_data.get("room_id")
                    logger.info(f"Room id: {room_id}")
        
                    if progress == 100:
                        # create a plan log
                        success_plan_log = await client.post(
                            f"{client_url}/api/plan/create_plan_log",
                            json={
                                "id": str(uuid4()),
                                "type": "plan_completed",
                                "content": f"✅ I've successfully completed the plan! Mission accomplished: {result}!",
                                "plan_id": plan_id,
                            },
                            headers={"Content-Type": "application/json"}
                        )
                        success_plan_log.raise_for_status()
                        
                        # summarize the plan
                        plan_logs_response = await client.get(
                            f"{client_url}/api/plan/get_plan_log?planId={plan_id}",
                            headers={"Content-Type": "application/json"}
                        )
                        plan_logs_response.raise_for_status()
                        plan_logs = plan_logs_response.json()
                        formatted_plan_logs = self._format_plan_logs(plan_logs)
                        logger.info(f"Formatted plan logs: {formatted_plan_logs}")
                        
                        # TODO: refine it with summarization agent
                        summarization = self.openai_client.chat.completions.create(
                            model="deepseek-chat",
                            messages=[
                                {"role": "system", "content": "You are a helpful assistant that summarizes logs."}, 
                                {"role": "user", "content": formatted_plan_logs}],
                        )
                        summarization = summarization.choices[0].message.content
                        logger.info(f"Summarization: {summarization}")
                        
                        # send msg to chat
                        await self.socket_client.send_message(
                            {
                                "id": str(uuid4()),
                                "created_at": datetime.datetime.now(datetime.timezone(datetime.timedelta(hours=8))).isoformat(),
                                "sender": agent["user"],
                                "content": f"✨ Plan completed successfully! All tasks have been finished. Summary: \n{summarization}",
                                "avatar": agent["user"].get("avatar", None),
                                "room_id": room_id,
                                "mentions": []
                            }
                        )
                        return
                    
                    next_step_number = step_number + 1
                    # TODO: may optimize them
                    response = await client.get(
                        f"{client_url}/api/plan/get_tasks?planId={plan_id}",
                        headers={"Content-Type": "application/json"}
                    )
                    response.raise_for_status()
                    tasks = response.json()
                    next_task = next((task for task in tasks if task["step_number"] == next_step_number), None)
                    if next_task is None:
                        return
                    system_prompt = MCP_REQUEST_SYSTEM_PROMPT.format(
                        mcp_server_speciality=self.server_descriptions_dict[mcp_server]
                    )
                    # TODO: Refine it later.
                    background_information = prepare_background_information_from_dict(plan_data, next_task.get("step_number"))
                    user_prompt = MCP_REQUEST_PROMPT.format(
                        plan_name=plan_data.get("plan_name"),
                        plan_overview=plan_data.get("plan_overview"),
                        background_information=background_information,
                        task=next_task.get("task_name"),
                        reason=next_task.get("task_explanation"),
                        expectation=next_task.get("expected_result")
                    )
                    skills = self.mcp_tools_dict[mcp_server]
                    tools = self.openai_client.chat.completions.create(
                        model="deepseek-chat",
                        messages=[{"role": "system", "content": system_prompt}, {"role": "user", "content": user_prompt}],
                        tools=skills,
                        tool_choice="required"
                    )
                    skills = parse_mcp_tools(tools, mcp_server, self.mcp_tools_dict)
                    logger.info(f"Skills: {skills}")
                    
                    # task_id = step_1.get('task_id')
                    skills_data = [skill.model_dump() for skill in skills]
                    
                    # 1. create_skills
                    skill_ids = []
                    for skill in skills_data:
                        skill_response = await client.post(
                            f"{client_url}/api/skill/create_skill",
                            json=skill,
                            headers={"Content-Type": "application/json"}
                        )
                        skill_response.raise_for_status()
                        skill_ids.append(skill_response.json()["skill"]["id"])
                    
                    logger.info(f"Skill IDs: {skill_ids}")

                    # 2. update the task to pending and include skills
                    task_update_data = {
                        "id": next_task.get('id'),  # Make sure we're using the correct task ID
                        "status": "pending",
                        "skills": skill_ids
                    }
                    plan_log_id = str(uuid4())
                    
                    response = await client.put(
                        f"{client_url}/api/plan/update_task",
                        json=task_update_data,
                        headers={"Content-Type": "application/json"}
                    )
                                
                    response.raise_for_status()
                    
                    
                    # 3. prepare a plan log
                    plan_log = {
                        "id": plan_log_id,
                        "plan_id": plan_id,
                        "task_id": next_task.get('id'),
                        "type": "approval_requested",
                        "content": f"Task {next_task.get('task_name')} is ready for approval",
                        "created_at": datetime.datetime.now().isoformat()
                    }
                    await client.post(
                        f"{client_url}/api/plan/create_plan_log",
                        json=plan_log,
                        headers={"Content-Type": "application/json"}
                    )
                    
                    # 4. notify the client (use mcp_client)
                    message = seek_task_approval_message(
                        next_task, 
                        skills_data,
                        skill_ids,
                        plan_log_id
                    )
                    await self.socket_client.send_message({
                        "id": str(uuid4()),
                        "created_at": datetime.datetime.now(datetime.timezone(datetime.timedelta(hours=8))).isoformat(),
                        "sender": agent["user"],
                        "content": message,
                        "avatar": agent["user"].get("avatar", None),
                        "room_id": room_id,
                        "mentions": []
                    })
                    
                    return json.dumps({"message": "First task sent to client for approval"})
                    
                            
        except Exception as e:
            logger.error(f"Error performing skill for log_id {log_id}: {e}")
            return {"status": "error", "message": str(e)}

    async def cleanup(self):
        for server in self.servers:
            await self.exit_stack[server].aclose()

    def _format_plan_logs(self, logs):
        """Format plan logs in a human-readable way."""
        if not logs:
            return "No logs available for this plan."
        
        # Sort logs by creation time
        sorted_logs = sorted(logs, key=lambda log: log.get('created_at', ''))
        
        # Group logs by type
        task_logs = []
        system_logs = []
        other_logs = []
        
        for log in sorted_logs:
            log_type = log.get('type', '')
            content = log.get('content', '')
            
            if log_type.startswith('task_'):
                task_logs.append(f"- {content}")
            elif log_type.startswith('system_'):
                system_logs.append(f"- {content}")
            else:
                other_logs.append(f"- {content}")
        
        # Build the formatted output
        formatted_output = []
        
        if task_logs:
            formatted_output.append("**Task Activities:**")
            formatted_output.extend(task_logs)
            formatted_output.append("")
        
        if system_logs:
            formatted_output.append("**System Events:**")
            formatted_output.extend(system_logs)
            formatted_output.append("")
        
        if other_logs:
            formatted_output.append("**Other Activities:**")
            formatted_output.extend(other_logs)
        
        return "\n".join(formatted_output)
