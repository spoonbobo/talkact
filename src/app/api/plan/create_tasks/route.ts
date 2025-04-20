import { NextResponse } from 'next/server';
import db from '@/lib/db';
import { v4 as uuidv4 } from 'uuid';

export async function POST(request: Request) {
    try {
        const body = await request.json();

        // Extract required fields from the request body
        const {
            plan_id,
            tasks
        } = body;

        // Validate required fields
        if (!plan_id) {
            return NextResponse.json({
                error: 'Missing required field: plan_id'
            }, { status: 400 });
        }

        if (!tasks || !Array.isArray(tasks) || tasks.length === 0) {
            return NextResponse.json({
                error: 'Missing or invalid tasks array'
            }, { status: 400 });
        }

        // Check if plan exists
        const plan = await db('plan').where('id', plan_id).first();
        if (!plan) {
            return NextResponse.json({
                error: 'Plan not found'
            }, { status: 404 });
        }

        // Prepare tasks data - ensure skills is properly handled
        const tasksData = tasks.map((task, index) => {
            // Handle skills field - can be array of skill IDs or object
            let skillsJson = null;

            if (Array.isArray(task.skills)) {
                // If skills is an array of skill IDs, store it as JSON
                skillsJson = JSON.stringify(task.skills);
            } else if (task.skills && typeof task.skills === 'object') {
                // If skills is an object, stringify it
                skillsJson = JSON.stringify(task.skills);
            } else if (task.skills) {
                // If skills is already a string, use it directly
                skillsJson = typeof task.skills === 'string' ? task.skills : JSON.stringify(task.skills);
            } else if (task.assignee || task.assigner || task.reviewer) {
                // If no skills was provided but assignee/assigner/reviewer were, create a skills object for them
                skillsJson = JSON.stringify({
                    assignee: task.assignee,
                    assigner: task.assigner,
                    reviewer: task.reviewer
                });
            }

            return {
                id: task.id || uuidv4(), // Use provided id or generate a new one
                plan_id: plan_id,
                step_number: task.step_number || index + 1,
                task_name: task.task_name,
                created_at: new Date(),
                start_time: null,
                completed_at: null,
                mcp_server: task.mcp_server || null,
                task_explanation: task.task_explanation,
                expected_result: task.expected_result || '',
                skills: skillsJson,
                status: task.status || 'not_started', // Use provided status or default to not_started
                result: task.result || '',
                logs: JSON.stringify(task.logs || {})
            };
        });

        // Insert tasks into database
        const insertedTasks = await db('task').insert(tasksData).returning('*');

        // Update plan with task count
        await db('plan')
            .where('id', plan_id)
            .update({
                updated_at: new Date()
            });

        // Format the response - handle both string and object cases for skills and logs
        const formattedTasks = insertedTasks.map(task => {
            let parsedSkills = null;
            if (task.skills) {
                try {
                    // Try to parse if it's a string
                    parsedSkills = typeof task.skills === 'string' ? JSON.parse(task.skills) : task.skills;
                } catch (e) {
                    // If parsing fails, use as is
                    parsedSkills = task.skills;
                }
            }

            let parsedLogs = {};
            if (task.logs) {
                try {
                    // Try to parse if it's a string
                    parsedLogs = typeof task.logs === 'string' ? JSON.parse(task.logs) : task.logs;
                } catch (e) {
                    // If parsing fails, use as is
                    parsedLogs = task.logs;
                }
            }

            return {
                ...task,
                skills: parsedSkills,
                logs: parsedLogs
            };
        });

        return NextResponse.json({
            message: 'Tasks created successfully',
            tasks: formattedTasks
        }, { status: 201 });
    } catch (error) {
        console.error('Error creating tasks:', error);
        return NextResponse.json({
            error: 'Internal Server Error',
            details: error instanceof Error ? error.message : 'Unknown error'
        }, { status: 500 });
    }
} 