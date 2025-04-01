import { NextResponse } from 'next/server';
import db from '@/lib/db';

export async function PUT(request: Request) {
    try {
        const body = await request.json();
        const { roomId, active_users } = body;

        if (!roomId) {
            return NextResponse.json({ error: 'Room ID is required' }, { status: 400 });
        }

        // Get the current room data
        const room = await db('chat_rooms').where({ id: roomId }).first();

        if (!room) {
            return NextResponse.json({ error: 'Room not found' }, { status: 404 });
        }

        // Update the active_users array
        const updatedActiveUsers = active_users || [];

        const [result] = await db('chat_rooms')
            .where({ id: roomId })
            .update({ active_users: updatedActiveUsers })
            .returning(['id', 'name', 'active_users']);

        return NextResponse.json({
            room_id: result.id,
            name: result.name,
            active_users: result.active_users
        }, { status: 200 });
    } catch (error) {
        console.error('Error updating chat room:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
