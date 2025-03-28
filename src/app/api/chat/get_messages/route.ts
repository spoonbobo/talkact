import { NextResponse } from 'next/server';
import db from '@/lib/db';
import { IMessage } from '@/types/chat';

export async function GET(request: Request) {
    const url = new URL(request.url);
    const roomId = url.searchParams.get('roomId');

    if (!roomId) {
        return NextResponse.json({ error: 'Room ID is required' }, { status: 400 });
    }

    try {
        const messages: IMessage[] = await db('messages').where('room_id', roomId);
        return NextResponse.json(messages);
    } catch (error) {
        console.error('Error fetching messages:', error);
        return NextResponse.json({ error: 'Failed to fetch messages' }, { status: 500 });
    }
}

export async function POST(request: Request) {
    const { roomId, limit } = await request.json();

    if (!roomId) {
        return NextResponse.json({ error: 'Room ID is required' }, { status: 400 });
    }

    try {
        let query = db('messages').where('room_id', roomId).orderBy('created_at', 'desc');

        if (limit && typeof limit === 'number') {
            query = query.limit(limit);
        }

        const messages: IMessage[] = await query;
        return NextResponse.json(messages);
    } catch (error) {
        console.error('Error fetching messages:', error);
        return NextResponse.json({ error: 'Failed to fetch messages' }, { status: 500 });
    }
}
