import { NextResponse } from 'next/server';
import db from '@/lib/db';

// Helper function to safely parse JSON
function tryParseJSON(jsonString: string | null | undefined) {
    if (!jsonString) return null;
    try {
        return typeof jsonString === 'string' ? JSON.parse(jsonString) : jsonString;
    } catch (e) {
        console.error('Error parsing JSON:', e);
        return null;
    }
}

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const id = searchParams.get('id');

        if (!id) {
            return NextResponse.json({
                error: 'Missing required parameter: id'
            }, { status: 400 });
        }

        // Query the database for the plan with the given id
        const plan = await db('plan').where('id', id).first();
        console.log("Plan:", plan);

        if (!plan) {
            return NextResponse.json({
                error: 'Plan not found'
            }, { status: 404 });
        }

        // Format the plan data
        const context = tryParseJSON(plan.context);

        const formattedPlan = {
            id: plan.id,
            plan_id: plan.plan_id,
            room_id: plan.room_id || (context && context.room_id) || null,
            created_at: plan.created_at,
            updated_at: plan.updated_at,
            completed_at: plan.completed_at,
            plan_name: plan.plan_name,
            plan_overview: plan.plan_overview,
            status: plan.status,
            progress: plan.progress,
            logs: tryParseJSON(plan.logs),
            context: context,
            assigner: plan.assigner || null,
            assignee: plan.assignee || null,
            reviewer: plan.reviewer || null
        };

        return NextResponse.json(formattedPlan, { status: 200 });
    } catch (error) {
        console.error('Error fetching plan by ID:', error);
        return NextResponse.json({
            error: 'Internal Server Error',
            details: error instanceof Error ? error.message : 'Unknown error'
        }, { status: 500 });
    }
}
