import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from "@/lib/auth";
import db from '@/lib/db';

export async function PUT(request: NextRequest) {
    try {
        // Check authentication
        // const session = await getServerSession(authOptions);
        // if (!session || !session.user) {
        //     console.log("Unauthorized");
        //     return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        // }

        // Parse request body
        const body = await request.json();
        const { task_id, tools_called, status } = body;

        // Validate required fields
        if (!task_id) {
            return NextResponse.json({ error: 'Task ID is required' }, { status: 400 });
        }

        // Prepare update data
        const updateData: Record<string, any> = {};

        // Only include fields that are provided and ensure proper JSON handling
        if (tools_called !== undefined) {
            // Make sure tools_called is properly formatted as JSON
            // If it's already an object, stringify it first to ensure valid JSON
            updateData.tools_called = typeof tools_called === 'string'
                ? tools_called
                : JSON.stringify(tools_called);
        }

        // Add status field if provided
        if (status !== undefined) {
            updateData.status = status;
        }

        // If no fields to update, return error
        if (Object.keys(updateData).length === 0) {
            return NextResponse.json({ error: 'No fields to update' }, { status: 400 });
        }

        // Update the task in the database using Knex
        const updatedTask = await db('tasks')
            .where({ task_id })
            .update(updateData)
            .returning('*');

        // Check if task was found and updated
        if (!updatedTask || updatedTask.length === 0) {
            return NextResponse.json({ error: 'Task not found' }, { status: 404 });
        }

        return NextResponse.json({
            message: 'Task updated successfully',
            task: updatedTask[0]
        });

    } catch (error) {
        console.error('Error updating task:', error);
        return NextResponse.json(
            { error: 'Failed to update task' },
            { status: 500 }
        );
    }
}
