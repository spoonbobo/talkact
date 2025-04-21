import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

// Define file/directory type
interface FileNode {
    name: string;
    type: 'file' | 'directory';
    path: string;
    extension?: string;
    children?: FileNode[];
}

/**
 * Recursively reads a directory and builds a file tree structure
 */
const readDirectoryRecursive = (dirPath: string, basePath: string = '/agent_home'): FileNode => {
    const relativePath = path.join(basePath, path.relative(process.env.AGENT_HOME_PATH || '/agent_home', dirPath));
    const name = path.basename(dirPath);

    const stats = fs.statSync(dirPath);

    if (stats.isFile()) {
        const extension = path.extname(dirPath).slice(1); // Remove the dot
        return {
            name,
            type: 'file',
            path: relativePath,
            extension
        };
    }

    if (stats.isDirectory()) {
        try {
            const items = fs.readdirSync(dirPath);
            const children = items.map(item => {
                const itemPath = path.join(dirPath, item);
                return readDirectoryRecursive(itemPath, basePath);
            });

            return {
                name,
                type: 'directory',
                path: relativePath,
                children
            };
        } catch (error) {
            console.error(`Error reading directory ${dirPath}:`, error);
            return {
                name,
                type: 'directory',
                path: relativePath,
                children: []
            };
        }
    }

    // Default fallback (shouldn't reach here)
    return {
        name,
        type: 'file',
        path: relativePath
    };
};

export async function GET(req: NextRequest) {
    try {
        // Check authentication
        const session = await getServerSession(authOptions);
        if (!session) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Get the requested path from query parameters
        const { searchParams } = new URL(req.url);
        const requestedPath = searchParams.get('path') || '';

        // Ensure the agent home path is set in environment variables
        const agentHomePath = process.env.AGENT_HOME_PATH;
        if (!agentHomePath) {
            return NextResponse.json({ error: 'AGENT_HOME_PATH not configured' }, { status: 500 });
        }

        // Resolve the full path, ensuring it stays within the agent_home directory
        const fullPath = path.resolve(agentHomePath, requestedPath);

        // Security check: ensure the path is within the agent_home directory
        if (!fullPath.startsWith(agentHomePath)) {
            return NextResponse.json({ error: 'Access denied: Path outside of allowed directory' }, { status: 403 });
        }

        // Check if path exists
        if (!fs.existsSync(fullPath)) {
            return NextResponse.json({ error: 'Path not found' }, { status: 404 });
        }

        // Get file stats
        const stats = fs.statSync(fullPath);

        let result;
        if (stats.isDirectory()) {
            // Read directory structure
            result = readDirectoryRecursive(fullPath);
        } else {
            // Return file info
            const name = path.basename(fullPath);
            const extension = path.extname(fullPath).slice(1);
            const relativePath = path.join('/agent_home', path.relative(agentHomePath, fullPath));

            result = {
                name,
                type: 'file',
                path: relativePath,
                extension
            };
        }

        return NextResponse.json(result);
    } catch (error) {
        console.error('Error in GET /api/agent_home/get_files:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
