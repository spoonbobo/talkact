import { NextResponse } from 'next/server';
import db from '@/lib/db';
import { ITask, ITool } from '@/types/plan';

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const planId = searchParams.get('planId');

        if (!planId) {
            return NextResponse.json(
                { error: 'Missing required parameter: planId' },
                { status: 400 }
            );
        }

        // Fetch tasks for the specified plan
        const tasks = await db('task')
            .where('plan_id', planId)
            .orderBy('step_number', 'asc');

        // Also fetch the plan to get room_id
        const plan = await db('plan')
            .where('plan_id', planId)
            .first();

        // Format the tasks to match the ITask interface
        const formattedTasks: ITask[] = tasks.map(task => {
            // Parse tool JSON if it exists
            let toolData = null;
            if (task.tool) {
                try {
                    const parsedTool = typeof task.tool === 'string'
                        ? JSON.parse(task.tool)
                        : task.tool;

                    // Handle both array and single object formats
                    if (Array.isArray(parsedTool)) {
                        // It's already an array of tool calls
                        toolData = parsedTool;
                    } else if (parsedTool.tool_name) {
                        // It's a single tool call
                        toolData = parsedTool;
                    } else if (parsedTool.original_assignee_name) {
                        // Convert our custom format to ITool format
                        toolData = {
                            tool_name: `Assigned to ${parsedTool.original_assignee_name}`,
                            mcp_server: parsedTool.original_assignee_name,
                            args: {}
                        };
                    } else {
                        toolData = null;
                    }
                } catch (e) {
                    console.error('Error parsing tool JSON:', e);
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

            return {
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
                tool: toolData,
                status: task.status,
                result: task.result || "",
                logs: logsData,
                task_description: task.task_explanation || "",
                priority: task.priority || "medium",
                assignee: task.mcp_server || "",
                assigner: ""
            };
        });

        return NextResponse.json(formattedTasks);
    } catch (error) {
        console.error('Error fetching tasks:', error);
        return NextResponse.json(
            {
                error: 'Internal Server Error',
                details: error instanceof Error ? error.message : 'Unknown error'
            },
            { status: 500 }
        );
    }
}
