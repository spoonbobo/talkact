from typing import List, Any, Dict, Optional, Any
from pydantic import BaseModel


class OwnerMessage(BaseModel):
    room_id: str
    owner_id: str
    owner_message: str
    trust: bool = False

class User(BaseModel):
    id: str
    username: str
    email: str
    created_at: str
    updated_at: str
    active_rooms: List[str] = []
    archived_rooms: List[str] = []
    avatar: Optional[str] = None
    role: str

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
    skills: Any
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

class PlanLog(BaseModel):
    id: str
    plan_id: str
    task_id: str
    skill_id: str
    created_at: str
    type: str
    content: str

class MCPTaskRequest(BaseModel):
    task: TaskData
    plan: PlanData

class PerformSkillRequest(BaseModel):
    log_id: str

class Skill(BaseModel):
    name: str
    created_at: str
    updated_at: str
    mcp_server: str
    description: str
    type: str
    args: Dict[str, Any]

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
    skills: List[Skill] = []

class AgentMessage(BaseModel):
    content: str
    room_id: str
