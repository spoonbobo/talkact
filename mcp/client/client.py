from contextlib import asynccontextmanager
from dotenv import load_dotenv
import json
import os
from uuid import uuid4
import asyncio
import traceback
load_dotenv()

import uvicorn
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from loguru import logger


from api.routes import router as mcp_router
from service.mcp_client import MCPClient
from service.socket_client import SocketClient

@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("Starting MCP client")
    mcp_servers = json.load(open(os.getenv("MCP_SERVERS_JSON", ""))) or {}
    mcp_servers = mcp_servers["mcpServers"]

    # Create socket client
    socket_client = SocketClient(os.getenv("SOCKET_SERVER_URL") or "", str(uuid4()))
    
    try:
        # Connect to socket server
        await socket_client.connect()
        
        # Create MCP client and connect to servers
        mcp_client = MCPClient(mcp_servers, socket_client)
        await mcp_client.connect_to_servers()
        logger.info("Connected to MCP client")

        # Store clients in app state
        app.state.mcp_client = mcp_client
        app.state.socket_client = socket_client
        
        yield
    except Exception as e:
        logger.error(f"Error during startup: {e}")
        logger.error(traceback.format_exc())
        raise
    finally:
        # Ensure proper cleanup on shutdown
        logger.info("Shutting down MCP client")
        try:
            await socket_client.disconnect()
            logger.info("Socket client disconnected")
        except Exception as e:
            logger.error(f"Error during socket client shutdown: {e}")

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
        workers=1  # Reduce to 1 worker to avoid multiple socket connections
    )
