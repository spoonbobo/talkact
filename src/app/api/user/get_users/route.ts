import { NextResponse } from 'next/server';
import db from '@/lib/db'; // knex

export async function GET(request: Request) {
    try {
        // Get query parameters
        const url = new URL(request.url);
        const limit = parseInt(url.searchParams.get('limit') || '50');
        const offset = parseInt(url.searchParams.get('offset') || '0');
        const search = url.searchParams.get('search') || '';
        const role = url.searchParams.get('role') || '';

        // Base query
        let query = db('users').select([
            'id',
            'user_id',
            'email',
            'username',
            'avatar',
            'role',
            'created_at',
            'updated_at'
        ]);

        // Add search functionality if search parameter is provided
        if (search) {
            query = query.where(builder => {
                builder
                    .whereILike('username', `%${search}%`)
                    .orWhereILike('email', `%${search}%`);
            });
        }

        // Add role filtering if role parameter is provided
        if (role) {
            query = query.where('role', role);
        }

        // Get total count for pagination
        const [{ count }] = await db('users')
            .count('id as count')
            .modify(builder => {
                if (search) {
                    builder.where(subBuilder => {
                        subBuilder
                            .whereILike('username', `%${search}%`)
                            .orWhereILike('email', `%${search}%`);
                    });
                }
                if (role) {
                    builder.where('role', role);
                }
            });

        // Apply pagination
        const users = await query
            .orderBy('created_at', 'desc')
            .limit(limit)
            .offset(offset);

        return NextResponse.json({
            users,
            pagination: {
                total: parseInt(count as string),
                limit,
                offset
            }
        });
    } catch (error) {
        console.error('Error fetching users:', error);

        return NextResponse.json({
            error: 'Internal Server Error',
            message: error instanceof Error ? error.message : 'Unknown error',
            stack: process.env.NODE_ENV === 'development' && error instanceof Error ? error.stack : undefined
        }, { status: 500 });
    }
}

// Add a new POST method to handle filtering by user_ids
export async function POST(request: Request) {
    try {
        const body = await request.json();

        // Get parameters from request body
        const limit = body.limit || 50;
        const offset = body.offset || 0;
        const search = body.search || '';
        const role = body.role || '';
        const userIds = body.user_ids || [];

        // Base query
        let query = db('users').select([
            'id',
            'user_id',
            'email',
            'username',
            'avatar',
            'role',
            'created_at',
            'updated_at'
        ]);

        // Add search functionality if search parameter is provided
        if (search) {
            query = query.where(builder => {
                builder
                    .whereILike('username', `%${search}%`)
                    .orWhereILike('email', `%${search}%`);
            });
        }

        // Add role filtering if role parameter is provided
        if (role) {
            query = query.where('role', role);
        }

        // Add user_ids filtering if user_ids array is provided
        if (userIds.length > 0) {
            query = query.whereIn('user_id', userIds);
        }

        // Get total count for pagination
        const [{ count }] = await db('users')
            .count('id as count')
            .modify(builder => {
                if (search) {
                    builder.where(subBuilder => {
                        subBuilder
                            .whereILike('username', `%${search}%`)
                            .orWhereILike('email', `%${search}%`);
                    });
                }
                if (role) {
                    builder.where('role', role);
                }
                if (userIds.length > 0) {
                    builder.whereIn('user_id', userIds);
                }
            });

        // Apply pagination
        const users = await query
            .orderBy('created_at', 'desc')
            .limit(limit)
            .offset(offset);

        return NextResponse.json({
            users,
            pagination: {
                total: parseInt(count as string),
                limit,
                offset
            }
        });
    } catch (error) {
        console.error('Error fetching users:', error);

        return NextResponse.json({
            error: 'Internal Server Error',
            message: error instanceof Error ? error.message : 'Unknown error',
            stack: process.env.NODE_ENV === 'development' && error instanceof Error ? error.stack : undefined
        }, { status: 500 });
    }
}