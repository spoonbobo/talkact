import httpx
import os
from loguru import logger

from fastapi import Request
from fastapi.routing import APIRouter
from starlette.responses import PlainTextResponse
from schemas.mcp import MCPPlanRequest, Task, MCPTaskRequest

router = APIRouter()

@router.post("/api/create_plan")
async def mcp_create_plan(request: Request, plan_request: MCPPlanRequest):
    client_host = request.client.host if request.client else "unknown"
    plan_request.client_host = client_host
    mcp_client = request.app.state.mcp_client
    
    # Add to the creation queue instead of directly calling create_task
    await mcp_client.plan_queue.put(plan_request)
    return PlainTextResponse(content="Plan creation request enqueued", status_code=202)

@router.post("/api/request_mcp")
async def request_mcp(request: Request, mcp_request: MCPTaskRequest):
    logger.info(f"Requesting MCP: {mcp_request.task}")
    client_url = os.environ.get("CLIENT_URL")
    mcp_client = request.app.state.mcp_client
    await mcp_client.request_queue.put(mcp_request)

    async with httpx.AsyncClient() as client:
        await client.put(
            f"{client_url}/api/plan/update_task", 
            json={"task_id": mcp_request.task.task_id, "status": "pending"}
        )
    
    # mcp_client = request.app.state.mcp_client
    # # Add to the request queue
    # await mcp_client.request_queue.put(mcp_request)
    return PlainTextResponse(content="MCP request enqueued", status_code=202)


@router.post("/api/execute_task")
async def execute_task(request: Request, task: Task):
    mcp_client = request.app.state.mcp_client
    client_url = os.environ.get("CLIENT_URL")
    # async with httpx.AsyncClient() as client:
    #     await client.put(
    #         f"{client_url}/api/task/update_task", 
    #         json={"task_id": task.task_id, "status": "running"}
    #     )
    # await mcp_client.task_queue.put(task)  # Enqueue the task for processing
    return PlainTextResponse(content="Task enqueued", status_code=202)

@router.get("/api/get_servers")
async def get_servers(request: Request):
    return await request.app.state.mcp_client.get_servers()

