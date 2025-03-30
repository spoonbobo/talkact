from typing import List
import os

from fastapi import Request
from fastapi.routing import APIRouter
from starlette.responses import PlainTextResponse
from loguru import logger
import requests
from schemas.mcp import MCPSummon
from service.app_client import AppClient
from schemas.mcp import Task


router = APIRouter()

@router.post("/api/summon")
async def mcp_summon(request: Request, summon: MCPSummon):
    client_host = request.client.host if request.client else "unknown"
    # headers = dict(request.headers)
    summon.client_host = client_host
    mcp_client  = request.app.state.mcp_client
    # await mcp_client.receive_summon(summon)
    await mcp_client.respond(summon)

    return PlainTextResponse(content="OK", status_code=200)

@router.post("/api/approve")
async def approve(request: Request, task: Task):
    mcp_client = request.app.state.mcp_client
    await mcp_client.execute(task)
    return PlainTextResponse(content="OK", status_code=200)


@router.get("/api/get_servers")
async def get_servers(request: Request):
    return await request.app.state.mcp_client.get_servers()
