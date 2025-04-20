import { NextResponse } from 'next/server';
import db from '@/lib/db';

export async function GET(request: Request) {
    try {
        // Get URL and extract query parameters
        const url = new URL(request.url);
        const planId = url.searchParams.get('planId');
        const logId = url.searchParams.get('logId');
        const logIds = url.searchParams.get('logIds'); // Add support for multiple log IDs

        // Validate that at least one parameter is provided
        if (!planId && !logId && !logIds) {
            return NextResponse.json({
                error: 'Either planId, logId, or logIds must be provided'
            }, { status: 400 });
        }

        let logs;

        // If logId is provided, fetch a specific log
        if (logId) {
            logs = await db('plan_log')
                .where('id', logId)
                .first();

            if (!logs) {
                return NextResponse.json({
                    error: 'Log not found'
                }, { status: 404 });
            }
        }
        // If logIds is provided, fetch multiple specific logs
        else if (logIds) {
            const logIdArray = logIds.split(',');
            logs = await db('plan_log')
                .whereIn('id', logIdArray)
                .orderBy('created_at', 'desc');
        }
        // If planId is provided, fetch all logs for that plan
        else if (planId) {
            logs = await db('plan_log')
                .where('plan_id', planId)
                .orderBy('created_at', 'desc');
        }
        return NextResponse.json(logs);
    } catch (error) {
        console.error('Error fetching plan logs:', error);
        return NextResponse.json({
            error: 'Internal Server Error',
            details: error instanceof Error ? error.message : 'Unknown error'
        }, { status: 500 });
    }
}
