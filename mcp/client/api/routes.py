import httpx
import os
from loguru import logger

from fastapi import Request
from fastapi.routing import APIRouter
from starlette.responses import PlainTextResponse
from schemas.mcp import MCPPlanRequest, MCPTaskRequest, OwnerMessage, PerformSkillRequest, AgentMessage
from uuid import uuid4
import datetime
router = APIRouter()

@router.post("/api/create_plan")
async def mcp_create_plan(request: Request, plan_request: MCPPlanRequest):
    client_host = request.client.host if request.client else "unknown"
    plan_request.client_host = client_host
    mcp_client = request.app.state.mcp_client
    
    # Call create_plan directly instead of using a queue
    await mcp_client.create_plan(plan_request)
    return PlainTextResponse(content="Plan creation request processed", status_code=200)

@router.post("/api/ask_admin")
async def ask_admin(request: Request, owner_message: OwnerMessage):
    mcp_client = request.app.state.mcp_client
    
    # Process admin message directly instead of using a queue
    await mcp_client.process_admin_message(owner_message)
    return PlainTextResponse(content="MCP request processed", status_code=200)

@router.get("/api/get_servers")
async def get_servers(request: Request):
    return await request.app.state.mcp_client.get_servers()

@router.get("/api/get_tools")
async def get_tools(request: Request, server: str):
    return request.app.state.mcp_client.mcp_tools_dict

@router.post("/api/perform")
async def perform_skill(request: Request, perform_skill_request: PerformSkillRequest):
    mcp_client = request.app.state.mcp_client
    await mcp_client.perform_skill(perform_skill_request.log_id)
    return PlainTextResponse(content="Skill performed", status_code=200)

@router.post("/api/agent_message")
async def send_message(request: Request, agent_message: AgentMessage):
    client_url = os.getenv("CLIENT_URL")
    socket_client = request.app.state.mcp_client.socket_client
    id = str(uuid4())
    async with httpx.AsyncClient() as client:
        user_response = await client.get(
            f"{client_url}/api/user/get_user_by_username?username=agent",
            headers={"Content-Type": "application/json"}
        )
        user_response.raise_for_status()
        agent = user_response.json()["user"]
        message = {
            "id": id,
            "created_at": datetime.datetime.now(datetime.timezone(datetime.timedelta(hours=8))).isoformat(),
            "sender": agent,
            "content": agent_message.content,
            "avatar": agent.get("avatar", None),
            "room_id": agent_message.room_id,
            "mentions": []
        }
        
    
        await socket_client.send_message(message)
        
    return PlainTextResponse(content="Message sent", status_code=200)

"""

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
                    """