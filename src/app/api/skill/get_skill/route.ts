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

export async function POST(request: Request) {
    try {
        // Parse the request body to get an array of skill IDs
        const body = await request.json();
        const { ids } = body;

        if (!ids || !Array.isArray(ids) || ids.length === 0) {
            return NextResponse.json({
                error: 'Request body must include a non-empty array of skill IDs'
            }, { status: 400 });
        }

        // Fetch multiple skills from the database
        const skills = await db('skill').whereIn('id', ids);

        if (skills.length === 0) {
            return NextResponse.json({
                error: 'No skills found with the provided IDs'
            }, { status: 404 });
        }

        // Process each skill to handle args parsing
        const formattedSkills = skills.map(skill => {
            let parsedArgs = null;
            if (skill.args) {
                try {
                    parsedArgs = typeof skill.args === 'string'
                        ? JSON.parse(skill.args)
                        : skill.args;
                } catch (e) {
                    parsedArgs = skill.args;
                }
            }

            return {
                ...skill,
                args: parsedArgs
            };
        });

        return NextResponse.json({
            skills: formattedSkills
        }, { status: 200 });
    } catch (error) {
        console.error('Error fetching multiple skills:', error);
        return NextResponse.json({
            error: 'Internal Server Error',
            details: error instanceof Error ? error.message : 'Unknown error'
        }, { status: 500 });
    }
}
