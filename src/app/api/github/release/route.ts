import { NextResponse } from 'next/server';

export async function GET() {
    try {
        // Use authentication token for GitHub API
        const headers: HeadersInit = {
            'Accept': 'application/vnd.github.v3+json',
        };

        // Add authorization header if token exists
        if (process.env.GITHUB_ACCESS_TOKEN) {
            headers['Authorization'] = `token ${process.env.GITHUB_ACCESS_TOKEN}`;
        }

        // Fetch releases from GitHub API with auth headers
        const response = await fetch(
            'https://api.github.com/repos/spoonbobo/onlysaid/releases',
            { headers }
        );

        if (!response.ok) {
            throw new Error(`GitHub API responded with status: ${response.status}`);
        }

        const releases = await response.json();

        // Return the releases data as JSON
        return NextResponse.json(releases);
    } catch (error) {
        console.error('Error fetching GitHub releases:', error);
        return NextResponse.json(
            { error: 'Failed to load GitHub releases', message: (error as Error).message },
            { status: 500 }
        );
    }
}
