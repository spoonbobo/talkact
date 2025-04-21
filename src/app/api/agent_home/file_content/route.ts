import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import fs from 'fs';
import path from 'path';

// List of text-based file extensions
const textFileExtensions = [
    '.txt', '.md', '.js', '.jsx', '.ts', '.tsx', '.html', '.css',
    '.json', '.yml', '.yaml', '.xml', '.csv', '.py', '.java',
    '.c', '.cpp', '.h', '.php', '.rb', '.sh', '.bat', '.log'
];

// List of supported image file extensions
const imageFileExtensions = [
    '.jpg', '.jpeg', '.png', '.gif', '.bmp', '.webp', '.svg'
];

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
        if (!agentHomePath) {
            return NextResponse.json({ error: 'AGENT_HOME_PATH not configured' }, { status: 500 });
        }

        // Resolve the full path, ensuring it stays within the agent_home directory
        const fullPath = path.resolve(agentHomePath, filePath);

        // Security check: ensure the path is within the agent_home directory
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

        // Get file extension
        const ext = path.extname(fullPath).toLowerCase();

        // Check if it's a text file or an image file
        if (textFileExtensions.includes(ext)) {
            // Read file content (with size limit for safety)
            const MAX_SIZE = 1024 * 1024; // 1MB limit
            if (stats.size > MAX_SIZE) {
                return NextResponse.json({
                    error: 'File too large',
                    message: 'File is too large to preview'
                }, { status: 400 });
            }

            const content = fs.readFileSync(fullPath, 'utf8');

            return NextResponse.json({
                content,
                name: path.basename(fullPath),
                extension: ext.slice(1), // Remove the dot
                size: stats.size,
                lastModified: stats.mtime,
                type: 'text'
            });
        } else if (imageFileExtensions.includes(ext)) {
            // Handle image files
            const MAX_IMAGE_SIZE = 5 * 1024 * 1024; // 5MB limit for images
            if (stats.size > MAX_IMAGE_SIZE) {
                return NextResponse.json({
                    error: 'File too large',
                    message: 'Image is too large to preview'
                }, { status: 400 });
            }

            // Read image as base64
            const imageBuffer = fs.readFileSync(fullPath);
            const base64Image = imageBuffer.toString('base64');
            const mimeType = `image/${ext === '.jpg' ? 'jpeg' : ext.slice(1)}`;

            return NextResponse.json({
                content: `data:${mimeType};base64,${base64Image}`,
                name: path.basename(fullPath),
                extension: ext.slice(1),
                size: stats.size,
                lastModified: stats.mtime,
                type: 'image'
            });
        } else {
            return NextResponse.json({
                error: 'Unsupported file type',
                message: 'This file type cannot be previewed'
            }, { status: 400 });
        }
    } catch (error) {
        console.error('Error in file content retrieval:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
} 