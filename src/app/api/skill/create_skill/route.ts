import { NextResponse } from 'next/server';
import db from '@/lib/db';
import { v4 as uuidv4 } from 'uuid';

export async function POST(request: Request) {
    try {
        const body = await request.json();

        // Extract required fields from the request body
        const {
            name,
            mcp_server,
            description,
            type,
            args
        } = body;

        // Validate required fields
        if (!name) {
            return NextResponse.json({
                error: 'Missing required field: name'
            }, { status: 400 });
        }

        // Prepare skill data
        const skillData = {
            id: uuidv4(),
            created_at: new Date(),
            updated_at: new Date(),
            name,
            mcp_server: mcp_server || null,
            description: description || null,
            type: type || null,
            args: args ? JSON.stringify(args) : null
        };

        // Insert skill into database
        const [insertedSkill] = await db('skill').insert(skillData).returning('*');

        // Format the response - parse args if it's a string
        let parsedArgs = null;
        if (insertedSkill.args) {
            try {
                // Try to parse if it's a string
                parsedArgs = typeof insertedSkill.args === 'string'
                    ? JSON.parse(insertedSkill.args)
                    : insertedSkill.args;
            } catch (e) {
                // If parsing fails, use as is
                parsedArgs = insertedSkill.args;
            }
        }

        const formattedSkill = {
            ...insertedSkill,
            args: parsedArgs
        };

        return NextResponse.json({
            message: 'Skill created successfully',
            skill: formattedSkill
        }, { status: 201 });
    } catch (error) {
        console.error('Error creating skill:', error);
        return NextResponse.json({
            error: 'Internal Server Error',
            details: error instanceof Error ? error.message : 'Unknown error'
        }, { status: 500 });
    }
} 