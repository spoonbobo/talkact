import { NextResponse } from 'next/server';
import db from '@/lib/db';

export async function PUT(request: Request) {
    try {
        const body = await request.json();
        const { plan_id, status, progress, logs, step_number, reset_plan } = body;

        // Special handling for reset_plan operation
        if (reset_plan) {

            // Update plan to pending status
            const updateData = {
                status: 'pending',
                progress: 0,
                completed_at: null,
                updated_at: new Date()
            };

            // Update the plan
            const updatedCount = await db('plan')
                .where({ plan_id: plan_id })
                .update(updateData);

            if (updatedCount === 0) {
                return NextResponse.json({
                    error: 'Plan not found'
                }, { status: 404 });
            }

            // Reset all tasks associated with this plan to not_started
            await db('task')
                .where({ plan_id: plan_id })
                .update({
                    status: 'not_started',
                    start_time: null,
                    completed_at: null,
                    updated_at: new Date()
                });

            // Fetch the updated plan to return
            const [updatedPlan] = await db('plan').where({ plan_id: plan_id });

            // Format the response
            const formattedPlan = {
                id: updatedPlan.id,
                plan_id: updatedPlan.plan_id,
                status: updatedPlan.status,
                progress: updatedPlan.progress,
                updated_at: updatedPlan.updated_at,
                completed_at: updatedPlan.completed_at
            };

            return NextResponse.json({
                message: 'Plan reset successfully',
                plan: formattedPlan
            }, { status: 200 });
        }

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
        const updateData: any = {
            status,
            updated_at: new Date()
        };

        // Add progress if provided
        if (progress !== undefined) {
            // Ensure progress is a number between 0 and 100
            const progressNum = Number(progress);
            if (isNaN(progressNum) || progressNum < 0 || progressNum > 100) {
                return NextResponse.json({
                    error: 'Progress must be a number between 0 and 100'
                }, { status: 400 });
            }
            updateData.progress = progressNum;
        }

        // Handle logs by step number if both logs and step_number are provided
        if (logs !== undefined && step_number !== undefined) {
            // First get the current logs
            const [currentPlan] = await db('plan').where({ plan_id: plan_id }).select('logs');

            // Initialize with existing logs or empty object
            let updatedLogs = currentPlan?.logs || {};

            // Add new logs under the step_number key
            updatedLogs[step_number] = logs;

            // Update the logs field with the combined logs
            updateData.logs = updatedLogs;
        }
        // If only logs are provided without step_number, use the old behavior
        else if (logs !== undefined) {
            updateData.logs = logs;
        }

        // If status is 'completed', also set completed_at
        if (status === 'success' || status === 'failure' || status === 'terminated') {
            updateData.completed_at = new Date();
        } else {
            // Remove completed_at if status is not terminal
            updateData.completed_at = null;
        }


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
            progress: updatedPlan.progress,
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
