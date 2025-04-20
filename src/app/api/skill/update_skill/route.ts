import { NextResponse } from 'next/server';
import db from '@/lib/db';

export async function POST(request: Request) {
    try {
        // Parse the request body
        const body = await request.json();
        const { skillId, skill } = body;

        if (!skillId) {
            return NextResponse.json({
                error: 'Missing required parameter: skillId'
            }, { status: 400 });
        }

        if (!skill) {
            return NextResponse.json({
                error: 'Missing required parameter: skill'
            }, { status: 400 });
        }

        // Check if the skill exists
        const existingSkill = await db('skill').where('id', skillId).first();
        if (!existingSkill) {
            return NextResponse.json({
                error: 'Skill not found'
            }, { status: 404 });
        }

        // Prepare the update data
        const updateData: Record<string, any> = {};

        // Update basic fields if provided
        if (skill.name) updateData.name = skill.name;
        if (skill.description !== undefined) updateData.description = skill.description;
        if (skill.type) updateData.type = skill.type;
        if (skill.mcp_server) updateData.mcp_server = skill.mcp_server;

        // Handle args - ensure it's stored as a JSON string in the database
        if (skill.args) {
            // Convert args to string if it's an object
            updateData.args = typeof skill.args === 'string'
                ? skill.args
                : JSON.stringify(skill.args);
        }

        // Add updated_at timestamp
        updateData.updated_at = new Date().toISOString();

        // Update the skill in the database
        await db('skill')
            .where('id', skillId)
            .update(updateData);

        // Fetch the updated skill
        const updatedSkill = await db('skill').where('id', skillId).first();

        // Parse args for the response
        let parsedArgs = null;
        if (updatedSkill.args) {
            try {
                parsedArgs = typeof updatedSkill.args === 'string'
                    ? JSON.parse(updatedSkill.args)
                    : updatedSkill.args;
            } catch (e) {
                parsedArgs = updatedSkill.args;
            }
        }

        const formattedSkill = {
            ...updatedSkill,
            args: parsedArgs
        };

        console.log("Updated skill:", formattedSkill);

        return NextResponse.json({
            success: true,
            skill: formattedSkill
        }, { status: 200 });
    } catch (error) {
        console.error('Error updating skill:', error);
        return NextResponse.json({
            error: 'Internal Server Error',
            details: error instanceof Error ? error.message : 'Unknown error'
        }, { status: 500 });
    }
}
