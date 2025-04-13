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

        // Fetch repository data from GitHub API with auth headers
        const response = await fetch(
            'https://api.github.com/repos/spoonbobo/onlysaid',
            { headers }
        );

        if (!response.ok) {
            throw new Error(`GitHub API responded with status: ${response.status}`);
        }

        const repoData = await response.json();

        // Extract the stats we're interested in
        const stats = {
            stars: repoData.stargazers_count,
            forks: repoData.forks_count,
            watchers: repoData.watchers_count,
            open_issues: repoData.open_issues_count,
            subscribers: repoData.subscribers_count
        };

        console.log("Fetched GitHub stats:", stats);

        // Return the stats data
        return NextResponse.json(stats);
    } catch (error) {
        console.error('Error fetching GitHub stats:', error);
        return NextResponse.json(
            { error: 'Failed to load GitHub stats', message: (error as Error).message },
            { status: 500 }
        );
    }
}
