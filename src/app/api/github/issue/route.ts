import { NextResponse } from 'next/server';
import { GitHubIssue } from '@/types/github';

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

        // Fetch issues from GitHub API with auth headers
        const response = await fetch(
            'https://api.github.com/repos/spoonbobo/onlysaid/issues?state=all&per_page=100',
            { headers }
        );

        if (!response.ok) {
            throw new Error(`GitHub API responded with status: ${response.status}`);
        }

        const issues = await response.json();

        // Log the response for debugging
        console.log(`Fetched ${issues.length} issues from GitHub`);

        // Process the issues to count by label and state
        const counts = {
            bugs: {
                open: 0,
                closed: 0
            },
            enhancements: {
                open: 0,
                closed: 0
            },
            announcements: {
                open: 0,
                closed: 0
            }
        };

        // Count issues by label and state
        issues.forEach((issue: GitHubIssue) => {
            const isBug = issue.labels.some((label: { name: string }) =>
                label.name.toLowerCase() === 'bug');
            const isEnhancement = issue.labels.some((label: { name: string }) =>
                label.name.toLowerCase() === 'enhancement');
            const isAnnouncement = issue.labels.some((label: { name: string }) =>
                label.name.toLowerCase() === 'announcement');

            if (isBug) {
                if (issue.state === 'open') counts.bugs.open++;
                else counts.bugs.closed++;
            }

            if (isEnhancement) {
                if (issue.state === 'open') counts.enhancements.open++;
                else counts.enhancements.closed++;
            }

            if (isAnnouncement) {
                if (issue.state === 'open') counts.announcements.open++;
                else counts.announcements.closed++;
            }
        });

        console.log("Calculated counts:", counts);

        // Return the issues data and counts
        return NextResponse.json({
            issues,
            counts
        });
    } catch (error) {
        console.error('Error fetching GitHub issues:', error);
        return NextResponse.json(
            { error: 'Failed to load GitHub issues', message: (error as Error).message },
            { status: 500 }
        );
    }
} 