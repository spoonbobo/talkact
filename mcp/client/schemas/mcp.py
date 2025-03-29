from typing import List, Any, Dict, Optional
from pydantic import BaseModel

class MCPTool(BaseModel):
    name: str
    description: str
    input_schema: Dict[str, Any]

class MCPServer(BaseModel):
    server_name: str
    server_description: str
    server_tools: List[MCPTool]


class MCPToolCall(BaseModel):
    tool_name: str
    mcp_server: str
    args: Dict[str, Any]
    room_id: str


class MCPSummon(BaseModel):
    room_id: str | int
    created_at: str
    query: str
    summoner: str
    assigner: str
    assignee: str
    client_host: str | None = None

class ToolCallInfo(BaseModel):
    tool_name: str
    mcp_server: str
    args: Dict[str, Any]
    description: Optional[str] = None

class Task(BaseModel):
    id: str
    task_id: str
    room_id: str
    assignee: str
    assigner: str
    created_at: str
    start_time: Optional[str] = None
    end_time: Optional[str] = None
    status: str  # e.g., "pending", "in_progress", "completed", "failed"
    task_summarization: str
    result: str = ""
    context: List[Dict[str, Any]] = []
    tools_called: List[ToolCallInfo] = []