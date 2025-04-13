import { NextResponse } from 'next/server';
import db from '@/lib/db';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export async function DELETE(request: Request) {
    try {
        // Check authentication
        const session = await getServerSession(authOptions);
        if (!session) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Parse query parameters
        const url = new URL(request.url);
        const id = url.searchParams.get('id');
        const planId = url.searchParams.get('planId');
        const deleteAll = url.searchParams.get('deleteAll') === 'true';

        // Delete all tasks (admin only)
        if (deleteAll) {
            // Check if user is admin/owner for this operation
            const user = await db('users').where({ email: session.user?.email }).first();
            if (!user || !user.is_owner) {
                return NextResponse.json({ error: 'Forbidden: Only owners can delete all tasks' }, { status: 403 });
            }

            const deletedCount = await db('task').del();
            return NextResponse.json({
                success: true,
                message: `All tasks deleted successfully. ${deletedCount} tasks removed.`
            }, { status: 200 });
        }

        // Delete tasks by plan_id
        else if (planId) {
            // Get the plan to check ownership
            const plan = await db('plan')
                .where({ id: planId })
                .first();

            if (!plan) {
                return NextResponse.json({ error: 'Plan not found' }, { status: 404 });
            }

            // Check if user is owner or the assigner of the plan
            const isOwner = await db('users')
                .where({ email: session.user?.email, is_owner: true })
                .first();

            if (!isOwner && plan.assigner !== session.user?.email) {
                return NextResponse.json({ error: 'Forbidden: Cannot delete tasks from another user\'s plan' }, { status: 403 });
            }

            const deletedCount = await db('task')
                .where({ plan_id: planId })
                .del();

            return NextResponse.json({
                success: true,
                message: `All tasks for plan deleted successfully. ${deletedCount} tasks removed.`
            }, { status: 200 });
        }

        // Delete a specific task by ID
        else if (id) {
            // Get the task to check ownership
            const task = await db('task')
                .where({ id })
                .first();

            if (!task) {
                return NextResponse.json({ error: 'Task not found' }, { status: 404 });
            }

            // Get the plan to check ownership
            const plan = await db('plan')
                .where({ id: task.plan_id })
                .first();

            if (!plan) {
                return NextResponse.json({ error: 'Associated plan not found' }, { status: 404 });
            }

            // Check if user is owner or the assigner of the plan
            const isOwner = await db('users')
                .where({ email: session.user?.email, is_owner: true })
                .first();

            if (!isOwner && plan.assigner !== session.user?.email) {
                return NextResponse.json({ error: 'Forbidden: Cannot delete tasks from another user\'s plan' }, { status: 403 });
            }

            await db('task')
                .where({ id })
                .del();

            return NextResponse.json({
                success: true,
                message: 'Task deleted successfully'
            }, { status: 200 });
        }

        else {
            return NextResponse.json({ error: 'Missing required parameters: id, planId, or deleteAll' }, { status: 400 });
        }
    } catch (error) {
        console.error('Error deleting task(s):', error);
        return NextResponse.json({
            error: 'Internal Server Error',
            details: error instanceof Error ? error.message : 'Unknown error'
        }, { status: 500 });
    }
}
