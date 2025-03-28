from typing import List
import os

from fastapi import Request
from fastapi.routing import APIRouter
from starlette.responses import PlainTextResponse
from loguru import logger
import requests
from schemas.mcp import MCPSummon
from service.app_client import AppClient


router = APIRouter()

@router.post("/api/agent/summon")
async def mcp_summon(request: Request, summon: MCPSummon):
    client_host = request.client.host if request.client else "unknown"
    # headers = dict(request.headers)
    summon.client_host = client_host
    mcp_client  = request.app.state.mcp_client
    # await mcp_client.receive_summon(summon)
    await mcp_client.respond(summon)

    return PlainTextResponse(content="OK", status_code=200)

@router.post("/api/agent/on_approve")
async def mcp_on_approve(request: Request, approve):
    return "ok"

# @router.post("/api/app/access")
# async def access(request: Request, access: MCPAccess):
#     logger.info(f"Accessing MCP server: {access}")
#     client_url = os.getenv("CLIENT_URL", "")

#     response = requests.post(
#         f"{client_url}/api/auth",
#         json={
#             "username": os.getenv("AGENTUSER"),
#             "password": os.getenv("AGENTPASSWORD"),
#         },
#     )
#     token = response.json()["token"]

#     app_client = AppClient(access.room_id, token)
#     await app_client.disconnect()
#     await app_client.connect()

#     mcp_response = await request.app.state.mcp_client_manager.respond(access)
    
#     logger.info(mcp_response)
    
#     logger.info(f"Sending test message: {mcp_response}")
#     message_delivered = await app_client.send_message_with_retry(
#         mcp_response, 
#         max_retries=3,
#         initial_timeout=5.0
#     )
    
#     if message_delivered:
#         logger.info("Message delivery confirmed")
#     else:
#         logger.warning("Message delivery failed or timed out")
    
#     await app_client.disconnect()
#     return "ok"

# @router.post("/api/app/approve")
# async def approve(request: Request, approval: MCPApproval):
#     logger.info(f"Approving task: {approval}")
    
#     client_url = os.getenv("CLIENT_URL", "")

#     response = requests.post(
#         f"{client_url}/api/auth",
#         json={
#             "username": os.getenv("AGENTUSER"),
#             "password": os.getenv("AGENTPASSWORD"),
#         },
#     )
#     token = response.json()["token"]
#     room_id = approval.tools_called[0].room_id

#     app_client = AppClient(room_id, token)
#     await app_client.disconnect()
#     await app_client.connect()

#     mcp_response = await request.app.state.mcp_client_manager.call_tool(approval)
    
#     message_delivered = await app_client.send_message_with_retry(
#         mcp_response, 
#         max_retries=3,
#         initial_timeout=5.0
#     )

#     await app_client.disconnect()
#     return "ok"

@router.get("/api/app/get_servers")
async def get_servers(request: Request):
    return await request.app.state.mcp_client.get_servers()
