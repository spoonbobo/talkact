def format_plan_created_message(plan_name, plan_id, plan_overview):
    """
    Format a message for plan creation notification.
    
    Args:
        plan_name (str): The name of the created plan
        plan_id (str): The ID of the created plan
        plan_overview (str): Overview/description of the plan
        
    Returns:
        str: A formatted markdown message for plan creation
    """
    return (
        f"✅ A new plan {plan_name} has been created!\n\n"
        f"| **Detail** | **Value** |\n"
        f"|------------|----------|\n"
        f"| **Plan ID** | `{plan_id}` |\n"
        f"| **Plan Overview** | {plan_overview} |\n\n"
        f"You can now review this plan or assign tasks to team members. "
        f"Refer to the Plan ID above for future reference."
    )
