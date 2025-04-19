import httpx
import os
from loguru import logger

from fastapi import Request
from fastapi.routing import APIRouter
from starlette.responses import PlainTextResponse
from schemas.mcp import MCPPlanRequest, MCPTaskRequest, OwnerMessage

router = APIRouter()

@router.post("/api/create_plan")
async def mcp_create_plan(request: Request, plan_request: MCPPlanRequest):
    client_host = request.client.host if request.client else "unknown"
    plan_request.client_host = client_host
    mcp_client = request.app.state.mcp_client
    
    # Add to the creation queue instead of directly calling create_task
    await mcp_client.plan_queue.put(plan_request)
    return PlainTextResponse(content="Plan creation request enqueued", status_code=202)

@router.post("/api/ask_admin")
async def ask_admin(request: Request, owner_message: OwnerMessage):
    client_url = os.environ.get("CLIENT_URL")
    mcp_client = request.app.state.mcp_client
    await mcp_client.admin_queue.put(owner_message)
    return PlainTextResponse(content="MCP request enqueued", status_code=202)



@router.get("/api/get_servers")
async def get_servers(request: Request):
    return await request.app.state.mcp_client.get_servers()

