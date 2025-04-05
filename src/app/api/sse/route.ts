import { NextRequest, NextResponse } from 'next/server';
import { getSSEManager } from '@/lib/sse-manager';

export async function GET(request: NextRequest) {
    const planId = request.nextUrl.searchParams.get('planId');

    if (!planId) {
        return NextResponse.json({ error: 'Missing planId parameter' }, { status: 400 });
    }

    // Create a new ReadableStream with a controller we can use to send events
    const stream = new ReadableStream({
        start(controller) {
            // Store the controller so we can use it to send events
            (response as any).controller = controller;

            // Add this client to our SSE manager
            const sseManager = getSSEManager();
            sseManager.addClient(planId, response);

            // Send initial connection established event
            const initialEvent = `event: CONNECTED\ndata: {"message": "Connection established"}\n\n`;
            controller.enqueue(new TextEncoder().encode(initialEvent));

            // Handle client disconnection
            request.signal.addEventListener('abort', () => {
                sseManager.removeClient(planId, response);
                controller.close();
            });
        }
    });

    // Create and return the response
    const response = new Response(stream, {
        headers: {
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache',
            'Connection': 'keep-alive'
        }
    });

    return response;
} 