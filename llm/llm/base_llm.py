# chat completetion
# tool calling (mcp tools)
from typing import List, Dict
from abc import ABC, abstractmethod

class BaseLLM(ABC):
    @abstractmethod
    def chat_completion(self, messages: List[Dict]) -> str:
        return ""
    
    def tools_from_mcp(self, messages: List[Dict]) -> List[Dict]:
        return [{}]
