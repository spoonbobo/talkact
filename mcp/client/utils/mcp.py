import json
from typing import List, Dict, Optional, Any
from datetime import datetime

from openai.types.chat import ChatCompletion
from loguru import logger
import httpx
import os

from mcp.types import Tool as mcp_tool

from schemas.mcp import (
    Skill,
    PlanData
)

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
                elif hasattr(tool, 'function') and not isinstance(tool, dict):
                    if tool.function.name == tool_name:
                        tool_description = tool.function.description
                        tool_schema = getattr(tool.function, 'parameters', None)
                        logger.info(f"Found tool description for {tool_name}: {tool_description}")
                        break
                # Handle MCP tool format
                elif hasattr(tool, 'name') and not isinstance(tool, dict) and tool.name == tool_name:
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

def tools_from_mcp(tool: mcp_tool):
    """
    Convert MCP tool format to OpenAI function calling format.
    
    Args:
        tool: An MCP tool object
        
    Returns:
        dict: A tool description in OpenAI function calling format
    """
    function_obj = {
        "name": tool.name,
        "description": tool.description,
        "parameters": tool.inputSchema
    }
    
    return {
        "type": "function",
        "function": function_obj
    }

def prepare_background_information(plan: PlanData, step_number: int):
    background = ""
    conversations = plan.context.conversations
    background += "Conversations:\n"

    for message in reversed(conversations):
        if "created_at" in message:
            background += f"[{message['created_at']}] {message['role']}: {message['content']}\n"
    
    for step in range(1, step_number):
        step_log = plan.logs[str(step)]
        step_log_str = ""
        for skill, result in step_log.items():
            step_log_str += f"Skill: {skill}\nResult: {result}\n"
        background += f"Step {step}: {step_log_str}\n"

    return background

def load_server_description(server: str) -> str:
    with open(server, 'r') as file:
        return file.read()


def format_server_descriptions(
    server_names: List[str],
    server_descriptions_dict: Dict[str, str], 
    server_tools_dict: Dict[str, List[mcp_tool]]
    ) -> str:
    descriptions = []
    for idx, server in enumerate(server_names):
        description = server_descriptions_dict[server]
        # Replace "You provide the" with "The assistant has"
        description = description.replace("You provide the", "The assistant has")
        
        # Add tools information to the description
        if server in server_tools_dict:
            tools = server_tools_dict[server]
            tools_description = f"\n\nAvailable tools for Assistant {idx + 1} - {server}:\n"
            
            for tool in tools:
                # Extract just the first line of the description
                short_description = tool.description.split('\n')[0].strip() if tool.description else "No description available"
                tools_description += f"- {tool.name}: {short_description}\n"
            
            description += tools_description
        
        descriptions.append(f"assistant name: {server}\n=================\n{description}\n")
    
    return "\n" + "\n".join(descriptions)

def get_tool_description(
    tool_name: str,
    mcp_server: str,
    mcp_tools_dict: Dict[str, List[mcp_tool]]
) -> str:
    """
    Get the description for a tool from the mcp_tools_dict.
    
    Args:
        tool_name: The name of the tool
        mcp_server: The MCP server name
        
    Returns:
        str: The tool description, or a default if not found
    """
    # Default description
    tool_description = f"Tool call for {tool_name}"
    
    # Try to find a better description from the tools dictionary
    if mcp_server in mcp_tools_dict:
        for tool in mcp_tools_dict[mcp_server]:
            # Handle OpenAI function calling format
            if isinstance(tool, dict) and 'function' in tool:
                if tool['function']['name'] == tool_name:
                    tool_description = tool['function']['description']
                    break
            # Handle direct tool objects with function attribute
            elif hasattr(tool, 'function') and not isinstance(tool, dict):
                if tool.function.name == tool_name: # type: ignore
                    tool_description = tool.function.description # type: ignore 
                    break
            # Handle MCP tool format
            elif hasattr(tool, 'name') and not isinstance(tool, dict) and tool.name == tool_name:
                tool_description = tool.description # type: ignore
                break
    
    return tool_description # type: ignore

def format_room_users_readable(room_users_response: Any) -> str:
    """
    Format room users response into a human-readable string
    
    Args:
        room_users_response (dict): The response from get_room_users API
        
    Returns:
        str: A human-readable string listing the users in the room
    """
    if not room_users_response or 'users' not in room_users_response:
        return "No users found in this room."
    
    users = room_users_response['users']
    if not users:
        return "No users found in this room."
    
    user_strings = []
    for user in users:
        user_strings.append(f"• {user['username']} (ID: {user['id']})")
    
    total = room_users_response.get('pagination', {}).get('total', len(users))
    
    result = f"Room participants ({total}):\n" + "\n".join(user_strings)
    return result

def format_room_users(room_users_response: Any) -> str:
    """
    Format room users response into a simplified list of user_id and username pairs
    
    Args:
        room_users_response (dict): The response from get_room_users API
        
    Returns:
        str: A string representation of the list of users in format [{user_id, username}]
    """
    if not room_users_response or 'users' not in room_users_response:
        return "[]"
    
    users = room_users_response['users']
    formatted_users = []
    
    for user in users:
        formatted_users.append({
            'user_id': user['id'],
            'username': user['username']
        })
    
    return str(formatted_users)

def format_conversation(
    messages: List[Dict[str, Any]],
    show_username: bool = False
) -> str:
    formatted_text = "CONVERSATION START\n\n"
    for message in messages:
        # Determine the role based on sender field if available, otherwise use the role field
        if 'sender' in message:
            role = "assistant" if message['sender'] == "agent" else "user"
            if show_username:
                role += f" ({message['sender']})"
        else:
            role = message.get('role', 'user')
        
        content = message.get('content', '')
        # Get the timestamp from the message
        timestamp = message.get('created_at', '')
        timestamp_str = f" [{timestamp}]" if timestamp else ""
        
        # Clean up the content by removing '@agent' prefix
        if isinstance(content, str) and content.startswith('@agent'):
            content = content.replace('@agent', '', 1).strip()
        
        formatted_text += f"{role.capitalize()}{timestamp_str}: {content}\n"
    
    formatted_text += "\nCONVERSATION END"
    return formatted_text

async def get_room_users(
    room_id: str,
    limit: int = 50,
    offset: int = 0,
    search: str = '',
    role: str = ''
) -> dict:
    """
    Get all users in a specific room
    
    Args:
        room_id (str): The ID of the room to get users from
        limit (int, optional): Maximum number of users to return. Defaults to 50.
        offset (int, optional): Pagination offset. Defaults to 0.
        search (str, optional): Search term for filtering users. Defaults to ''.
        role (str, optional): Filter users by role. Defaults to ''.
        
    Returns:
        dict: Response containing users and pagination info
    """
    client_url = os.environ.get("CLIENT_URL", "")
    url = f"{client_url}/api/user/get_users"
    payload = {
        "room_id": room_id,
        "limit": limit,
        "offset": offset,
        "search": search,
        "role": role
    }
    
    try:
        async with httpx.AsyncClient() as client:
            response = await client.post(url, json=payload)
            if response.status_code != 200:
                error_text = response.json()
                raise Exception(f"Failed to get room users: {error_text}")
            
            return response.json()
    except Exception as e:
        logger.error(f"Error getting room users: {e}")
        return {}


def extract_json_from_response(response):
    """
    Extract and parse JSON from the OpenAI API response.
    
    Args:
        response: The OpenAI API response object
        
    Returns:
        dict: The parsed JSON object or None if parsing fails
    """
    try:
        # Get the content from the first message in the response
        content = response.choices[0].message.content
        
        # Check if the content contains JSON code block
        import re
        import json
        
        # Look for JSON content within markdown code blocks
        json_match = re.search(r'```(?:json)?\s*([\s\S]*?)\s*```', content)
        if json_match:
            json_str = json_match.group(1)
            return json.loads(json_str)
        
        # If no code block, try to parse the entire content as JSON
        try:
            return json.loads(content)
        except json.JSONDecodeError:
            # If that fails, return None
            return None
            
    except Exception as e:
        logger.error(f"Error extracting JSON from response: {e}")
        return None