import json
from typing import List

from openai.types.chat import ChatCompletion
from loguru import logger
from schemas.mcp import ToolCallInfo

def parse_mcp_tools(
    completion_response: ChatCompletion, 
    mcp_server: str,
    mcp_tools_dict: dict
) -> List[ToolCallInfo]:
        """
        Parse tool calls from a ChatCompletion response object.
        
        Args:
            completion_response: ChatCompletion response from OpenAI API
            mcp_server: The MCP server name to associate with the tool calls
            
        Returns:
            List of ToolCallInfo objects representing the parsed tool calls
        """
        tool_call_infos = []
        
        # Check if there are any tool calls in the response
        logger.info(f"Completion response: {completion_response}")
        if not completion_response.choices or not completion_response.choices[0].message.tool_calls:
            return []
        
        # Extract tool calls from the response
        tool_calls = completion_response.choices[0].message.tool_calls
        tool_description = None
    
        for tool_call in tool_calls:
            try:
                # Extract tool information
                tool_name = tool_call.function.name
                args = json.loads(tool_call.function.arguments)
                
                # Find the specific tool that matches the tool name
                tool_schema = None
                for tool in mcp_tools_dict[mcp_server]:
                    if tool["function"]["name"] == tool_name:
                        tool_description = tool["function"]["description"]
                        tool_schema = tool["function"]["parameters"]
                        break
                
                # Augment args with type information from the schema
                augmented_args = {}
                if tool_schema and "properties" in tool_schema:
                    for arg_name, arg_value in args.items():
                        if arg_name in tool_schema["properties"]:
                            property_info = tool_schema["properties"][arg_name]
                            arg_type = property_info.get("type", "unknown")
                            
                            # Create augmented argument with value and type
                            augmented_args[arg_name] = {
                                "value": arg_value,
                                "type": arg_type
                            }
                        else:
                            # If property not found in schema, just include the value
                            augmented_args[arg_name] = {
                                "value": arg_value,
                                "type": "unknown"
                            }
                else:
                    # If no schema found, just wrap the values with type "unknown"
                    for arg_name, arg_value in args.items():
                        augmented_args[arg_name] = {
                            "value": arg_value,
                            "type": "unknown"
                        }
                
                # Create a ToolCallInfo object with augmented args
                tool_info = ToolCallInfo(
                    tool_name=tool_name,
                    mcp_server=mcp_server,
                    args=augmented_args,
                    description=tool_description
                )
                
                tool_call_infos.append(tool_info)
            except (json.JSONDecodeError, AttributeError) as e:
                # Skip this tool call if there's an error
                logger.warning(f"Error parsing tool call: {e}")
                continue
        
        return tool_call_infos
