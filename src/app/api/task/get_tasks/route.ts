import { NextResponse } from 'next/server';
import db from '@/lib/db';
import { ITask } from '@/types/task';

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const limitParam = searchParams.get('limit');
        const pageParam = searchParams.get('page');
        const statusParam = searchParams.get('status');

        // Convert parameters to appropriate types
        const limit = limitParam ? parseInt(limitParam, 10) : undefined;
        const page = pageParam ? parseInt(pageParam, 10) : 1;
        const status = statusParam && statusParam !== 'all' ? statusParam : undefined;

        // Validate limit is a positive number if provided
        if (limit !== undefined && (isNaN(limit) || limit <= 0)) {
            return NextResponse.json({
                error: 'Invalid limit parameter. Must be a positive number.'
            }, { status: 400 });
        }

        // Validate page is a positive number
        if (isNaN(page) || page <= 0) {
            return NextResponse.json({
                error: 'Invalid page parameter. Must be a positive number.'
            }, { status: 400 });
        }

        // Get total count for pagination
        let countQuery = db('tasks');
        if (status) {
            countQuery = countQuery.where('status', status);
        }
        const [{ count }] = await countQuery.count('* as count');
        const totalCount = parseInt(count as string, 10);

        // Build main query with order by
        let query = db('tasks').orderBy('created_at', 'desc');

        // Apply status filter if provided
        if (status) {
            query = query.where('status', status);
        }

        // Apply pagination
        const offset = (page - 1) * (limit || 10);
        if (limit !== undefined) {
            query = query.limit(limit);
        }
        query = query.offset(offset);

        // Execute query
        const tasks = await query;

        // Ensure tasks is an array
        if (!Array.isArray(tasks)) {
            console.error('Expected tasks to be an array but got:', typeof tasks);
            return NextResponse.json({
                tasks: [],
                pagination: {
                    total: 0,
                    page,
                    limit: limit || 10,
                    totalPages: 0
                }
            }, { status: 200 });
        }

        // Parse JSON strings back to objects
        const formattedTasks = tasks.map((task: any) => ({
            id: task.id,
            task_id: task.task_id,
            created_at: task.created_at,
            start_time: task.start_time,
            end_time: task.end_time,
            assigner: task.assigner,
            assignee: task.assignee,
            task_summarization: task.task_summarization,
            room_id: task.room_id,
            context: tryParseJSON(task.context),
            tools_called: tryParseJSON(task.tools_called),
            status: task.status,
            result: task.result
        }));

        return NextResponse.json({
            tasks: formattedTasks,
            pagination: {
                total: totalCount,
                page,
                limit: limit || 10,
                totalPages: Math.ceil(totalCount / (limit || 10))
            }
        }, { status: 200 });
    } catch (error) {
        console.error('Error fetching tasks:', error);
        return NextResponse.json({
            tasks: [],
            pagination: {
                total: 0,
                page: 1,
                limit: 10,
                totalPages: 0
            },
            error: 'Internal Server Error',
            details: error instanceof Error ? error.message : 'Unknown error'
        }, { status: 500 });
    }
}

// Helper function to safely parse JSON
function tryParseJSON(jsonString: string | null) {
    if (!jsonString) return null;

    try {
        return JSON.parse(jsonString);
    } catch (e) {
        return jsonString; // Return as-is if parsing fails
    }
}
