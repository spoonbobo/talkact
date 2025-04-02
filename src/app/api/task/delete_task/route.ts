import { NextResponse } from 'next/server';
import db from '@/lib/db';

export async function DELETE(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const taskId = searchParams.get('id');
        const deleteAll = searchParams.get('deleteAll') === 'true';

        // Option to delete all tasks
        if (deleteAll) {
            await db('tasks').del();
            return NextResponse.json({
                success: true,
                message: 'All tasks deleted successfully'
            }, { status: 200 });
        }

        // Validate task ID is provided when not deleting all
        if (!taskId) {
            return NextResponse.json({
                error: 'Task ID is required for deletion'
            }, { status: 400 });
        }

        // Delete specific task by ID
        const deletedCount = await db('tasks').where('id', taskId).del();

        if (deletedCount === 0) {
            return NextResponse.json({
                error: 'Task not found'
            }, { status: 404 });
        }

        return NextResponse.json({
            success: true,
            message: 'Task deleted successfully'
        }, { status: 200 });
    } catch (error) {
        console.error('Error deleting task:', error);
        return NextResponse.json({
            error: 'Internal Server Error',
            details: error instanceof Error ? error.message : 'Unknown error'
        }, { status: 500 });
    }
}
