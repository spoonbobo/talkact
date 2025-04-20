import { NextResponse } from 'next/server';
import db from '@/lib/db';
import { v4 as uuidv4 } from 'uuid';
import { Log } from '@/types/plan';

export async function POST(request: Request) {
    try {
        const body = await request.json();

        // Extract data from the request body
        const { type, plan_id, task_id, skill_id, content } = body;

        console.log('Received body:', body);

        // Validate required fields
        if (!type) {
            console.error('Missing required field: type');
            return NextResponse.json({
                error: 'Missing required field: type'
            }, { status: 400 });
        }

        if (!content) {
            console.error('Missing required field: content');
            return NextResponse.json({
                error: 'Missing required field: content'
            }, { status: 400 });
        }

        // At least one of plan_id or task_id should be provided
        if (!plan_id && !task_id) {
            console.error('At least one of plan_id or task_id must be provided');
            return NextResponse.json({
                error: 'At least one of plan_id or task_id must be provided'
            }, { status: 400 });
        }

        // Use client-provided ID if available, otherwise generate one
        const id = body.id || uuidv4();

        // Prepare log data according to Log interface
        const logData = {
            id,
            created_at: new Date(),
            type,
            plan_id: plan_id || null,
            task_id: task_id || null,
            skill_id: skill_id || null,
            content
        };

        // Insert log into database
        const [insertedLog] = await db('plan_log').insert(logData).returning('*');

        return NextResponse.json({
            message: 'Plan log created successfully',
            log: insertedLog
        }, { status: 201 });
    } catch (error) {
        console.error('Error creating plan log:', error);
        return NextResponse.json({
            error: 'Internal Server Error',
            details: error instanceof Error ? error.message : 'Unknown error'
        }, { status: 500 });
    }
}
