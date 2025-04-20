import { NextResponse } from 'next/server';
import db from '@/lib/db';

export async function PUT(request: Request) {
    try {
        // Parse the request body
        const body = await request.json();
        const { logId, type } = body;

        // Validate required parameters
        if (!logId) {
            return NextResponse.json({
                error: 'logId is required'
            }, { status: 400 });
        }

        if (!type || !['approved', 'denied'].includes(type)) {
            return NextResponse.json({
                error: 'type must be either "approved" or "denied"'
            }, { status: 400 });
        }

        // Update the log type in the database
        const updatedCount = await db('plan_log')
            .where('id', logId)
            .update({
                type: type === 'approved' ? 'plan_approved' : 'plan_denied',
                updated_at: new Date()
            });

        if (updatedCount === 0) {
            return NextResponse.json({
                error: 'Log not found or no update performed'
            }, { status: 404 });
        }

        // Fetch the updated log to return
        const updatedLog = await db('plan_log')
            .where('id', logId)
            .first();

        return NextResponse.json({
            message: `Log successfully updated to ${type}`,
            log: updatedLog
        });
    } catch (error) {
        console.error('Error updating plan log:', error);
        return NextResponse.json({
            error: 'Internal Server Error',
            details: error instanceof Error ? error.message : 'Unknown error'
        }, { status: 500 });
    }
}
