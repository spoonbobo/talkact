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
    
    # Call create_plan directly instead of using a queue
    await mcp_client.create_plan(plan_request)
    return PlainTextResponse(content="Plan creation request processed", status_code=200)

@router.post("/api/ask_admin")
async def ask_admin(request: Request, owner_message: OwnerMessage):
    client_url = os.environ.get("CLIENT_URL")
    mcp_client = request.app.state.mcp_client
    
    # Process admin message directly instead of using a queue
    await mcp_client.process_admin_message(owner_message)
    return PlainTextResponse(content="MCP request processed", status_code=200)

@router.get("/api/get_servers")
async def get_servers(request: Request):
    return await request.app.state.mcp_client.get_servers()

