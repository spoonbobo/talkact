from contextlib import asynccontextmanager
from dotenv import load_dotenv
import json
import os
load_dotenv()

import uvicorn
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from loguru import logger
from qdrant_client import QdrantClient

from kb_manager import KBManager
from api.route import router

@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("Starting Knowledge Base")
    # TODO: replace config.json with custom path
    config = json.load(open("config.json"))
    # TODO: replace with env variable
    qdrant_client = QdrantClient(host="onlysaid-qdrant", port=6333)
    kb_manager = KBManager(config, qdrant_client)
    kb_manager.load_documents()
    kb_manager.create_indices()
    app.state.kb_manager = kb_manager

    yield
    
    logger.info("Shutting down Knowledge Base")

app = FastAPI(lifespan=lifespan)
app.include_router(router)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

if __name__ == "__main__":
    # Add hostname and port info to the log
    logger.info(f"Starting server at http://0.0.0.0:35430")
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=35430,
        reload=True,
    )
