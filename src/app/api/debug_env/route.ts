import { NextResponse } from 'next/server';
import db from '@/lib/db';

export async function GET() {
    try {

        console.log(process.env);
        console.log(db);
        return NextResponse.json({ env: process.env });
    } catch (error) {
        console.error('Error connecting to database:', error);
        return NextResponse.json(
            { error: 'Database connection failed' },
            { status: 500 }
        );
    }
}
