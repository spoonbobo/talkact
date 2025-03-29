import dotenv
from contextlib import AsyncExitStack
from typing import Dict
from datetime import datetime
import asyncio
import httpx
import uuid
import os

dotenv.load_dotenv()
from loguru import logger
from ollama import Client
from mcp import ClientSession, StdioServerParameters
from mcp.types import Tool as mcp_tool
from mcp.client.stdio import stdio_client

from schemas.mcp import MCPSummon, Task
from schemas.mcp import MCPTool, MCPServer
from service.bypasser import Bypasser

class MCPClient:
    """
    A MCP client manager that contains connections to mcp servers
    """
    def __init__(self, servers: dict, bypasser: Bypasser):
        self.servers = servers
        self.bypasser = bypasser
        self.exit_stack = {server: AsyncExitStack() for server in self.servers}
        self.ollama_client = Client(host=os.getenv("OLLAMA_API_BASE_URL"))
        self.ollama_model = os.getenv("OLLAMA_MODEL", "")
        self.queue = asyncio.Queue()


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
            logger.info(f"Connected to server {server} with tools: {tools}")

    def convert_mcp_tool_desc_to_ollama_tool(self, tool: mcp_tool) -> dict:
        ollama_tool = {
            "type": "function",
            "function": {
                "name": tool.name,
                "description": tool.description,
                "parameters": {
                    "type": "object",
                    "properties": tool.inputSchema["properties"],
                    "required": tool.inputSchema.get("required", [])
                }
            }
        }
        return ollama_tool  

    async def receive_summon(
        self, 
        summon: MCPSummon, 
    ) -> None:
        await self.queue.put(summon)

    async def respond(
        self, 
        summon: MCPSummon, 
    ) -> None:
        client_url = f"http://{summon.client_host}:3000"
        
        logger.info(f"mcp client url: {summon}")
        async with httpx.AsyncClient() as client:
            response = await client.post(
                f"{client_url}/api/chat/get_messages", 
                json={"roomId": summon.room_id, "limit": 100}
            )
            messages = response.json()
        
        logger.info(f"Summoner: {summon.summoner}")
        query = summon.query
        query = query.replace("@agent", "")
        query = [{"role": "user", "content": query}]

        conversations = [
            {
                "role": "assistant" if msg["sender"] == "agent" else "user",
                "content": msg["content"]
            }
            for msg in messages
        ]
        
        byp_mcp_server = await self.bypasser.bypass(conversations, query[0]["content"])
        server = self.servers[byp_mcp_server]
        server_description = self.bypasser.server_descriptions_dict[byp_mcp_server]

        tools = await server.list_tools()
        tools = tools.tools
        ollama_tools = [self.convert_mcp_tool_desc_to_ollama_tool(tool) for tool in tools]
        
        # Create a mapping of tool names to descriptions
        tool_descriptions = {tool["function"]["name"]: tool["function"]["description"] for tool in ollama_tools}

        llm_response = self.ollama_client.chat(
            model=self.ollama_model,
            messages=[{"role": "system", "content": server_description}] + conversations + query,
            tools=ollama_tools,
        )
        
        tool_calls = llm_response.message.tool_calls
        if tool_calls is None:
            tool_calls = []

        tools_called = [
            {
                "tool_name": tool_call.function.name,
                "args": tool_call.function.arguments,
                "mcp_server": byp_mcp_server,
                "description": tool_descriptions.get(tool_call.function.name, ""),  # Get description from mapping
            }
            for tool_call in tool_calls
        ]
        
        summarize_query = {
            "role": "user",
            "content": f"""
Briefly describe how you will use {[tool["tool_name"] for tool in tools_called]} to address the user's request: "{query[0]['content']}".
            
Available tools: {[tool.name for tool in tools]}
Server purpose: {server_description}"""
        }
        
        summarization = self.ollama_client.chat(
            model=self.ollama_model,
            messages=conversations + [summarize_query],
        )

        task_id = str(uuid.uuid4())
        task = {
            "task_id": task_id,
            "created_at": datetime.now().isoformat(),
            "start_time": None,
            "end_time": None,
            "assigner": summon.assigner,
            "assignee": summon.assignee,
            "task_summarization": summarization.message.content,
            "room_id": summon.room_id,
            "context": tools_called,
            "tools_called": tools_called,
            "status": "pending",
            "result": ""
        }
        logger.info(f"Task: {task}")
        # create notification as well.
        async with httpx.AsyncClient() as client:
            response = await client.post(
                f"{client_url}/api/task/create_task", 
                json=task
            )
            
            logger.info(f"Task created: {response}")

    async def execute(
        self,
        task: Task,
    ):
        pass
    # async def call_tool(
    #     self, 
    #     approval: MCPApproval
    # ) -> MCPResponse:
    #     results = []
    #     for tool_call in approval.tools_called:
    #         session = self.servers[tool_call.mcp_server]
    #         tool_response = await session.call_tool(tool_call.tool_name, tool_call.args)
    #         logger.info(f"Tool response: {tool_response}")
    #         results.append(tool_response.content[0].text)
        
    #     logger.info(f"Reuslts: {results}")

    #     query = {
    #         "role": "user",
    #         "content": f"""
    #         Given the results {results},
            
    #         Provide an analysis of the result, and answer the user's query
    #         {approval.conversation[-1]["content"]}
            
    #         Context for your reference:
    #         {approval.conversation[:-1]}
    #         """
    #     }
        
    #     summarization = self.ollama_client.chat(
    #         model=self.ollama_model,
    #         messages=[query],
    #     )

    #     return MCPResponse(
    #         sender="agent",
    #         text=summarization.message.content, # type: ignore
    #         is_tool_call=False,
    #     )

    async def get_servers(self) -> Dict[str, MCPServer]:
        server_information = {}
        for server_name, server_session in self.servers.items():
            try:
                server_description = self.bypasser.server_descriptions_dict[server_name]
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

    async def cleanup(self):
        for server in self.servers:
            await self.exit_stack[server].aclose()