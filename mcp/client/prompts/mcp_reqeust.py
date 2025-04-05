# Background: CAG + RAG.

MCP_REQUEST_SYSTEM_PROMPT = """
{mcp_server_speciality}
You work with a planner and other assistants to solve problems with your capabilities
You will be given
    1. a plan
    2. the background information of the plan
    3. a assigned task for you
    4. reason why this task is important for the plan
    5. expectation of the task

Analyze the plan, understand your task, and use your capabilities to solve the task.
"""

MCP_REQUEST_PROMPT = """
Plan:
{plan_name}
{plan_overview}

Background Information:
{background_information}    

Assigned Task for you:
{task}

Reason why this task is important for the plan:
{reason}

Expectation of the task:
{expectation}
"""