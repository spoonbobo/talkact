def seek_approval_message(skill, log_id=None):
    """
    Creates an approval message for a Skill object from the agent's perspective.
    
    Args:
        skill: A Skill object containing details to display
        log_id: Optional log ID to include in the ViewLog column
    
    Returns:
        A formatted markdown message for seeking approval
    """
    # Create a better formatted message with clear sections
    message_parts = []
    
    # Add title with the action name
    action_name = skill.name.replace('_', ' ')
    message_parts.append(f"🔔 **I'd like to {action_name}. May I proceed?**\n")
    
    # Arguments section - first show descriptions in a table
    if skill.args:
        message_parts.append("\n**Args**:")
        # Create a table for argument descriptions
        arg_descriptions = []
        for arg_name, arg_details in skill.args.items():
            if isinstance(arg_details, dict) and 'description' in arg_details and arg_details['description']:
                arg_descriptions.append(f"| {arg_name} | {arg_details['description']} |")
        
        if arg_descriptions:
            message_parts.append("| Argument | Description |")
            message_parts.append("| --- | --- |")
            message_parts.extend(arg_descriptions)
    
    # Returns section if available
    if hasattr(skill, 'returns') and skill.returns:
        message_parts.append(f"\n**Returns**:\n{skill.returns}")
    
    # Then show actual argument values in a table without repeating "Args:" heading
    if skill.args:
        # Create a table for argument values without repeating the Args heading
        message_parts.append("\n| Argument | Value | Detail |")
        message_parts.append("| --- | --- | --- |")
        for arg_name, arg_details in skill.args.items():
            # Handle both dictionary format and direct value format
            if isinstance(arg_details, dict) and 'value' in arg_details:
                arg_value = arg_details['value']
                message_parts.append(f"| {arg_name} | `{arg_value}` | vOnlysaid:LOG_ID:{log_id or ''}:diasylnOv |")
            else:
                # Simple format for direct values
                message_parts.append(f"| {arg_name} | `{arg_details}` | vOnlysaid:LOG_ID:{log_id or ''}:diasylnOv |")
    
    # Add a polite closing message
    message_parts.append("\nPlease review and let me know if I can proceed with this action.")
    message_parts.append(f"\n*If you trust me, you can enable `TRUST MODE` for automatic approvals!💫*\n")
    
    # Join all parts with appropriate spacing
    return "\n".join(message_parts) 

def seek_task_approval_message(task, skills=None, skill_ids=None, log_id=None):
    """
    Creates an approval message for a Task object from the agent's perspective.
    
    Args:
        task: A Task object containing details to display
        skills: Optional list of Skill objects with details
        skill_ids: Optional list of skill IDs
        log_id: Optional log ID to include in the ViewLog column
    
    Returns:
        A formatted markdown message for seeking task approval
    """
    # Create a better formatted message with clear sections
    message_parts = []
    
    # Add title with the task name
    message_parts.append(f"🔔 **Task: {task['task_name']}. May I proceed?**\n")
    
    # Task details section
    message_parts.append("**Task Details:**")
    message_parts.append("| Field | Value |")
    message_parts.append("| --- | --- |")
    
    # Add task explanation if available
    if task.get('task_explanation'):
        message_parts.append(f"| Explanation | {task['task_explanation']} |")
    
    # Add expected result if available
    if task.get('expected_result'):
        message_parts.append(f"| Expected Result | {task['expected_result']} |")
    
    # Add MCP server if available
    if task.get('mcp_server'):
        message_parts.append(f"| MCP Server | `{task['mcp_server']}` |")
    
    # Add View Log as standalone entry
    if log_id:
        message_parts.append(f"\nvOnlysaid:LOG_ID:{log_id}:diasylnOv")
    
    # Add a polite closing message
    message_parts.append("\nPlease review and let me know if I can proceed with this task.")
    message_parts.append(f"\n*If you trust me, you can enable `TRUST MODE` for automatic approvals!* 💫\n")
    
    # Join all parts with appropriate spacing
    return "\n".join(message_parts) 