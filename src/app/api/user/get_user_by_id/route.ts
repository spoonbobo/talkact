import { NextResponse } from 'next/server';
import db from '@/lib/db';

export async function GET(request: Request) {
    try {
        // Get user_id from URL params
        const url = new URL(request.url);
        const userId = url.searchParams.get('user_id');

        if (!userId) {
            return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
        }

        const user = await db('users').where({ user_id: userId }).first();

        if (!user) {
            return NextResponse.json({ exists: false }, { status: 404 });
        }

        // Return only necessary user information
        const userInfo = {
            id: user.id,
            name: user.username,
            email: user.email,
        };

        return NextResponse.json({ exists: true, user: userInfo }, { status: 200 });
    } catch (error) {
        console.error("Error fetching user by ID:", error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
} 