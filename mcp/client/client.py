from contextlib import asynccontextmanager
from dotenv import load_dotenv
import json
import os
import asyncio
load_dotenv()

import uvicorn
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from loguru import logger


from api.routes import router as mcp_router
from service.mcp_client import MCPClient
from service.bypasser import Bypasser

@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("Starting MCP client")
    mcp_servers = json.load(open(os.getenv("MCP_SERVERS_JSON", ""))) or {}
    mcp_servers = mcp_servers["mcpServers"]
    bypasser = Bypasser(mcp_servers)

    mcp_client = MCPClient(mcp_servers, bypasser)
    
    await mcp_client.connect_to_servers()
    logger.info("Connected to MCP client")

    app.state.mcp_client = mcp_client
    task_processor = asyncio.create_task(mcp_client.process_tasks())  # Start task processing
    yield
    task_processor.cancel()  # Cancel the task processor on shutdown

app = FastAPI(lifespan=lifespan)
app.include_router(mcp_router)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

if __name__ == "__main__":
    # Add hostname and port info to the log
    logger.info(f"Starting server at http://0.0.0.0:34430")
    uvicorn.run(
        "client:app",
        host="0.0.0.0",
        port=34430,
        reload=True,
    )
