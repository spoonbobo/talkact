// /api/chat/get_rooms/route.ts
import { NextResponse } from 'next/server';
import db from '@/lib/db';

export async function GET() {
    try {
        // Get rooms from database
        const rooms = await db('chat_rooms').select('*');

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
            active_users: []
        }));

        return NextResponse.json(formattedRooms, { status: 200 });
    } catch (error) {
        console.error('Error fetching chat rooms:', error);
        return NextResponse.json({ error: 'Failed to fetch chat rooms' }, { status: 500 });
    }
}