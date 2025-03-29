from typing import List, Dict, Any
import os

from fastapi import Request, Depends, Response
from fastapi.routing import APIRouter
from fastapi.responses import PlainTextResponse, StreamingResponse
from schemas.document import QueryRequest
from loguru import logger
from pydantic import BaseModel
import json

router = APIRouter()

# Dependency to get the KB manager from app state
def get_kb_manager(request: Request):
    return request.app.state.kb_manager

@router.get("/api/list_documents")
async def list_documents(request: Request) -> Dict[str, Any]:
    """
    List all available knowledge base sources, folder structures, and documents.
    """
    kb_manager = request.app.state.kb_manager
    data_sources = kb_manager.get_data_sources()
    logger.info(data_sources)
    
    # Prepare response structure compatible with the frontend
    response = {
        "dataSources": data_sources,
        "folderStructures": {},
        "documents": {}
    }
    
    # Add folder structures and documents for each source
    for source in data_sources:
        source_id = source["id"]
        response["folderStructures"][source_id] = kb_manager.get_folder_structure(source_id)
        response["documents"][source_id] = kb_manager.get_documents(source_id)
    
    return response

@router.post("/api/sync")
async def kb_sync(request: Request) -> Dict[str, Any]:
    """
    Synchronize the knowledge base.
    """
    kb_manager = request.app.state.kb_manager
    # Reload all documents
    kb_manager.load_documents()
    kb_manager.create_indices()
    return {"status": "success", "message": "Knowledge base synchronized"}

@router.post("/api/query")
async def query_knowledge_base(request: Request, query: QueryRequest):
    kb_manager = request.app.state.kb_manager
    
    if query.streaming:
        # Return a streaming response
        return StreamingResponse(
            stream_tokens(kb_manager, query),
            media_type="text/event-stream"
        )
    else:
        # Return a regular JSON response
        answer = kb_manager.answer_with_context(query)
        return {"status": "success", "results": answer}

async def stream_tokens(kb_manager, query):
    """Generate server-sent events for streaming tokens"""
    response_gen = kb_manager.answer_with_context(query)
    
    # Send initial event
    yield "event: start\ndata: {}\n\n"
    
    # Stream each token as an event
    for response in response_gen:
        if hasattr(response, 'delta'):
            token = response.delta
            data = json.dumps({"token": token})
            yield f"event: token\ndata: {data}\n\n"
    
    # Send completion event
    yield "event: end\ndata: {}\n\n"
