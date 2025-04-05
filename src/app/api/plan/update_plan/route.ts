import { NextResponse } from 'next/server';
import db from '@/lib/db';

export async function PUT(request: Request) {
    try {
        const body = await request.json();
        const { plan_id, status } = body;

        // Validate required fields
        if (!plan_id) {
            return NextResponse.json({
                error: 'Missing required field: plan_id'
            }, { status: 400 });
        }

        if (!status) {
            return NextResponse.json({
                error: 'Missing required field: status'
            }, { status: 400 });
        }

        // Validate status value (you can adjust the allowed values as needed)
        const validStatuses = ['pending', 'running', 'success', 'failure', 'terminated'];
        if (!validStatuses.includes(status)) {
            return NextResponse.json({
                error: 'Invalid status value. Allowed values: ' + validStatuses.join(', ')
            }, { status: 400 });
        }

        // Update the plan with new status and updated_at timestamp
        const updateData = {
            status,
            updated_at: new Date(),
            completed_at: new Date()
        };


        // If status is 'completed', also set completed_at
        if (status === 'completed') {
            updateData.completed_at = new Date();
        }

        console.log('updateData', plan_id)

        // Perform the update
        const updatedCount = await db('plan')
            .where({ plan_id: plan_id })
            .update(updateData);

        if (updatedCount === 0) {
            return NextResponse.json({
                error: 'Plan not found'
            }, { status: 404 });
        }

        // Fetch the updated plan to return
        const [updatedPlan] = await db('plan').where({ plan_id: plan_id });

        // Format the response similar to get_plans
        const formattedPlan = {
            id: updatedPlan.id,
            plan_id: updatedPlan.plan_id,
            status: updatedPlan.status,
            updated_at: updatedPlan.updated_at,
            completed_at: updatedPlan.completed_at
        };

        return NextResponse.json({
            message: 'Plan updated successfully',
            plan: formattedPlan
        }, { status: 200 });

    } catch (error) {
        console.error('Error updating plan:', error);
        return NextResponse.json({
            error: 'Internal Server Error',
            details: error instanceof Error ? error.message : 'Unknown error'
        }, { status: 500 });
    }
}
