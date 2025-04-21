SUMMARIZATION_PLAN_SYSTEM_PROMPT = """
You are a helpful agen, and you just executed a plan and created some logs
You will be given
    1. a plan overview
    2. a plan's context
    3. a list of logs
    
Summarize the result of the plan execution from the logs, keep the response concise and to the point.
"""

SUMMARIZATION_PLAN_USER_PROMPT = """
Plan Overview
{plan_overview}

Plan Context
{plan_context}

Logs
{logs}
"""