import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import fs from 'fs';
import path from 'path';
import { mkdir, writeFile } from 'fs/promises';

export async function POST(req: NextRequest) {
    try {
        // Check authentication
        const session = await getServerSession(authOptions);
        if (!session) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Get the form data with the file
        const formData = await req.formData();
        const file = formData.get('file') as File;
        const targetPath = formData.get('path') as string;

        if (!file) {
            return NextResponse.json({ error: 'No file provided' }, { status: 400 });
        }

        // Ensure the agent home path is set
        const agentHomePath = process.env.AGENT_HOME_PATH;
        if (!agentHomePath) {
            return NextResponse.json({ error: 'AGENT_HOME_PATH not configured' }, { status: 500 });
        }

        // Resolve the full path, ensuring it stays within the agent_home directory
        const fullTargetDir = path.resolve(agentHomePath, targetPath);

        // Security check: ensure the path is within the agent_home directory
        if (!fullTargetDir.startsWith(agentHomePath)) {
            return NextResponse.json({ error: 'Access denied: Path outside of allowed directory' }, { status: 403 });
        }

        // Create directory if it doesn't exist
        if (!fs.existsSync(fullTargetDir)) {
            await mkdir(fullTargetDir, { recursive: true });
        }

        // Get file buffer
        const bytes = await file.arrayBuffer();
        const buffer = Buffer.from(bytes);

        // Write file to disk
        const filePath = path.join(fullTargetDir, file.name);
        await writeFile(filePath, buffer);

        return NextResponse.json({
            success: true,
            file: {
                name: file.name,
                path: path.join(targetPath, file.name),
                size: file.size,
                type: file.type
            }
        });
    } catch (error) {
        console.error('Error in file upload:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
} 