from typing import Dict, Any
import os
from starlette.background import BackgroundTask

from fastapi import Request, HTTPException
from fastapi.routing import APIRouter
from fastapi.responses import PlainTextResponse, StreamingResponse

from schemas.document import QueryRequest, KnowledgeBaseRegistration, KnowledgeBaseStatus
from loguru import logger
import json
import asyncio
import traceback

router = APIRouter()

# Dependency to get the KB manager from app state
def get_kb_manager(request: Request):
    return request.app.state.kb_manager

@router.get("/api/list_documents")
async def list_documents(request: Request) -> Dict[str, Any]:
    """
    List all available knowledge base sources, folder structures, and documents.
    """
    try:
        kb_manager = request.app.state.kb_manager
        data_sources = kb_manager.get_data_sources()
        logger.info(f"Found {len(data_sources)} data sources")
        
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
    except Exception as e:
        logger.error(f"Error in list_documents: {str(e)}")
        logger.error(traceback.format_exc())
        return {"error": str(e)}

@router.post("/api/register_kb")
async def register_kb(request: Request, kb_item: KnowledgeBaseRegistration) -> Dict[str, Any]:
    """
    Register a new knowledge base for processing
    """
    try:
        kb_manager = request.app.state.kb_manager
        logger.info(f"Registering new KB: {kb_item.id} - {kb_item.name} - {kb_item.source_type}")
        result = kb_manager.register_knowledge_base(kb_item)
        return result
    except Exception as e:
        logger.error(f"Error registering KB: {str(e)}")
        logger.error(traceback.format_exc())
        return {"status": "error", "message": str(e)}

@router.get("/api/kb_status/{kb_id}")
async def kb_status(request: Request, kb_id: str) -> KnowledgeBaseStatus:
    """
    Check the status of a knowledge base
    """
    try:
        kb_manager = request.app.state.kb_manager
        status = kb_manager.get_kb_status(kb_id)
        
        return KnowledgeBaseStatus(
            id=kb_id,
            status=status,
            message=None  # Could add more detailed messages in the future
        )
    except Exception as e:
        logger.error(f"Error getting KB status: {str(e)}")
        logger.error(traceback.format_exc())
        return KnowledgeBaseStatus(
            id=kb_id,
            status="error",
            message=str(e)
        )

@router.post("/api/sync")
async def kb_sync(request: Request) -> Dict[str, Any]:
    """
    Synchronize the knowledge base.
    """
    try:
        kb_manager = request.app.state.kb_manager
        
        # Get all running knowledge bases from Redis
        kb_status_keys = kb_manager._redis_keys("kb_status:*")
        logger.info(f"Found {len(kb_status_keys)} KB status keys")
        
        for key in kb_status_keys:
            kb_id = key.split(":")[-1]
            status = kb_manager._redis_get(key)
            logger.info(f"KB {kb_id} status: {status}")
            
            if status == "running":
                try:
                    # Check if reader is in local cache
                    if kb_id in kb_manager.readers:
                        reader = kb_manager.readers[kb_id]
                    else:
                        # Try to load reader from Redis config
                        kb_config_json = kb_manager._redis_get(f"kb_config:{kb_id}")
                        if not kb_config_json:
                            logger.warning(f"Config not found for KB {kb_id}")
                            continue
                            
                        kb_config = json.loads(kb_config_json)
                        source_type = kb_config.get("source_type")
                        config = kb_config.get("config", {})
                        
                        if source_type not in kb_manager.sources:
                            logger.warning(f"Unknown source type: {source_type}")
                            continue
                            
                        # Initialize the reader
                        reader = kb_manager.sources[source_type]()
                        reader.configure(config)
                        kb_manager.readers[kb_id] = reader
                    
                    # Load documents
                    docs = reader.load_documents()
                    kb_manager.documents[kb_id] = docs
                    
                    # Update folder structure
                    folder_structure = kb_manager._build_folder_structure(docs)
                    kb_manager.folder_structure[kb_id] = folder_structure
                    
                    # Store folder structure in Redis
                    kb_manager._redis_set(f"kb_folder_structure:{kb_id}", json.dumps(folder_structure))
                    
                    # Recreate the index
                    await asyncio.to_thread(kb_manager.create_indices, kb_id)
                    logger.info(f"Reloaded documents and recreated index for KB {kb_id}")
                except Exception as e:
                    logger.error(f"Error reloading documents for KB {kb_id}: {str(e)}")
                    logger.error(traceback.format_exc())
                    kb_manager._kb_status[kb_id] = "error"
                    kb_manager._redis_set(f"kb_status:{kb_id}", "error")
        
        return {"status": "success", "message": "Knowledge base synchronized"}
    except Exception as e:
        logger.error(f"Error in sync: {str(e)}")
        logger.error(traceback.format_exc())
        return {"status": "error", "message": str(e)}

@router.post("/api/query")
async def query_knowledge_base(request: Request, query: QueryRequest):
    try:
        kb_manager = request.app.state.kb_manager
        logger.info(f"Query received: {query}")
        
        if query.streaming:
            # Generate a unique ID for this streaming session
            session_id = f"stream_{os.urandom(8).hex()}"
            
            # Store the query parameters for potential reconnection
            kb_manager.store_message(session_id, {
                "query": query.dict(),
                "current_content": "",
                "is_complete": False
            })
            
            # Queue the query and get a response queue
            response_queue = await kb_manager.queue_query(query, session_id)
            
            # Return a streaming response with cleanup task
            return StreamingResponse(
                stream_tokens_new(kb_manager, query, session_id, response_queue), # type: ignore
                media_type="text/event-stream",
                background=BackgroundTask(cleanup_session, kb_manager, session_id)
            )
        else:
            # Return a regular JSON response - keep this unchanged for now
            answer = kb_manager.answer_with_context(query)
            return {"status": "success", "results": answer}
    except Exception as e:
        logger.error(f"Error in query: {str(e)}")
        logger.error(traceback.format_exc())
        return {"status": "error", "message": str(e)}

async def handle_non_streaming_response(generator):
    """Convert a streaming generator to a complete response"""
    full_response = ""
    async for chunk in generator:
        if hasattr(chunk, 'delta'):
            full_response += chunk.delta
        elif hasattr(chunk, 'text'):
            full_response += chunk.text
        elif isinstance(chunk, dict) and 'text' in chunk:
            full_response += chunk['text']
        elif isinstance(chunk, str):
            full_response += chunk
    return full_response

@router.get("/api/stream/{stream_id}")
async def resume_stream(request: Request, stream_id: str):
    """
    Resume a streaming session from where it left off or from the beginning
    """
    try:
        kb_manager = request.app.state.kb_manager
        message_data = kb_manager.get_message_by_id(stream_id)
        
        if not message_data:
            raise HTTPException(status_code=404, detail="Stream not found or expired")
            
        # If the stream is already complete, return the full content
        if message_data.get("is_complete", False):
            content = message_data.get("current_content", "")
            return PlainTextResponse(content)
            
        # Otherwise, reconstruct the query and resume streaming
        query_dict = message_data.get("query", {})
        query = QueryRequest(**query_dict)
        
        # Queue the query and get a response queue
        response_queue = await kb_manager.queue_query(query, stream_id)
        
        # Return a streaming response
        return StreamingResponse(
            # type: ignore
            stream_tokens_new(kb_manager, query, stream_id, response_queue, resume=True), # type: ignore
            media_type="text/event-stream",
            background=BackgroundTask(cleanup_session, kb_manager, stream_id)
        )
    except Exception as e:
        logger.error(f"Error in resume_stream: {str(e)}")
        logger.error(traceback.format_exc())
        return {"status": "error", "message": str(e)}

async def cleanup_session(kb_manager, session_id):
    """Clean up session data after streaming ends"""
    try:
        kb_manager.remove_message(session_id)
    except Exception as e:
        logger.error(f"Error cleaning up session {session_id}: {str(e)}")

async def stream_tokens_new(kb_manager, query, session_id, response_queue, resume=False):
    """Generate server-sent events for streaming tokens with queue-based approach"""
    try:
        # Get current accumulated content if resuming
        if resume:
            message_data = kb_manager.get_message_by_id(session_id)
            accumulated_content = message_data.get("current_content", "") if message_data else ""
            
            # Send the current content as initial event for the client to catch up
            data = json.dumps({"initial_content": accumulated_content})
            yield f"event: initial\ndata: {data}\n\n"
        else:
            accumulated_content = ""
            # Send initial event
            yield "event: start\ndata: {}\n\n"
        
        try:
            # Wait for the generator from the queue
            response = await response_queue.get()
            
            if response["status"] == "error":
                error_data = json.dumps({"error": response["error"]})
                yield f"event: error\ndata: {error_data}\n\n"
                return
                
            # Get the generator
            gen = response["generator"]
            
            # Use the async streaming method
            async for chunk in gen:
                # Extract the text from the CompletionResponse object
                if hasattr(chunk, 'delta'):
                    token = chunk.delta
                elif hasattr(chunk, 'text'):
                    token = chunk.text
                elif isinstance(chunk, dict) and 'text' in chunk:
                    token = chunk['text']
                elif isinstance(chunk, str):
                    token = chunk
                else:
                    # Log the unexpected type for debugging
                    logger.warning(f"Unexpected token type: {type(chunk)}, value: {chunk}")
                    token = str(chunk)
                    
                accumulated_content += token
                
                # Update stored content
                kb_manager.update_message_content(session_id, accumulated_content)
                
                data = json.dumps({"token": token})
                yield f"event: token\ndata: {data}\n\n"
                
                # Small delay to prevent overwhelming the client
                await asyncio.sleep(0.01)
        except Exception as e:
            logger.error(f"Streaming error: {str(e)}")
            logger.error(traceback.format_exc())
            # We'll mark the session as complete even on error
            error_data = json.dumps({"error": str(e)})
            yield f"event: error\ndata: {error_data}\n\n"
    except Exception as e:
        logger.error(f"Error in stream_tokens: {str(e)}")
        logger.error(traceback.format_exc())
    finally:
        try:
            # Mark session as complete
            if session_id in kb_manager._message_store:
                kb_manager._message_store[session_id]["is_complete"] = True
                # Update in Redis
                kb_manager._redis_set(
                    f"kb_message:{session_id}", 
                    json.dumps({**kb_manager._message_store[session_id], "is_complete": True})
                )
            
            # Send completion event
            yield "event: end\ndata: {}\n\n"
        except Exception as e:
            logger.error(f"Error finalizing stream: {str(e)}")
            logger.error(traceback.format_exc())

@router.post("/api/update_kb_status")
async def update_kb_status(request: Request, kb_data: dict) -> Dict[str, Any]:
    """
    Enable or disable a knowledge base
    """
    try:
        kb_manager = request.app.state.kb_manager
        kb_id = kb_data.get("id")
        enabled = kb_data.get("enabled")
        
        if not kb_id:
            return {"status": "error", "message": "Knowledge base ID is required"}
        
        result = kb_manager.update_kb_status(kb_id, enabled)
        return result
    except Exception as e:
        logger.error(f"Error updating KB status: {str(e)}")
        logger.error(traceback.format_exc())
        return {"status": "error", "message": str(e)}

@router.post("/api/delete_kb")
async def delete_kb(request: Request, kb_data: dict) -> Dict[str, Any]:
    """
    Delete a knowledge base completely
    """
    try:
        kb_manager = request.app.state.kb_manager
        kb_id = kb_data.get("id")
        
        if not kb_id:
            return {"status": "error", "message": "Knowledge base ID is required"}
        
        result = kb_manager.delete_knowledge_base(kb_id)
        return result
    except Exception as e:
        logger.error(f"Error deleting KB: {str(e)}")
        logger.error(traceback.format_exc())
        return {"status": "error", "message": str(e)}
