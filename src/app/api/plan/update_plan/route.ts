import { NextResponse } from 'next/server';
import db from '@/lib/db';

export async function PUT(request: Request) {
    try {
        const body = await request.json();
        const { plan_id, logs, step_number, status } = body;

        // Validate required fields
        if (!plan_id) {
            return NextResponse.json({
                error: 'Missing required field: plan_id'
            }, { status: 400 });
        }

        // Check if we're updating status
        if (status) {
            const statusUpdateCount = await db('plan')
                .where({ id: plan_id })
                .update({
                    status,
                    updated_at: new Date()
                });

            if (statusUpdateCount === 0) {
                console.error('Plan not found');
                return NextResponse.json({
                    error: 'Plan not found'
                }, { status: 404 });
            }

            // Fetch the updated plan to return
            const [updatedPlan] = await db('plan').where({ id: plan_id });

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
                message: 'Plan status updated successfully',
                plan: formattedPlan
            }, { status: 200 });
        }

        // If no status update, proceed with logs update
        if (logs === undefined) {
            return NextResponse.json({
                error: 'Missing required field: logs'
            }, { status: 400 });
        }

        // First get the current logs
        const [currentPlan] = await db('plan').where({ id: plan_id }).select('logs');

        let updatedLogs;

        // Handle step-specific logs (object format)
        if (step_number !== undefined) {
            // Initialize with existing logs or empty object
            updatedLogs = currentPlan?.logs || {};

            // Add new logs under the step_number key
            updatedLogs[step_number] = logs;
        }
        // Handle logs as an array for insertion
        else if (Array.isArray(logs)) {
            // Initialize with existing logs or empty array
            updatedLogs = Array.isArray(currentPlan?.logs) ? currentPlan.logs : [];

            // Add new logs to the array
            updatedLogs = [...updatedLogs, ...logs];
        }
        // If logs is a single object, convert to array and append
        else if (typeof logs === 'object' && logs !== null) {
            updatedLogs = Array.isArray(currentPlan?.logs) ? currentPlan.logs : [];
            updatedLogs.push(logs);
        }
        // Fallback - just use the provided logs
        else {
            updatedLogs = logs;
        }

        // Ensure the logs are properly serialized as JSON
        // This helps prevent syntax errors when storing in PostgreSQL JSONB
        try {
            // Test serialization to catch any JSON syntax issues
            JSON.stringify(updatedLogs);
        } catch (jsonError) {
            console.error('Invalid JSON format for logs:', jsonError);
            return NextResponse.json({
                error: 'Invalid JSON format for logs',
                details: jsonError instanceof Error ? jsonError.message : 'Unknown JSON error'
            }, { status: 400 });
        }

        // Update logs
        const logsUpdatedCount = await db('plan')
            .where({ id: plan_id })
            .update({
                logs: JSON.stringify(updatedLogs), // Explicitly stringify for Knex
                updated_at: new Date()
            });

        if (logsUpdatedCount === 0) {
            console.error('Plan not found');
            return NextResponse.json({
                error: 'Plan not found'
            }, { status: 404 });
        }

        // Fetch the updated plan to return
        const [updatedPlan] = await db('plan').where({ id: plan_id });

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
            message: 'Plan logs updated successfully',
            plan: formattedPlan
        }, { status: 200 });

    } catch (error) {
        console.error('Error updating plan logs:', error);
        return NextResponse.json({
            error: 'Internal Server Error',
            details: error instanceof Error ? error.message : 'Unknown error'
        }, { status: 500 });
    }
}
