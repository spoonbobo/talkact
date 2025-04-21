"""
TODO:
WARNING: this admin has to be authenticated to perform any actions.
"""

from mcp.server.fastmcp import FastMCP
import json
import dotenv
import uuid
dotenv.load_dotenv()
import os
import httpx
from loguru import logger
mcp = FastMCP("onlysaid_admin")
import datetime
from openai import OpenAI


from prompts.mcp_reqeust import MCP_REQUEST_SYSTEM_PROMPT, MCP_REQUEST_PROMPT # type: ignore
from utils.mcp import prepare_background_information_from_dict, parse_mcp_tools # type: ignore
from messages.seek_approval import seek_task_approval_message # type: ignore

openai = OpenAI(
    api_key=os.getenv("OPENAI_API_KEY"),
    base_url=os.getenv("OPENAI_API_BASE_URL")
)
client_url = os.getenv("CLIENT_URL")
mcp_client_url = "http://onlysaid-mcp_client:34430"

@mcp.tool()
async def approve_plan(plan_id: str) -> str:
    """
    Approves a plan for a chatroom.
    
    Args:
        plan_id: The ID of the plan to approve
    
    Returns:
        A message indicating the plan has been approved
    """
    async with httpx.AsyncClient() as client:
        response = await client.get(
            f"{client_url}/api/plan/get_plan_by_id?id={plan_id}",
            headers={"Content-Type": "application/json"}
        )
        response.raise_for_status()
        plan = response.json()
        plan_id = plan["id"]
        # find all related tasks
        response = await client.get(
            f"{client_url}/api/plan/get_tasks?planId={plan_id}",
            headers={"Content-Type": "application/json"}
        )
        response.raise_for_status()
        tasks = response.json()
        
        if not tasks:
            # mark the plan as success
            # TODO: need verify
            response = await client.put(
                f"{client_url}/api/plan/update_plan?plan_id={plan_id}&status=success",
                headers={"Content-Type": "application/json"}
            )
            response.raise_for_status()
            return json.dumps({"message": "Plan approved", "plan": f"{tasks}"})

        step_1 = None
        for task in tasks:
            if task.get('step_number') == 1:
                step_1 = task
                break
            
        if step_1 is None:
            raise ValueError("Step 1 not found")
    
        logger.info(f"Step 1: {step_1}")
        current_time = datetime.datetime.now().isoformat()
        # TODO: replace it with schema
        # prepare mcp request
        server_resp = await client.get(
            f"{mcp_client_url}/api/get_servers",
        )
        server_resp.raise_for_status()
        servers = server_resp.json()
        server_data = servers.get(step_1.get('mcp_server'))
        
        system_prompt = MCP_REQUEST_SYSTEM_PROMPT.format(
            mcp_server_speciality=server_data.get('speciality')
        )
        
        background_information = prepare_background_information_from_dict(plan, step_1.get('step_number'))
        
        user_prompt = MCP_REQUEST_PROMPT.format(
            plan_name=plan.get('plan_name'),
            plan_overview=plan.get('plan_overview'),
            background_information=background_information,
            task=step_1.get('task_name'),
            reason=step_1.get('task_explanation'),
            expectation=step_1.get('expected_result')
        )
        
        # get tools from mcp client
        tools_resp = await client.get(
            f"{mcp_client_url}/api/get_tools?server={step_1.get('mcp_server')}",
        )
        tools_resp.raise_for_status()
        server_skills = tools_resp.json()
        skills = server_skills.get(step_1.get('mcp_server'))
        
        tools = openai.chat.completions.create(
            model="deepseek-chat",
            messages=[{"role": "system", "content": system_prompt}, {"role": "user", "content": user_prompt}],
            tools=skills,
            tool_choice="required"
        )
        
        logger.info(f"Parsing {tools} to {skills} in {step_1.get('mcp_server')}")
        skills = parse_mcp_tools(tools, step_1.get('mcp_server'), server_skills)
        logger.info(f"Skills: {skills}")
        
        # task_id = step_1.get('task_id')
        skills_data = [skill.model_dump() for skill in skills]
        
        # 1. create_skills
        skill_ids = []
        for skill in skills_data:
            skill_response = await client.post(
                f"{client_url}/api/skill/create_skill",
                json=skill,
                headers={"Content-Type": "application/json"}
            )
            skill_response.raise_for_status()
            skill_ids.append(skill_response.json()["skill"]["id"])
        
        logger.info(f"Skill IDs: {skill_ids}")

        # 2. update the task to pending and include skills
        task_update_data = {
            "id": step_1.get('id'),  # Make sure we're using the correct task ID
            "status": "pending",
            "skills": skill_ids
        }
        plan_log_id = str(uuid.uuid4())
        
        response = await client.put(
            f"{client_url}/api/plan/update_task",
            json=task_update_data,
            headers={"Content-Type": "application/json"}
        )
                    
        response.raise_for_status()
        
        
        # 3. prepare a plan log
        plan_log = {
            "id": plan_log_id,
            "plan_id": plan_id,
            "task_id": step_1.get('id'),
            "type": "approval_requested",
            "content": f"Task {step_1.get('task_name')} is ready for approval",
            "created_at": datetime.datetime.now().isoformat()
        }
        await client.post(
            f"{client_url}/api/plan/create_plan_log",
            json=plan_log,
            headers={"Content-Type": "application/json"}
        )
        
        # 4. notify the client (use mcp_client)
        message = seek_task_approval_message(
            step_1, 
            skills_data,
            skill_ids,
            plan_log_id
        )
        resp = await client.post(
            f"{mcp_client_url}/api/agent_message",
            json={
                "content": message,
                "room_id": plan.get('room_id')
            },
            headers={"Content-Type": "application/json"}
        )
        resp.raise_for_status()
        
        return json.dumps({"message": "First task sent to client for approval"})

@mcp.tool()
async def idle() -> str:
    """
    Does nothing.
    """
    return "Idle"

@mcp.tool()
async def process_next_task(plan_id: str, next_step_number: int) -> str:
    """
    Process the next task in a plan.
    
    Args:
        plan_id: The ID of the plan
        next_step_number: The step number to process
        
    Returns:
        A message indicating the task has been processed
    """
    async with httpx.AsyncClient() as client:
        # Get plan data
        response = await client.get(
            f"{client_url}/api/plan/get_plan_by_id?id={plan_id}",
            headers={"Content-Type": "application/json"}
        )
        response.raise_for_status()
        plan = response.json()
        
        # Get tasks for the plan
        response = await client.get(
            f"{client_url}/api/plan/get_tasks?planId={plan_id}",
            headers={"Content-Type": "application/json"}
        )
        response.raise_for_status()
        tasks = response.json()
        
        # Find the next task
        next_task = next((task for task in tasks if task["step_number"] == next_step_number), None)
        if next_task is None:
            return json.dumps({"message": f"No task found for step {next_step_number}"})
        
        logger.info(f"Processing task: {next_task}")
        
        # Get server data
        server_resp = await client.get(
            f"{mcp_client_url}/api/get_servers",
        )
        server_resp.raise_for_status()
        servers = server_resp.json()
        server_data = servers.get(next_task.get('mcp_server'))
        
        # Prepare prompts
        system_prompt = MCP_REQUEST_SYSTEM_PROMPT.format(
            mcp_server_speciality=server_data.get('speciality')
        )
        
        background_information = prepare_background_information_from_dict(plan, next_task.get('step_number'))
        
        user_prompt = MCP_REQUEST_PROMPT.format(
            plan_name=plan.get('plan_name'),
            plan_overview=plan.get('plan_overview'),
            background_information=background_information,
            task=next_task.get('task_name'),
            reason=next_task.get('task_explanation'),
            expectation=next_task.get('expected_result')
        )
        
        # Get tools from mcp client
        tools_resp = await client.get(
            f"{mcp_client_url}/api/get_tools?server={next_task.get('mcp_server')}",
        )
        tools_resp.raise_for_status()
        server_skills = tools_resp.json()
        skills = server_skills.get(next_task.get('mcp_server'))
        
        # Generate tools using OpenAI
        tools = openai.chat.completions.create(
            model="deepseek-chat",
            messages=[{"role": "system", "content": system_prompt}, {"role": "user", "content": user_prompt}],
            tools=skills,
            tool_choice="required"
        )
        
        logger.info(f"Parsing {tools} to {skills} in {next_task.get('mcp_server')}")
        skills = parse_mcp_tools(tools, next_task.get('mcp_server'), server_skills)
        logger.info(f"Skills: {skills}")
        
        skills_data = [skill.model_dump() for skill in skills]
        
        # Create skills
        skill_ids = []
        for skill in skills_data:
            skill_response = await client.post(
                f"{client_url}/api/skill/create_skill",
                json=skill,
                headers={"Content-Type": "application/json"}
            )
            skill_response.raise_for_status()
            skill_ids.append(skill_response.json()["skill"]["id"])
        
        logger.info(f"Skill IDs: {skill_ids}")

        # Update task status
        task_update_data = {
            "id": next_task.get('id'),
            "status": "pending",
            "skills": skill_ids
        }
        plan_log_id = str(uuid.uuid4())
        
        response = await client.put(
            f"{client_url}/api/plan/update_task",
            json=task_update_data,
            headers={"Content-Type": "application/json"}
        )
        response.raise_for_status()
        
        # Create plan log
        plan_log = {
            "id": plan_log_id,
            "plan_id": plan_id,
            "task_id": next_task.get('id'),
            "type": "approval_requested",
            "content": f"Task {next_task.get('task_name')} is ready for approval",
            "created_at": datetime.datetime.now().isoformat()
        }
        await client.post(
            f"{client_url}/api/plan/create_plan_log",
            json=plan_log,
            headers={"Content-Type": "application/json"}
        )
        
        # Notify client
        message = seek_task_approval_message(
            next_task, 
            skills_data,
            skill_ids,
            plan_log_id
        )
        resp = await client.post(
            f"{mcp_client_url}/api/agent_message",
            json={
                "content": message,
                "room_id": plan.get('room_id')
            },
            headers={"Content-Type": "application/json"}
        )
        resp.raise_for_status()
        
        return json.dumps({"message": f"Task {next_step_number} sent to client for approval"})

if __name__ == "__main__":
    # Initialize and run the server
    print("Starting onlysaid_admin server")
    mcp.run(transport='stdio')
