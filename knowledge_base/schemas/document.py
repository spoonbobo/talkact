from typing import List, Optional, Any, Union
from pydantic import BaseModel, Field
from datetime import datetime
import uuid


class Document(BaseModel):
    """Schema for documents in the knowledge base"""
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    title: str
    type: str
    date: str
    tags: List[str] = []
    source: str
    description: str
    url: str
    folderId: str
    
    # Optional field to store the original document
    original_doc: Optional[Any] = None
    
    class Config:
        arbitrary_types_allowed = True


class Folder(BaseModel):
    """Schema for folder structure in the knowledge base"""
    
    id: str
    name: str
    folders: List["Folder"] = []
    files: List[str] = []
    isOpen: bool = False


class DataSource(BaseModel):
    """Schema for data sources in the knowledge base"""
    
    id: str
    name: str
    icon: str
    count: int


class QueryRequest(BaseModel):
    query: Union[str, List[str]]  # Can be a single string or list of strings
    conversation_history: Union[str, List[str]] = ""
    source_id: str
    streaming: bool = False
    top_k: int = 5
    preferred_language: str = "en"

# Update forward references for nested models
Folder.model_rebuild()
