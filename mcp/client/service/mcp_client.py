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

from schemas.mcp import MCPPlanRequest, Task, MCPTaskRequest, PlanData
from schemas.mcp import MCPTool, MCPServer
from prompts.task_create import PLAN_SYSTEM_PROMPT, PLAN_CREATE_PROMPT
from prompts.mcp_reqeust import MCP_REQUEST_SYSTEM_PROMPT, MCP_REQUEST_PROMPT
from utils.mcp import parse_mcp_tools
from service.socket_client import SocketClient
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
        self.plan_queue = asyncio.Queue()  # New queue for task creation
        self.request_queue = asyncio.Queue()  # Queue for direct MCP requests
        self.task_queue = asyncio.Queue()  # Execution queue
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
        # Create the function object with name, description and parameters
        function_obj = {
            "name": tool.name,
            "description": tool.description,
            "parameters": tool.inputSchema
        }
        
        # Return the complete tool object in OpenAI format
        return {
            "type": "function",
            "function": function_obj
        }

    async def create_plan(
        self, 
        plan_request: MCPPlanRequest, 
    ) -> None:
        # logger.info(f"Server tools: {self.server_tools_dict}")
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
        
        logger.info(f"Summoner: {plan_request.summoner}")
        query = plan_request.query
        query = query.replace("@agent", "")
        query = [{"role": "user", "content": query}]

        conversations = [
            {
                "role": "assistant" if msg["sender"] == "agent" else "user",
                "content": msg["content"]
            }
            for msg in messages
        ] + query
        
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
                        assistants=self.server_names,
                        assistant_descriptions=self.format_server_descriptions()
                    )
                }
            ],
            temperature=0.7
        )
        
        msgs = [
                {
                    "role": "system", 
                    "content": PLAN_SYSTEM_PROMPT
                },
                {
                    "role": "user", 
                    "content": PLAN_CREATE_PROMPT.format(
                        conversations=self.format_conversation(conversations),
                        assistants=self.server_names,
                        assistant_descriptions=self.format_server_descriptions()
                    )
                }
            ]
        logger.info(f"prompt: {msgs}")
        logger.info(f"Response: {response}")
        
        # Extract and parse the JSON plan from the response
        plan_json = self.extract_json_from_response(response)
        if plan_json:
            logger.info(f"Extracted plan: {plan_json}")
            
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
                if "plan" not in plan_json or not plan_json["plan"] or plan_json.get("no_tools_needed", False):
                    no_tools_needed = True
                elif plan_json.get("plan_name", "").lower() == "null_plan":
                    no_tools_needed = True
                
                # Create the plan via API
                async with httpx.AsyncClient() as client:
                    plan_response = await client.post(
                        f"{client_url}/api/plan/create_plan",
                        json={
                            "plan_name": plan_name,
                            "plan_overview": plan_overview,
                            "room_id": plan_request.room_id,
                            "context": context,
                            "assigner": plan_request.assigner,
                            "assignee": plan_request.assignee,
                            "reviewer": getattr(plan_request, 'reviewer', None),
                            "no_tools_needed": no_tools_needed  # Add this flag to the request
                        },
                        headers={"Content-Type": "application/json"}
                    )
                    plan_response.raise_for_status()
                    plan_data = plan_response.json()
                    plan_id = plan_data["plan"]["id"]
                    logger.info(f"Created plan with ID: {plan_id}")
                    
                    # Then create tasks associated with this plan
                    tasks = self.create_tasks_from_plan(plan_json, plan_request, plan_id)
                    
                    if tasks:
                        # Create the tasks via API
                        tasks_response = await client.post(
                            f"{client_url}/api/plan/create_tasks",
                            json={
                                "plan_id": plan_id,
                                "tasks": tasks
                            },
                            headers={"Content-Type": "application/json"}
                        )
                        tasks_response.raise_for_status()
                        tasks_data = tasks_response.json()
                        logger.info(f"Created {len(tasks_data['tasks'])} tasks for plan {plan_id}")
                    else:
                        logger.warning(f"No tasks created for plan {plan_id}")
                        # Mark the plan as completed if no tasks were created
                        await client.put(
                            f"{client_url}/api/plan/update_plan",
                            json={
                                "plan_id": plan_id,
                                "status": "success",
                                "progress": 100,
                                "completed_at": datetime.datetime.now().isoformat()
                            },
                            headers={"Content-Type": "application/json"}
                        )
                        logger.info(f"Marked plan {plan_id} as completed since no tasks were created")
                        
            except Exception as e:
                logger.error(f"Error creating plan or tasks in database: {e}")
        else:
            logger.error("Failed to extract valid JSON plan from response")

    def create_tasks_from_plan(self, plan_json, plan_request: MCPPlanRequest, plan_id: str) -> List[dict]:
        """
        Create task dictionaries from the extracted plan JSON.
        
        Args:
            plan_json: The parsed JSON plan
            plan_request: The original plan request
            plan_id: The ID of the parent plan
            
        Returns:
            List[dict]: A list of task dictionaries representing the plan steps
        """
        tasks = []
        
        # Check if there's a plan with steps
        if "plan" in plan_json and isinstance(plan_json["plan"], dict):
            # If the plan is empty, return an empty list (no tasks needed)
            if not plan_json["plan"]:
                logger.info(f"Empty plan detected, no tasks will be created")
                return []
            
            # Sort steps to ensure they're processed in order (step_1, step_2, etc.)
            steps = sorted(plan_json["plan"].keys())
            
            for i, step_key in enumerate(steps):
                step = plan_json["plan"][step_key]
                
                # Skip steps without an assignee or with "None" as assignee
                step_assignee_name = step.get("assignee")
                if not step_assignee_name or step_assignee_name.lower() == "none" or "none" in step_assignee_name.lower():
                    continue
                
                # Extract task details from the step
                task_name = step.get("name", f"Step {i+1}")
                task_explanation = step.get("explanation", "")
                expected_result = step.get("expected_result", "")
                
                # Create the task matching the expected format in create_tasks API
                task = {
                    "step_number": i + 1,  # 1-based step number
                    "task_name": task_name,
                    "task_explanation": task_explanation,
                    "expected_result": expected_result,
                    "mcp_server": step_assignee_name,
                    "tool": {},  # Initialize with empty JSON object instead of assignee info
                    "status": "not_started"  # Initialize task status to not_started
                }
                
                tasks.append(task)
        
        # If no valid tasks were created from steps, create a default task
        if not tasks and plan_json.get("no_tools_needed", False):
            # No tasks needed, return empty list to trigger auto-completion
            return []
        elif not tasks and plan_json.get("plan_name", "").lower() == "null_plan":
            # Special case for null plans - no tasks needed
            return []
        elif not tasks:
            # Create a default task
            task = {
                "step_number": 1,
                "task_name": "Execute request",
                "task_explanation": plan_json.get("plan_overview", "Process the user request"),
                "expected_result": "Complete the requested task",
                "tool": {},  # Initialize with empty JSON object
                "status": "not_started"  # Initialize task status to not_started
            }
            
            tasks.append(task)
        
        return tasks

    async def create_mcp_request(self, mcp_request: MCPTaskRequest):
        task = mcp_request.task
        mcp_server = task.mcp_server
        # mcp_tools = self.server_tools_dict[mcp_server]
        mcp_tools = self.mcp_tools_dict[mcp_server]
        client_url = os.environ.get("CLIENT_URL", "")
        
        system_prompt = MCP_REQUEST_SYSTEM_PROMPT.format(
            mcp_server_speciality=self.server_descriptions_dict[mcp_server]
        )
        logger.info(f"System prompt: {system_prompt}")
        background_information = self.prepare_background_information(mcp_request.plan, mcp_request.task.step_number)
        
        user_prompt = MCP_REQUEST_PROMPT.format(
            plan_name=mcp_request.plan.plan_name,
            plan_overview=mcp_request.plan.plan_overview,
            background_information=background_information,
            task=mcp_request.task.task_name,
            reason=mcp_request.task.task_explanation,
            expectation=mcp_request.task.expected_result
        )
        logger.info(f"User prompt: {user_prompt}")
        logger.info(f"Tools: {mcp_tools}")
        
        tools = self.openai_client.chat.completions.create(
            model="deepseek-chat",
            messages=[{"role": "system", "content": system_prompt}, {"role": "user", "content": user_prompt}],
            tools=mcp_tools,
            tool_choice="required"
        )
        
        logger.info(f"Tools: {tools}")
        
        # Parse the tools response into ToolCallInfo objects
        tool_calls = parse_mcp_tools(tools, mcp_server, self.mcp_tools_dict)
        task_id = mcp_request.task.task_id
        
        # Convert tool_calls to a format suitable for the database
        try:
            # For Pydantic v2
            tool_data = [tool_call.model_dump() for tool_call in tool_calls]
        except AttributeError:
            # Fallback for Pydantic v1
            tool_data = [tool_call.dict() for tool_call in tool_calls]
        
        # Update the task with the tool information
        async with httpx.AsyncClient() as client:
            try:
                # First update the task with the tool information
                update_url = f"{client_url}/api/plan/update_task"
                
                # Ensure the data is properly serializable by using json.dumps/loads
                # This ensures we have valid JSON that PostgreSQL can accept
                json_string = json.dumps(tool_data)
                validated_json = json.loads(json_string)
                
                update_payload = {
                    "task_id": task_id,
                    "tool": validated_json,
                    "status": "pending"  # Optionally update status
                }
                
                logger.debug(f"Updating task with payload: {json.dumps(update_payload)}")
                
                update_response = await client.put(
                    update_url,
                    json=update_payload,
                    headers={"Content-Type": "application/json"}
                )
                update_response.raise_for_status()
                logger.info(f"Task updated successfully: {update_response.status_code}")
                
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
                        "created_at": datetime.datetime.now().isoformat(),
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
        tools = task.tool
        session = self.servers[task.mcp_server]
        logger.info(f"Plan size: {plan_size}")
        client_url = os.environ.get("CLIENT_URL", "")
        
        results = {}
        tool_call_ct = defaultdict(int)
        for tool in tools:
            resp = None
            tool_name = tool['tool_name']
            try:
                args = tool['args']
                args = {k: arg["value"] for k, arg in args.items()}
                resp = await session.call_tool(tool_name, args)
            except Exception as e:
                logger.error(f"Error calling tool {tool_name}: {e}")
                continue
            results[f"{tool_name}_{tool_call_ct[tool_name]}"] = resp.content[0].text
            tool_call_ct[tool_name] += 1
        
        # update the task with logs and change status to success
        async with httpx.AsyncClient() as client:
            try:
                update_url = f"{client_url}/api/plan/update_task"
                response = await client.put(
                    update_url,
                    json={
                        "task_id": task.task_id,
                        "status": "success",
                        "logs": results,
                        "step_number": step_number
                    }
                )
                response.raise_for_status()
                logger.info(f"Successfully updated task {task.task_id} with logs")
            except Exception as e:
                logger.error(f"Error updating task with logs: {e}")
                if isinstance(e, httpx.HTTPStatusError):
                    logger.error(f"Response content: {e.response.content}")
        
        async with httpx.AsyncClient() as client:
            try:
                update_url = f"{client_url}/api/plan/update_plan"
                response = await client.put(
                    update_url,
                    json={
                        "plan_id": mcp_request.plan.plan_id,
                        "status": "running" if step_number < plan_size else "success",
                        "progress": int((step_number / plan_size) * 100),
                        "logs": results,
                        "step_number": step_number
                    }
                )
            except Exception as e:
                logger.error(f"Error updating plan status: {e}")
        
        await self.socket_client.send_notification(
            {
                "id": str(uuid4()),
                "notification_id": str(uuid4()),
                "room_id": mcp_request.plan.room_id,
                "message": f"Task {task.task_id} has been executed",
                "sender": mcp_request.plan.assignee,
                "created_at": datetime.datetime.now().isoformat(),
                "updating_plan": mcp_request.plan.id
            }
        )
            
    def prepare_background_information(self, plan: PlanData, step_number: int):
        background = ""
        logger.info(f"Plan: {plan}")
        for step in range(1, step_number):
            step_log = plan.logs[str(step)]
            step_log_str = ""
            for tool, result in step_log.items():
                step_log_str += f"Tool: {tool}\nResult: {result}\n"
            background += f"Step {step}: {step_log_str}\n"

        logger.info(f"Background information: {background}")
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

    # New method to process the creation queue
    async def process_creation_tasks(self):
        while True:
            plan_request = await self.plan_queue.get()
            try:
                await self.create_plan(plan_request)
            except Exception as e:
                logger.error(f"Error creating task: {e}")
            finally:
                self.plan_queue.task_done()

    async def process_mcp_requests(self):
        """Process direct MCP requests from the request queue"""
        while True:
            mcp_request = await self.request_queue.get()
            try:
                await self.create_mcp_request(mcp_request)
            except Exception as e:
                logger.error(f"Error processing MCP request: {e}")
            finally:
                self.request_queue.task_done()

    async def process_tasks(self):
        while True:
            task = await self.task_queue.get()
            logger.info(f"Processing task: {task}")
            try:
                await self.execute_mcp_request(task)
            except Exception as e:
                logger.error(f"Error creating task: {e}")
            finally:
                self.task_queue.task_done()

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

    def format_conversation(self, messages):
        formatted_text = "CONVERSATION START\n\n"
        for message in messages:
            role = message['role']
            content = message['content']
            # Clean up the content by removing '@agent' prefix
            if content.startswith('@agent'):
                content = content.replace('@agent', '', 1).strip()
            
            formatted_text += f"{role.capitalize()}: {content}\n"
        
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
                            "plan_id": plan_id,
                            "status": status,
                            "progress": progress,
                            "completed_at": datetime.datetime.now().isoformat()
                        },
                        headers={"Content-Type": "application/json"}
                    )
                    logger.info(f"Updated plan {plan_id} status to {status} with progress {progress}%")
        except Exception as e:
            logger.error(f"Error checking and updating plan status: {e}")


    async def cleanup(self):
        for server in self.servers:
            await self.exit_stack[server].aclose()