import { NextResponse } from 'next/server';
import db from '@/lib/db';
import { ITask } from '@/types/plan';

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const taskId = searchParams.get('taskId');

        if (!taskId) {
            return NextResponse.json(
                { error: 'Missing required parameter: taskId' },
                { status: 400 }
            );
        }

        // Fetch the specific task by task_id
        const task = await db('task')
            .where('id', taskId)
            .first();

        if (!task) {
            return NextResponse.json(
                { error: 'Task not found' },
                { status: 404 }
            );
        }

        // Parse skills JSON if it exists
        let skillsData = null;
        if (task.skills) {
            try {
                const parsedSkills = typeof task.skills === 'string'
                    ? JSON.parse(task.skills)
                    : task.skills;

                // Handle both array and single object formats
                if (Array.isArray(parsedSkills)) {
                    // It's already an array of skills calls
                    skillsData = parsedSkills;
                } else if (parsedSkills.tool_name) {
                    // It's a single skills call
                    skillsData = parsedSkills;
                } else if (parsedSkills.original_assignee_name) {
                    // Convert our custom format to ISkills format
                    skillsData = {
                        tool_name: `Assigned to ${parsedSkills.original_assignee_name}`,
                        mcp_server: parsedSkills.original_assignee_name,
                        args: {}
                    };
                } else {
                    skillsData = null;
                }
            } catch (e) {
                console.error('Error parsing skills JSON:', e);
            }
        }

        // Parse logs JSON if it exists
        let logsData = {};
        if (task.logs) {
            try {
                logsData = typeof task.logs === 'string'
                    ? JSON.parse(task.logs)
                    : task.logs;
            } catch (e) {
                console.error('Error parsing logs JSON:', e);
            }
        }

        // Format the task to match the ITask interface
        const formattedTask: ITask = {
            id: task.id,
            task_id: task.task_id,
            plan_id: task.plan_id,
            step_number: task.step_number,
            task_name: task.task_name,
            created_at: task.created_at,
            start_time: task.start_time,
            completed_at: task.completed_at,
            task_explanation: task.task_explanation,
            expected_result: task.expected_result || "",
            mcp_server: task.mcp_server || null,
            skills: skillsData,
            status: task.status,
            result: task.result || "",
            logs: logsData,
        };

        return NextResponse.json(formattedTask);
    } catch (error) {
        console.error('Error fetching task:', error);
        return NextResponse.json(
            {
                error: 'Internal Server Error',
                details: error instanceof Error ? error.message : 'Unknown error'
            },
            { status: 500 }
        );
    }
} 