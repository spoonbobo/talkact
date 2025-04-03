from typing import List, Dict

from openai import OpenAI
import os

from base_llm import BaseLLM

"""
tools = [
    {
        "type": "function",
        "function": {
            "name": "get_weather",
            "description": "Get weather of an location, the user shoud supply a location first",
            "parameters": {
                "type": "object",
                "properties": {
                    "location": {
                        "type": "string",
                        "description": "The city and state, e.g. San Francisco, CA",
                    }
                },
                "required": ["location"]
            },
        }
    },
]

"""

class DeepSeekLLM(BaseLLM):
    def __init__(self):
        self.client = OpenAI(
            api_key=os.getenv("DEEPSEEK_APIKEY"),
            base_url="https://api.deepseek.com",
        )
        
    def chat_completion(
        self, 
        messages: List[Dict[str, str]],
        tools: List[Dict] = []
    ) -> str:
        if tools:
            response = self.client.chat.completions.create(
                model="deepseek-chat",
                messages=messages,
                tools=tools
            )
        else:
            response = self.client.chat.completions.create(
                model="deepseek-chat",
                messages=messages,
            )
        return response.choices[0].message.content or ""

if __name__ == "__main__":
    llm = DeepSeekLLM()
    
    print(llm.chat_completion([{"role": "user", "content": "How's the weather in Hong Kong"}], tools=[]))