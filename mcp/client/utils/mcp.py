import json
from typing import List
from datetime import datetime

from openai.types.chat import ChatCompletion
from loguru import logger
from schemas.mcp import Skill

def parse_mcp_tools(
    completion_response: ChatCompletion, 
    mcp_server: str,
    mcp_tools_dict: dict
) -> List[Skill]:
    """
    Parse tool calls from a ChatCompletion response object.
    
    Args:
        completion_response: ChatCompletion response from OpenAI API
        mcp_server: The MCP server name to associate with the skill calls
        mcp_tools_dict: Dictionary of MCP tools by server name
        
    Returns:
        List of Skill objects representing the parsed skill calls
    """
    skill_call_infos = []
    
    # Check if there are any tool calls in the response
    logger.info(f"Completion response: {completion_response}")
    if not completion_response.choices or not completion_response.choices[0].message.tool_calls:
        return []
    
    # Extract tool calls from the response
    tool_calls = completion_response.choices[0].message.tool_calls
    
    for tool_call in tool_calls:
        try:
            # Extract tool information
            tool_name = tool_call.function.name
            args_str = tool_call.function.arguments
            
            # Parse the arguments as a regular JSON object
            args = json.loads(args_str)
            
            # Find the specific tool that matches the tool name
            tool_description = None
            tool_schema = None
            
            # Properly extract tool information based on the structure in mcp_tools_dict
            for tool in mcp_tools_dict.get(mcp_server, []):
                # Handle OpenAI function calling format
                if isinstance(tool, dict) and 'function' in tool:
                    if tool['function']['name'] == tool_name:
                        tool_description = tool['function']['description']
                        tool_schema = tool['function'].get('parameters')
                        logger.info(f"Found tool description for {tool_name}: {tool_description}")
                        break
                # Handle direct tool objects
                elif hasattr(tool, 'function'):
                    if tool.function.name == tool_name:
                        tool_description = tool.function.description
                        tool_schema = getattr(tool.function, 'parameters', None)
                        logger.info(f"Found tool description for {tool_name}: {tool_description}")
                        break
                # Handle MCP tool format
                elif hasattr(tool, 'name') and tool.name == tool_name:
                    tool_description = tool.description
                    tool_schema = getattr(tool, 'inputSchema', None)
                    logger.info(f"Found tool description for {tool_name}: {tool_description}")
                    break
            
            # If we still don't have a description, use a default
            if tool_description is None:
                tool_description = f"Tool call for {tool_name}"
                logger.warning(f"No description found for {tool_name}, using default: {tool_description}")
            
            # Enhance args with type information if schema is available
            enhanced_args = {}
            if tool_schema and isinstance(tool_schema, dict) and 'properties' in tool_schema:
                properties = tool_schema['properties']
                for arg_name, arg_value in args.items():
                    if arg_name in properties:
                        prop = properties[arg_name]
                        arg_type = prop.get('type', 'unknown')
                        
                        # Handle array types with item types
                        if arg_type == 'array' and 'items' in prop:
                            item_type = prop['items'].get('type', 'unknown')
                            arg_type = f"array[{item_type}]"
                        
                        enhanced_args[arg_name] = {
                            "value": arg_value,
                            "type": arg_type,
                            "title": prop.get('title', arg_name),
                            "description": prop.get('description', '')
                        }
                    else:
                        # Infer type if not in schema
                        enhanced_args[arg_name] = create_inferred_arg_info(arg_name, arg_value)
            else:
                # No schema available, infer types for all arguments
                for arg_name, arg_value in args.items():
                    enhanced_args[arg_name] = create_inferred_arg_info(arg_name, arg_value)
            
            # Create a Skill object with all required fields
            now = datetime.now().isoformat()
            
            # Make sure we're using the found description, not a default
            if not tool_description or tool_description.strip() == "":
                tool_description = f"Tool call for {tool_name}"
            
            # Log the final description being used
            logger.info(f"Using description for {tool_name}: {tool_description}")
            
            skill_info = Skill(
                name=tool_name,
                created_at=now,
                updated_at=now,
                mcp_server=mcp_server,
                description=tool_description,
                type="function",
                args=enhanced_args
            )
            
            skill_call_infos.append(skill_info)
        except Exception as e:
            # Log the error and continue with the next tool call
            logger.warning(f"Error parsing tool call: {e}")
            logger.warning(f"Tool call: {tool_call}")
            continue
    
    return skill_call_infos

def create_inferred_arg_info(arg_name, arg_value):
    """Helper function to create argument info with inferred type"""
    if arg_value is None:
        inferred_type = 'null'
    elif isinstance(arg_value, list):
        inferred_type = 'array'
    elif isinstance(arg_value, dict):
        inferred_type = 'object'
    else:
        inferred_type = type(arg_value).__name__
        
    return {
        "value": arg_value,
        "type": inferred_type,
        "title": arg_name,
        "description": ""
    }