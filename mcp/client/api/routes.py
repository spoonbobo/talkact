import httpx
import os

from fastapi import Request
from fastapi.routing import APIRouter
from starlette.responses import PlainTextResponse
from schemas.mcp import MCPSummon
from schemas.mcp import Task

router = APIRouter()

@router.post("/api/summon")
async def mcp_summon(request: Request, summon: MCPSummon):
    client_host = request.client.host if request.client else "unknown"
    summon.client_host = client_host
    mcp_client  = request.app.state.mcp_client
    await mcp_client.respond(summon)

    return PlainTextResponse(content="OK", status_code=200)

@router.post("/api/approve")
async def approve(request: Request, task: Task):
    mcp_client = request.app.state.mcp_client
    client_url = os.environ.get("CLIENT_URL")
    async with httpx.AsyncClient() as client:
        await client.put(
            f"{client_url}/api/task/update_task", 
            json={"task_id": task.task_id, "status": "running"}
        )
    await mcp_client.queue.put(task)  # Enqueue the task for processing
    return PlainTextResponse(content="Task enqueued", status_code=202)


@router.get("/api/get_servers")
async def get_servers(request: Request):
    return await request.app.state.mcp_client.get_servers()
