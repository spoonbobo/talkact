import { NextResponse } from 'next/server';
import db from '@/lib/db';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export async function POST(request: Request) {
    try {
        // Check authentication
        const session = await getServerSession(authOptions);
        if (!session) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { id, all } = await request.json();

        // Delete all plans
        if (all === true) {
            // No need to check if user is owner - any authenticated user can reset

            // First delete all tasks associated with any plan
            const tasksDeleted = await db('task').del();

            // Then delete all plans
            const plansDeleted = await db('plan').del();

            return NextResponse.json({
                success: true,
                message: `All plans and their tasks deleted successfully. ${plansDeleted} plans and ${tasksDeleted} tasks removed.`
            }, { status: 200 });
        }

        // Delete a specific plan by ID
        else if (id) {
            // Get the plan to check ownership
            const plan = await db('plan')
                .where({ id })
                .first();

            if (!plan) {
                return NextResponse.json({ error: 'Plan not found' }, { status: 404 });
            }

            // Check if user is owner or the assigner of the plan
            const isOwner = await db('users')
                .where({ email: session.user?.email, is_owner: true })
                .first();

            if (!isOwner && plan.assigner !== session.user?.email) {
                return NextResponse.json({ error: 'Forbidden: Cannot delete another user\'s plan' }, { status: 403 });
            }

            // First delete all tasks associated with this plan
            const tasksDeleted = await db('task')
                .where({ plan_id: id })
                .del();

            // Then delete the plan
            await db('plan')
                .where({ id })
                .del();

            return NextResponse.json({
                success: true,
                message: `Plan deleted successfully along with ${tasksDeleted} associated tasks.`
            }, { status: 200 });
        }

        else {
            return NextResponse.json({ error: 'Missing required parameters: id or all' }, { status: 400 });
        }
    } catch (error) {
        console.error('Error deleting plan(s):', error);
        return NextResponse.json({
            error: 'Internal Server Error',
            details: error instanceof Error ? error.message : 'Unknown error'
        }, { status: 500 });
    }
}
