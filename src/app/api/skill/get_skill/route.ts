import { NextResponse } from 'next/server';
import db from '@/lib/db';

export async function GET(request: Request) {
    try {
        // Get the skill ID from the URL query parameters
        const url = new URL(request.url);
        const id = url.searchParams.get('id');

        if (!id) {
            return NextResponse.json({
                error: 'Missing required query parameter: id'
            }, { status: 400 });
        }

        // Fetch the skill from the database
        const skill = await db('skill').where('id', id).first();

        if (!skill) {
            return NextResponse.json({
                error: 'Skill not found'
            }, { status: 404 });
        }

        // Parse args if it's a string
        let parsedArgs = null;
        if (skill.args) {
            try {
                // Try to parse if it's a string
                parsedArgs = typeof skill.args === 'string'
                    ? JSON.parse(skill.args)
                    : skill.args;
            } catch (e) {
                // If parsing fails, use as is
                parsedArgs = skill.args;
            }
        }

        const formattedSkill = {
            ...skill,
            args: parsedArgs
        };

        console.log("Formatted skill:", formattedSkill);

        return NextResponse.json({
            skill: formattedSkill
        }, { status: 200 });
    } catch (error) {
        console.error('Error fetching skill:', error);
        return NextResponse.json({
            error: 'Internal Server Error',
            details: error instanceof Error ? error.message : 'Unknown error'
        }, { status: 500 });
    }
}
