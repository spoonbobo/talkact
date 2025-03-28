import { NextResponse } from 'next/server';
import db from '@/lib/db';
import { IMessage } from '@/types/chat';

const randomUserId = "550e8400-e29b-41d4-a716-446655440000";

export async function POST(request: Request) {
    try {
        const message: IMessage = await request.json();
        await db('messages').insert({
            id: message.id,
            created_at: message.created_at,
            sender: randomUserId, // TODO: replace with real user id
            content: message.content,
            avatar: message.avatar,
            room_id: message.room_id
        });

        return NextResponse.json({ success: true }, { status: 200 });
    } catch (error) {
        // console.error('Error inserting message:', error);
        return NextResponse.json({
            error: 'Internal Server Error',
            details: error instanceof Error ? error.message : 'Unknown error'
        }, { status: 500 });
    }
}