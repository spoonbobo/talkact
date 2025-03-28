import { NextResponse } from 'next/server';
import db from '@/lib/db'; // knex
import { User } from '@/types/user';
// import bcrypt from 'bcrypt'; // TODO: encrypt password

export async function POST(request: Request) {
    try {
        const userData: User = await request.json();

        // Generate a username if not provided (using email prefix)
        if (!userData.username) {
            userData.username = userData.email.split('@')[0];
        }

        // Hash the password
        // if (userData.password) {
        //     const saltRounds = 10;
        //     userData.password = await bcrypt.hash(userData.password, saltRounds);
        // }

        // Prepare user data for insertion
        const userToInsert = {
            user_id: userData.user_id,
            email: userData.email,
            username: userData.username,
            password: userData.password,
            avatar: userData.avatar || null,
            created_at: userData.created_at || new Date(),
            updated_at: userData.updated_at || new Date(),
            active_rooms: userData.active_rooms || [],
            archived_rooms: userData.archived_rooms || []
        };

        // Insert the user using Knex
        const [newUser] = await db('users')
            .insert(userToInsert)
            .returning(['id', 'user_id', 'email', 'username', 'avatar', 'created_at', 'updated_at']);

        return NextResponse.json({
            message: 'User created successfully',
            user: newUser
        }, { status: 201 });
    } catch (error) {
        console.error('Unhandled error in create_user route:', error);

        // Check for duplicate key violations (username or email already exists)
        if (error instanceof Error) {
            const errorMsg = error.message.toLowerCase();

            if (errorMsg.includes('duplicate') || errorMsg.includes('unique constraint')) {
                if (errorMsg.includes('email')) {
                    return NextResponse.json({
                        error: 'Email already in use',
                        message: 'This email address is already registered'
                    }, { status: 409 });
                }
                if (errorMsg.includes('username')) {
                    return NextResponse.json({
                        error: 'Username already taken',
                        message: 'This username is already taken'
                    }, { status: 409 });
                }
                return NextResponse.json({
                    error: 'Duplicate entry',
                    message: 'A user with this information already exists'
                }, { status: 409 });
            }
        }

        // Return a more detailed error for debugging
        return NextResponse.json({
            error: 'Internal Server Error',
            message: error instanceof Error ? error.message : 'Unknown error',
            stack: process.env.NODE_ENV === 'development' && error instanceof Error ? error.stack : undefined
        }, { status: 500 });
    }
}