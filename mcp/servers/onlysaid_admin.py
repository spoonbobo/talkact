"""
TODO:
WARNING: this admin has to be authenticated to perform any actions.
"""

from mcp.server.fastmcp import FastMCP
import json
import dotenv

dotenv.load_dotenv()
import os
mcp = FastMCP("onlysaid_admin")

client_url = os.getenv("CLIENT_URL")

@mcp.tool()
async def approve_plan(plan_id: str) -> str:
    """
    Approves a plan for a chatroom.
    
    Args:
        plan_id: The ID of the plan to approve
    
    Returns:
        A message indicating the plan has been approved
    """
    result = {
        "plan_id": plan_id,
        "content": "Plan approved"
    }
    
    return json.dumps(result)

@mcp.tool()
async def idle() -> str:
    """
    Does nothing.
    """
    return "Idle"

if __name__ == "__main__":
    # Initialize and run the server
    print("Starting onlysaid_admin server")
    mcp.run(transport='stdio')
