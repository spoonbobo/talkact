import { NextResponse } from 'next/server';
import db from '@/lib/db';
import { v4 as uuidv4 } from 'uuid';
import { IPlan } from '@/types/plan';

export async function POST(request: Request) {
    try {
        const body = await request.json();

        // Extract data from the request body
        const { plan_name, plan_overview, plan: IPlan } = body;

        // Validate required fields
        if (!plan_overview) {
            return NextResponse.json({
                error: 'Missing required field: plan_overview'
            }, { status: 400 });
        }

        // Use client-provided IDs if available, otherwise generate them
        const plan_id = body.plan_id || uuidv4();
        const id = body.id || uuidv4();

        // Require user IDs instead of providing defaults
        if (!body.assigner) {
            return NextResponse.json({
                error: 'Missing required field: assigner'
            }, { status: 400 });
        }

        if (!body.assignee) {
            return NextResponse.json({
                error: 'Missing required field: assignee'
            }, { status: 400 });
        }

        // Check if this is a no-tools plan that should be auto-completed
        const noToolsNeeded = body.no_tools_needed === true;

        // Set status and progress based on whether tools are needed
        const status = noToolsNeeded ? 'success' : 'pending';
        const progress = noToolsNeeded ? 100 : 0;
        const completed_at = noToolsNeeded ? new Date() : null;

        console.log('completed_at', completed_at)

        // Prepare plan data according to IPlan interface
        const planData = {
            id: id,
            plan_id: plan_id,
            created_at: new Date(),
            updated_at: new Date(),
            completed_at: completed_at,
            plan_name: plan_name,
            plan_overview: plan_overview,
            status: status,
            progress: progress,
            room_id: body.room_id || uuidv4(), // Generate a room_id if not provided
            assigner: body.assigner,
            assignee: body.assignee,
            reviewer: body.reviewer || null,
            logs: JSON.stringify(body.logs),
            context: body.context ? JSON.stringify(body.context) : null
        };

        // Insert plan into database
        const [insertedPlan] = await db('plan').insert(planData).returning('*');

        // Format the response
        const formattedPlan = {
            ...insertedPlan,
            logs: typeof insertedPlan.logs === 'string' ?
                JSON.parse(insertedPlan.logs) :
                insertedPlan.logs || {},
            context: typeof insertedPlan.context === 'string' ?
                JSON.parse(insertedPlan.context) :
                insertedPlan.context
        };

        return NextResponse.json({
            message: 'Plan created successfully',
            plan: formattedPlan
        }, { status: 201 });
    } catch (error) {
        console.error('Error creating plan:', error);
        return NextResponse.json({
            error: 'Internal Server Error',
            details: error instanceof Error ? error.message : 'Unknown error'
        }, { status: 500 });
    }
}
