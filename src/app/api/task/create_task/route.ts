import { NextResponse } from 'next/server';
import db from '@/lib/db';
import { ITask } from '@/types/task';

export async function POST(request: Request) {
    try {
        const task: ITask = await request.json();
        await db('tasks').insert({
            task_id: task.task_id,
            created_at: task.created_at,
            start_time: task.start_time,
            end_time: task.end_time,
            assigner: task.assigner,
            assignee: task.assignee,
            task_summarization: task.task_summarization,
            room_id: task.room_id,
            context: task.context,
            tools_called: task.tools_called,
            status: task.status,
            result: task.result
        });
        return NextResponse.json({ success: true }, { status: 200 });
    } catch (error) {
        // console.error('Error inserting message:', error);
        return NextResponse.json({
            error: 'Internal Server Error',
            details: error instanceof Error ? error.message : 'Unknown error'
        }, { status: 500 });
    }
}