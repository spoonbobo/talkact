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
        const limitParam = searchParams.get('limit');
        const pageParam = searchParams.get('page');
        const statusParam = searchParams.get('status');
        const roomIdParam = searchParams.get('roomId'); // Add support for roomId parameter

        // Convert parameters to appropriate types
        const limit = limitParam ? parseInt(limitParam, 10) : undefined;
        const page = pageParam ? parseInt(pageParam, 10) : 1;
        const status = statusParam && statusParam !== 'all' ? statusParam : undefined;
        const roomId = roomIdParam || undefined;

        // Validate limit is a positive number if provided
        if (limit !== undefined && (isNaN(limit) || limit <= 0)) {
            return NextResponse.json({
                error: 'Invalid limit parameter. Must be a positive number.'
            }, { status: 400 });
        }

        // Validate page is a positive number
        if (isNaN(page) || page <= 0) {
            return NextResponse.json({
                error: 'Invalid page parameter. Must be a positive number.'
            }, { status: 400 });
        }

        // Get total count for pagination
        let countQuery = db('plan');
        if (status) {
            countQuery = countQuery.where('status', status);
        }

        // Apply room_id filter to count query if provided
        if (roomId) {
            countQuery = countQuery.where('room_id', roomId);
        }

        const [{ count }] = await countQuery.count('* as count');
        const totalCount = parseInt(count as string, 10);

        // Build main query with order by
        let query = db('plan').orderBy('updated_at', 'desc');

        // Apply status filter if provided
        if (status) {
            query = query.where('status', status);
        }

        // Apply room_id filter if provided
        if (roomId) {
            query = query.where('room_id', roomId);
        }

        // Apply pagination
        const offset = (page - 1) * (limit || 10);
        if (limit !== undefined) {
            query = query.limit(limit);
        }
        query = query.offset(offset);

        // Execute query
        const plans = await query;

        // Ensure plans is an array
        if (!Array.isArray(plans)) {
            console.error('Expected plans to be an array but got:', typeof plans);
            return NextResponse.json([], { status: 200 });
        }

        // Parse JSON strings back to objects
        const formattedPlans = plans.map((plan: any) => {
            const context = tryParseJSON(plan.context);

            return {
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
        });

        return NextResponse.json(formattedPlans, { status: 200 });
    } catch (error) {
        console.error('Error fetching plans:', error);
        return NextResponse.json({
            error: 'Internal Server Error',
            details: error instanceof Error ? error.message : 'Unknown error'
        }, { status: 500 });
    }
}
