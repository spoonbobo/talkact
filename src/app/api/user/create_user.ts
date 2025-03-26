import { NextResponse } from 'next/server';
import db from '@/lib/db';
import { User } from '@/types/user';

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { username, email, avatar } = body;

        if (!username || !email) {
            return NextResponse.json({ error: 'Username and email are required' }, { status: 400 });
        }

        const existingUser = await db('users').where({ email }).first();
        if (existingUser) {
            return NextResponse.json({ error: 'User already exists' }, { status: 409 });
        }

        const user: User = {
            id: 0,
            username,
            email,
            avatar: avatar || '/default-avatar.png',
            created_at: new Date(),
            updated_at: new Date(),
            active_rooms: [],
            archived_rooms: []
        }

        const [newUser] = await db('users')
            .insert(user)
            .returning(['id', 'username', 'email', 'avatar', 'created_at']);

        return NextResponse.json(newUser, { status: 201 });
    } catch (error) {
        console.error('Error creating user:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}