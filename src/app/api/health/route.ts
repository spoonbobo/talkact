import { NextResponse } from 'next/server';

export async function GET() {
    try {
        return NextResponse.json({ message: "Hello from onlysaid!" });
    } catch (error) {
        console.error('Error connecting to database:', error);
        return NextResponse.json(
            { error: 'Database connection failed' },
            { status: 500 }
        );
    }
}
