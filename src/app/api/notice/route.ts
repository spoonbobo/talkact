import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import yaml from 'js-yaml';

export async function GET() {
    try {
        // Read the notice.yaml file
        const filePath = path.join(process.cwd(), 'notice.yaml');
        const fileContents = fs.readFileSync(filePath, 'utf8');

        // Parse YAML to JSON
        const data = yaml.load(fileContents);

        // Return the data as JSON
        return NextResponse.json(data);
    } catch (error) {
        console.error('Error reading notice file:', error);
        return NextResponse.json(
            { error: 'Failed to load notice data' },
            { status: 500 }
        );
    }
} 