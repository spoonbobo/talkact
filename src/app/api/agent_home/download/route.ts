import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import fs from 'fs';
import path from 'path';

export async function GET(req: NextRequest) {
    try {
        // Check authentication
        const session = await getServerSession(authOptions);
        if (!session) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Get the file path from query parameters
        const { searchParams } = new URL(req.url);
        const filePath = searchParams.get('path');

        if (!filePath) {
            return NextResponse.json({ error: 'No file path provided' }, { status: 400 });
        }

        // Ensure the agent home path is set
        const agentHomePath = process.env.AGENT_HOME_PATH;
        console.log(agentHomePath);
        if (!agentHomePath) {
            return NextResponse.json({ error: 'AGENT_HOME_PATH not configured' }, { status: 500 });
        }

        // Resolve the full path, ensuring it stays within the agent_home directory
        const fullPath = path.resolve(agentHomePath, filePath);

        // Security check: ensure the path is within the agent_home directory
        console.log(fullPath, agentHomePath);
        if (!fullPath.startsWith(agentHomePath)) {
            return NextResponse.json({ error: 'Access denied: Path outside of allowed directory' }, { status: 403 });
        }

        // Check if file exists
        if (!fs.existsSync(fullPath)) {
            return NextResponse.json({ error: 'File not found' }, { status: 404 });
        }

        // Check if it's a file
        const stats = fs.statSync(fullPath);
        if (!stats.isFile()) {
            return NextResponse.json({ error: 'Not a file' }, { status: 400 });
        }

        // Read file
        const fileBuffer = fs.readFileSync(fullPath);

        // Get file name and extension for content-type
        const fileName = path.basename(fullPath);
        const ext = path.extname(fileName).toLowerCase();

        // Set appropriate content type based on file extension
        let contentType = 'application/octet-stream'; // Default
        if (ext === '.pdf') contentType = 'application/pdf';
        else if (ext === '.jpg' || ext === '.jpeg') contentType = 'image/jpeg';
        else if (ext === '.png') contentType = 'image/png';
        else if (ext === '.txt') contentType = 'text/plain';
        else if (ext === '.html') contentType = 'text/html';
        else if (ext === '.json') contentType = 'application/json';
        // Add more content types as needed

        // Create response with appropriate headers
        return new NextResponse(fileBuffer, {
            headers: {
                'Content-Disposition': `attachment; filename="${fileName}"`,
                'Content-Type': contentType,
                'Content-Length': stats.size.toString()
            }
        });
    } catch (error) {
        console.error('Error in file download:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
} 