// /api/chat/get_rooms/route.ts
import { NextResponse } from 'next/server';
import db from '@/lib/db';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export async function GET() {
    try {
        // Get the current user session
        const session = await getServerSession(authOptions);

        if (!session || !session.user?.email) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Get the current user from the database
        const user = await db('users')
            .where('email', session.user.email)
            .first();

        if (!user) {
            return NextResponse.json({ error: 'User not found' }, { status: 404 });
        }

        // Get all rooms
        let rooms = await db('chat_rooms').select('*');
        console.log(rooms);

        // If user has active_rooms, filter to only include those rooms
        if (user.active_rooms && user.active_rooms.length > 0) {
            rooms = rooms.filter(room => user.active_rooms.includes(room.id));
        }

        // Format rooms to match IChatRoom interface
        const formattedRooms = rooms.map(room => ({
            id: room.id,
            created_at: room.created_at,
            last_updated: room.last_updated,
            name: room.name,
            unread: room.unread,
            // Convert active_users from string array to User array
            // In the database, active_users is stored as string[]
            // For now, we'll return an empty array as we need to fetch actual user data
            active_users: room.active_users || []
        }));

        return NextResponse.json(formattedRooms, { status: 200 });
    } catch (error) {
        console.error('Error fetching chat rooms:', error);
        return NextResponse.json({ error: 'Failed to fetch chat rooms' }, { status: 500 });
    }
}

export async function POST(request: Request) {
    try {
        // Get the current user session
        const session = await getServerSession(authOptions);

        if (!session || !session.user?.email) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Parse the request body
        const body = await request.json();
        const { userIds } = body;

        if (!userIds || !Array.isArray(userIds) || userIds.length === 0) {
            return NextResponse.json({ error: 'Invalid user IDs provided' }, { status: 400 });
        }

        // Fetch user information for the provided user IDs
        const users = await db('users')
            .select([
                'id',
                'user_id',
                'email',
                'username',
                'avatar',
                'role',
                'created_at',
                'updated_at'
            ])
            .whereIn('user_id', userIds);

        return NextResponse.json({ users }, { status: 200 });
    } catch (error) {
        console.error('Error fetching user information:', error);
        return NextResponse.json({
            error: 'Failed to fetch user information',
            message: error instanceof Error ? error.message : 'Unknown error',
            stack: process.env.NODE_ENV === 'development' && error instanceof Error ? error.stack : undefined
        }, { status: 500 });
    }
}