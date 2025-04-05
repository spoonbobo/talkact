from typing import List, Any, Dict, Optional, Any
from pydantic import BaseModel

class MCPTool(BaseModel):
    name: str
    description: str
    input_schema: Dict[str, Any]

class MCPServer(BaseModel):
    server_name: str
    server_description: str
    server_tools: List[MCPTool]


class MCPPlanRequest(BaseModel):
    room_id: str | int
    created_at: str
    query: str
    summoner: str
    assigner: str
    assignee: str
    client_host: str | None = None

class Tool(BaseModel):
    tool_name: str
    mcp_server: str
    args: Dict[str, Any]

class TaskData(BaseModel):
    id: str
    task_id: str
    plan_id: str
    step_number: int
    task_name: str
    created_at: str
    start_time: Optional[str] = None
    completed_at: Optional[str] = None
    task_explanation: str
    expected_result: str
    mcp_server: str
    tool: Any
    status: str
    result: str = ""
    logs: Dict[str, Any] = {}

class PlanContext(BaseModel):
    plan: Dict[str, Any]
    plan_name: str
    plan_overview: str
    query: List[Dict[str, str]]
    conversations: List[Dict[str, str]]

class PlanData(BaseModel):
    id: str
    plan_id: str
    room_id: str
    created_at: str
    updated_at: str
    completed_at: Optional[str]
    plan_name: str
    plan_overview: str
    status: str
    progress: int
    logs: Dict[str, Any] = {}
    context: PlanContext
    assigner: str
    assignee: str
    reviewer: Optional[str] = None

class MCPTaskRequest(BaseModel):
    task: TaskData
    plan: PlanData

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



