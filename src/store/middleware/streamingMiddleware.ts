import { Middleware } from 'redux';
import {
    startStreaming,
    stopStreaming,
    updateMessage,
    setStreamingState,
    addMessage,
    resumeGeneration
} from '../features/assistantSlice';
import { toaster } from "@/components/ui/toaster";
import { v4 as uuidv4 } from 'uuid';
import { IMessage } from '@/types/chat';

// Add this interface near the top of the file
interface StreamSession {
    sessionId: string;
    serverSessionId?: string | null;
    content: string;
    isComplete: boolean;
    tabSwitched?: boolean;
    lastContent?: string;
    lastUpdated?: number;
    query?: string;
    conversationHistory?: string;
    locale?: string;
    currentRoute?: string;
    isStreaming?: boolean;
}

// Update the saveSession function with proper typing
export const saveSession = (messageId: string, session: Partial<StreamSession>) => {
    try {
        const sessions = JSON.parse(localStorage.getItem('activeStreamSessions') || '{}');
        sessions[messageId] = {
            ...session,
            lastUpdated: Date.now(),
            currentRoute: window.location.pathname,
            isStreaming: session.isStreaming !== undefined ? session.isStreaming : false
        };
        localStorage.setItem('activeStreamSessions', JSON.stringify(sessions));
        debugLog('Saved session to localStorage:', messageId);
    } catch (e) {
        console.error('Error saving session to localStorage:', e);
    }
};

// Update getSession function to return the correct type
export const getSession = (messageId: string): StreamSession | null => {
    try {
        const sessions = JSON.parse(localStorage.getItem('activeStreamSessions') || '{}');
        return sessions[messageId] as StreamSession || null;
    } catch (e) {
        console.error('Error getting session from localStorage:', e);
        return null;
    }
};

// Update getAllSessions function
const getAllSessions = (): Record<string, StreamSession> => {
    try {
        return JSON.parse(localStorage.getItem('activeStreamSessions') || '{}');
    } catch (e) {
        console.error('Error getting all sessions from localStorage:', e);
        return {};
    }
};

const removeSession = (messageId: string) => {
    try {
        const sessions = JSON.parse(localStorage.getItem('activeStreamSessions') || '{}');
        delete sessions[messageId];
        localStorage.setItem('activeStreamSessions', JSON.stringify(sessions));
        debugLog('Removed session from localStorage:', messageId);
    } catch (e) {
        console.error('Error removing session from localStorage:', e);
    }
};

// Clean up old sessions (older than 30 minutes)
const cleanupOldSessions = () => {
    try {
        const sessions = JSON.parse(localStorage.getItem('activeStreamSessions') || '{}');
        const now = Date.now();
        let changed = false;

        Object.keys(sessions).forEach(messageId => {
            const session = sessions[messageId];
            if (session.isComplete || (now - session.lastUpdated > 30 * 60 * 1000)) {
                delete sessions[messageId];
                changed = true;
                debugLog('Cleaned up old session:', messageId);
            }
        });

        if (changed) {
            localStorage.setItem('activeStreamSessions', JSON.stringify(sessions));
        }
    } catch (e) {
        console.error('Error cleaning up old sessions:', e);
    }
};

let debugMode = true; // Enable debug logging

export function debugLog(...args: any[]) {
    if (debugMode) {
        console.log('[StreamMiddleware]', ...args);
    }
}

// Add this function to the middleware file
export const getActiveStreamingSession = () => {
    try {
        const sessions = JSON.parse(localStorage.getItem('activeStreamSessions') || '{}');
        // Find the first active session that isn't complete
        const activeSession = Object.entries(sessions).find(([_, session]: [string, any]) =>
            session && !session.isComplete
        );

        return activeSession ? { messageId: activeSession[0], session: activeSession[1] } : null;
    } catch (e) {
        console.error('Error getting active streaming session:', e);
        return null;
    }
};

// Update the checkAndReconnectStreams function
const checkAndReconnectStreams = (storeRef: any) => {
    cleanupOldSessions();

    const sessions = getAllSessions();
    const sessionCount = Object.keys(sessions).length;
    debugLog('Checking for active streams to reconnect...', sessionCount);

    if (sessionCount > 0) {
        // Find any active streaming session
        for (const [messageId, session] of Object.entries(sessions)) {
            debugLog('Session found:', messageId, session);

            if (!session || typeof session !== 'object') continue;

            if (!session.isComplete) {
                debugLog(`Found incomplete session: ${messageId}`);

                // First, restore the content we have so far
                const updatedMessage = {
                    id: messageId,
                    content: session.content || '',
                    created_at: new Date().toISOString(),
                    sender: {
                        id: 'assistant-id',
                        user_id: 'assistant-id',
                        username: 'AI Assistant',
                        email: '',
                        created_at: new Date().toISOString(),
                        updated_at: new Date().toISOString(),
                        active_rooms: [],
                        archived_rooms: [],
                        role: 'assistant'
                    },
                    avatar: '',
                    room_id: ''
                };

                // Safely dispatch after a small delay
                setTimeout(() => {
                    storeRef.dispatch(updateMessage(updatedMessage));

                    // Then set the streaming state to show the "Continue" button
                    storeRef.dispatch(setStreamingState({
                        isStreaming: false,
                        messageId: null,
                        canResume: true,
                        resumeMessageId: messageId
                    }));

                    // If this is the active session and we're on the same route, try to reconnect
                    if (session.currentRoute === window.location.pathname) {
                        debugLog('Attempting to auto-reconnect to stream on same route');
                        setTimeout(() => {
                            if (session.query && session.conversationHistory) {
                                storeRef.dispatch(resumeGeneration({ messageId }));
                            }
                        }, 500);
                    }
                }, 100);
            }
        }
    }
};

// Also update the visibility change handler to use setTimeout for dispatching
const setupVisibilityChangeHandler = (storeRef: any) => {
    if (typeof document === 'undefined') return;

    document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'hidden') {
            // Page is now hidden (tab switch, minimize, etc.)
            // debugLog('Page visibility changed to hidden');

            // Get all active sessions
            const sessions = getAllSessions();

            // For each active session, save the current state
            Object.entries(sessions).forEach(([messageId, session]) => {
                if (!session || typeof session !== 'object') return;

                if (!session.isComplete) {
                    debugLog(`Saving session state for ${messageId} before tab switch`);

                    // Mark the session with a special flag
                    saveSession(messageId, {
                        ...session as object,
                        tabSwitched: true,
                        lastContent: session.content
                    });
                }
            });
        } else if (document.visibilityState === 'visible') {
            // Page is now visible again
            // debugLog('Page visibility changed to visible');

            // Get all sessions that were active when tab was switched
            const sessions = getAllSessions();

            // For each session that was interrupted by tab switch
            Object.entries(sessions).forEach(([messageId, session]) => {
                if (!session || typeof session !== 'object') return;

                if (session.tabSwitched && !session.isComplete) {
                    debugLog(`Restoring session ${messageId} after tab switch`);

                    // Restore the message content
                    if (session.lastContent) {
                        const updatedMessage = {
                            id: messageId,
                            content: session.lastContent,
                            created_at: new Date().toISOString(),
                            sender: {
                                id: 'assistant-id',
                                user_id: 'assistant-id',
                                username: 'AI Assistant',
                                email: '',
                                created_at: new Date().toISOString(),
                                updated_at: new Date().toISOString(),
                                active_rooms: [],
                                archived_rooms: [],
                                role: 'assistant'
                            },
                            avatar: '',
                            room_id: ''
                        };

                        // Use setTimeout to safely dispatch
                        setTimeout(() => {
                            storeRef.dispatch(updateMessage(updatedMessage));

                            // Update the session to remove the tab switch flag
                            saveSession(messageId, {
                                ...session as object,
                                tabSwitched: false
                            });

                            // Set the streaming state to show the "Continue" button
                            storeRef.dispatch(setStreamingState({
                                isStreaming: false,
                                messageId: null,
                                canResume: true,
                                resumeMessageId: messageId
                            }));
                        }, 100);
                    }
                }
            });
        }
    });
};

// Add this at the top level, outside any functions
let controller: AbortController | null = null;

const streamingMiddleware: Middleware = storeAPI => {
    // Store a reference to the Redux store
    const storeRef = storeAPI;

    let updateTimer: NodeJS.Timeout | null = null;

    // Set up the visibility change handler when the middleware is initialized
    if (typeof window !== 'undefined') {
        // Setup visibility change handler with store reference
        setupVisibilityChangeHandler(storeRef);

        // Also log when the page loads
        debugLog('Page loaded');

        // Delay the reconnection check to avoid dispatching during middleware construction
        setTimeout(() => {
            checkAndReconnectStreams(storeRef);
        }, 0);
    }

    return next => action => {
        const result = next(action);

        if (startStreaming.match(action)) {
            debugLog('Starting streaming', action.payload);

            // Cancel any existing stream
            if (controller) {
                debugLog('Aborting existing controller');
                controller.abort();
                if (updateTimer) {
                    clearTimeout(updateTimer);
                    updateTimer = null;
                }
            }

            // Create a new controller for this stream
            controller = new AbortController();
            const { signal } = controller;

            const { messageId, query, conversationHistory, locale } = action.payload;

            // Set streaming state
            storeRef.dispatch(setStreamingState({ isStreaming: true, messageId }));

            // We'll store our own session ID, but we'll update it when we get the real one from the server
            const clientSessionId = `client_${uuidv4()}`;
            debugLog('Created client session ID:', clientSessionId);

            // Store the session immediately using localStorage
            saveSession(messageId, {
                sessionId: clientSessionId,
                serverSessionId: null,
                content: '',
                isComplete: false,
                query: query,
                conversationHistory: conversationHistory,
                locale: locale,
                isStreaming: true
            });

            debugLog('Active sessions after creation:', Object.keys(getAllSessions()));

            // Start the streaming request
            debugLog('Fetching from API');
            fetch('/api/kb/query', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    query,
                    conversation_history: conversationHistory,
                    source_id: "local_store",
                    streaming: true,
                    top_k: 5,
                    preferred_language: locale
                }),
                signal
            })
                .then(response => {
                    debugLog('Got response from API', response.status);
                    if (!response.body) {
                        throw new Error("Response body is null");
                    }

                    const reader = response.body.getReader();
                    const decoder = new TextDecoder();
                    let accumulatedContent = '';
                    let lastUpdateTime = Date.now();
                    let sessionId: string | null = null;

                    // Store this session for potential reconnection
                    const storeSession = (id: string) => {
                        debugLog('Storing session', id);
                        if (id) {
                            sessionId = id;
                            saveSession(messageId, {
                                sessionId,
                                content: accumulatedContent,
                                isComplete: false
                            });
                            debugLog('Active sessions:', Object.keys(getAllSessions()));
                        }
                    };

                    const processStream = async () => {
                        try {
                            debugLog('Starting to process stream');
                            while (true) {
                                const { done, value } = await reader.read();

                                if (done) {
                                    debugLog('Stream done');
                                    // Final update
                                    updateMessageContent(accumulatedContent);

                                    // Make sure we have a session ID
                                    if (!sessionId) {
                                        sessionId = `completed_${uuidv4()}`;
                                        debugLog('Created completion session ID:', sessionId);
                                    }

                                    // Mark as complete using localStorage
                                    debugLog('Marking session as complete', sessionId);
                                    saveSession(messageId, {
                                        sessionId,
                                        content: accumulatedContent,
                                        isComplete: true
                                    });

                                    debugLog('Active sessions after completion:', Object.keys(getAllSessions()));

                                    storeRef.dispatch(setStreamingState({ isStreaming: false, messageId: null }));
                                    controller = null;
                                    break;
                                }

                                // Decode the chunk
                                const chunk = decoder.decode(value, { stream: true });
                                debugLog('Received chunk:', chunk.length, 'bytes');

                                // Parse SSE format
                                const events = chunk.split('\n\n');
                                debugLog('Events in chunk:', events.length);

                                for (const event of events) {
                                    if (!event.trim()) continue;

                                    const lines = event.split('\n');
                                    const eventType = lines.find(line => line.startsWith('event:'))?.substring(6).trim();
                                    const dataLine = lines.find(line => line.startsWith('data:'));

                                    debugLog('Event type:', eventType);

                                    if (eventType === 'start') {
                                        try {
                                            const data = dataLine ? JSON.parse(dataLine.substring(5).trim()) : {};
                                            debugLog('Start event data:', data);

                                            // The server sends the session ID in the response headers
                                            // Extract it from the URL or response headers
                                            const urlParts = response.url.split('/');
                                            const serverSessionId = data.session_id || urlParts[urlParts.length - 1];

                                            if (serverSessionId) {
                                                debugLog('Got server session ID:', serverSessionId);

                                                // Update our session with the server's session ID
                                                saveSession(messageId, {
                                                    ...getSession(messageId),
                                                    serverSessionId: serverSessionId
                                                });
                                            }
                                        } catch (e) {
                                            console.error("Error parsing start event data", e);
                                        }
                                    } else if (dataLine && eventType === 'token') {
                                        try {
                                            const data = JSON.parse(dataLine.substring(5).trim());

                                            if (data.token) {
                                                accumulatedContent += data.token;

                                                // Save content more frequently
                                                if (accumulatedContent.length % 20 === 0) {  // Every ~20 characters
                                                    saveSession(messageId, {
                                                        sessionId: sessionId || '',
                                                        serverSessionId: sessionId || '',
                                                        content: accumulatedContent,
                                                        isComplete: false
                                                    });
                                                }

                                                // Throttle UI updates
                                                const currentTime = Date.now();
                                                if (currentTime - lastUpdateTime > 100) {
                                                    updateMessageContent(accumulatedContent);
                                                    lastUpdateTime = currentTime;
                                                } else if (updateTimer === null) {
                                                    updateTimer = setTimeout(() => {
                                                        updateMessageContent(accumulatedContent);
                                                        lastUpdateTime = Date.now();
                                                        updateTimer = null;
                                                    }, 100);
                                                }
                                            }
                                        } catch (e) {
                                            console.error("Error parsing server-sent event data", e);
                                        }
                                    } else if (eventType === 'end') {
                                        debugLog('End event received');
                                        if (updateTimer) {
                                            clearTimeout(updateTimer);
                                            updateTimer = null;
                                        }

                                        // Final update
                                        updateMessageContent(accumulatedContent);

                                        if (sessionId) {
                                            debugLog('Marking session as complete on end event', sessionId);
                                            saveSession(messageId, {
                                                sessionId,
                                                content: accumulatedContent,
                                                isComplete: true
                                            });
                                        }

                                        storeRef.dispatch(setStreamingState({ isStreaming: false, messageId: null }));
                                        controller = null;
                                        break;
                                    }
                                }
                            }
                        } catch (error: unknown) {
                            // If it's an AbortError, it's intentional - no need to show error
                            if (error instanceof Error && error.name !== 'AbortError') {
                                console.error("Stream processing error:", error);
                                debugLog('Stream error:', error);

                                // Check if we have a session ID - we might be able to reconnect
                                if (sessionId && !getSession(messageId)?.isComplete) {
                                    debugLog("Attempting to reconnect to stream...");

                                    // Try to reconnect after a short delay
                                    setTimeout(() => {
                                        if (sessionId) {
                                            reconnectToStream(messageId, sessionId, accumulatedContent, storeRef);
                                        }
                                    }, 1000);
                                } else {
                                    storeRef.dispatch(setStreamingState({ isStreaming: false, messageId: null }));

                                    toaster.create({
                                        title: "Error",
                                        description: "Failed to process the assistant's response",
                                        type: "error"
                                    });
                                }
                            } else {
                                debugLog('Stream aborted intentionally');
                            }
                        }
                    };

                    const updateMessageContent = (content: string) => {
                        const updatedMessage: IMessage = {
                            id: messageId,
                            content: content,
                            created_at: new Date().toISOString(),
                            sender: {
                                id: 'assistant-id',
                                user_id: 'assistant-id',
                                username: 'AI Assistant',
                                email: '',
                                created_at: new Date().toISOString(),
                                updated_at: new Date().toISOString(),
                                active_rooms: [],
                                archived_rooms: [],
                                role: 'assistant'
                            },
                            avatar: '',
                            room_id: ''
                        };

                        storeRef.dispatch(updateMessage(updatedMessage));

                        // Dispatch custom event for scrolling
                        const scrollEvent = new CustomEvent('chatMessageUpdated');
                        window.dispatchEvent(scrollEvent);
                    };

                    processStream();
                })
                .catch(error => {
                    if (error instanceof Error && error.name !== 'AbortError') {
                        console.error('Error sending message to assistant:', error);
                        debugLog('Fetch error:', error);
                        storeRef.dispatch(setStreamingState({ isStreaming: false, messageId: null }));

                        const errorMessage: IMessage = {
                            id: uuidv4(),
                            content: "I'm sorry, I encountered an error processing your request.",
                            created_at: new Date().toISOString(),
                            sender: {
                                id: 'assistant-id',
                                user_id: 'assistant-id',
                                username: 'AI Assistant',
                                email: '',
                                created_at: new Date().toISOString(),
                                updated_at: new Date().toISOString(),
                                active_rooms: [],
                                archived_rooms: [],
                                role: 'assistant'
                            },
                            avatar: '',
                            room_id: ''
                        };

                        storeRef.dispatch(addMessage(errorMessage));

                        toaster.create({
                            title: "Error",
                            description: "Failed to communicate with the assistant",
                            type: "error"
                        });
                    } else {
                        debugLog('Fetch aborted intentionally');
                    }
                });
        }

        if (resumeGeneration.match(action)) {
            debugLog('Resuming generation', action.payload);

            const { messageId } = action.payload;
            const session = getSession(messageId);

            if (!session) {
                debugLog('No session found for message', messageId);
                return result;
            }

            // Get the original query from the session
            const query = session.query;
            const conversationHistory = session.conversationHistory;
            const locale = session.locale;

            if (!query) {
                debugLog('No query found in session', messageId);
                return result;
            }

            // Remove the "continue generating" message
            const currentContent = session.content || '';
            const updatedMessage: IMessage = {
                id: messageId,
                content: currentContent,
                created_at: new Date().toISOString(),
                sender: {
                    id: 'assistant-id',
                    user_id: 'assistant-id',
                    username: 'AI Assistant',
                    email: '',
                    created_at: new Date().toISOString(),
                    updated_at: new Date().toISOString(),
                    active_rooms: [],
                    archived_rooms: [],
                    role: 'assistant'
                },
                avatar: '',
                room_id: ''
            };

            storeRef.dispatch(updateMessage(updatedMessage));

            // Start a new streaming request with the same query
            storeRef.dispatch(startStreaming({
                messageId,
                query,
                conversationHistory: conversationHistory || '',
                locale: locale || 'en'
            }));
        }

        if (stopStreaming.match(action)) {
            debugLog('Stopping streaming');
            if (controller) {
                controller.abort();
                controller = null;
            }

            if (updateTimer) {
                clearTimeout(updateTimer);
                updateTimer = null;
            }

            // Update all active sessions to mark them as not streaming
            const sessions = getAllSessions();
            Object.entries(sessions).forEach(([id, session]) => {
                if (session && !session.isComplete) {
                    saveSession(id, {
                        ...session,
                        isStreaming: false
                    });
                }
            });

            storeRef.dispatch(setStreamingState({ isStreaming: false, messageId: null }));
        }

        return result;
    };
};

// Add a function to reconnect to an existing stream
const reconnectToStream = (messageId: string, sessionId: string, currentContent: string, storeRef: any) => {
    debugLog('Reconnecting to stream:', messageId, 'session:', sessionId);

    // Get the session to check for a server session ID
    const session = getSession(messageId);
    const serverSessionId = session?.serverSessionId;

    if (!serverSessionId) {
        debugLog('No server session ID available, cannot reconnect');
        // Mark the session as complete to prevent further reconnection attempts
        saveSession(messageId, {
            sessionId,
            content: currentContent,
            isComplete: true
        });

        storeRef.dispatch(setStreamingState({ isStreaming: false, messageId: null }));
        return;
    }

    // Cancel any existing controller
    if (controller) {
        controller.abort();
    }

    // Create a new controller
    controller = new AbortController();
    const { signal } = controller;

    // Use the server's session ID for reconnection
    const reconnectUrl = `/api/stream/${serverSessionId}`;
    debugLog('Fetching from', reconnectUrl);

    fetch(reconnectUrl, { signal })
        .then(response => {
            debugLog('Reconnection response:', response.status, response.headers.get('content-type'));

            if (!response.ok) {
                throw new Error(`Reconnection failed with status ${response.status}`);
            }

            // Add null check for response.body
            if (!response.body) {
                throw new Error("Response body is null");
            }

            // Check if the response is a streaming response or a JSON response
            const contentType = response.headers.get('content-type');
            if (contentType && contentType.includes('application/json')) {
                // The stream is already complete, just get the final content
                return response.json().then(data => {
                    debugLog('JSON data:', data);
                    if (data.status === 'complete') {
                        const store = require('../store').store;

                        const updatedMessage: IMessage = {
                            id: messageId,
                            content: data.content,
                            created_at: new Date().toISOString(),
                            sender: {
                                id: 'assistant-id',
                                user_id: 'assistant-id',
                                username: 'AI Assistant',
                                email: '',
                                created_at: new Date().toISOString(),
                                updated_at: new Date().toISOString(),
                                active_rooms: [],
                                archived_rooms: [],
                                role: 'assistant'
                            },
                            avatar: '',
                            room_id: ''
                        };

                        store.dispatch(updateMessage(updatedMessage));
                        store.dispatch(setStreamingState({ isStreaming: false, messageId: null }));

                        // Mark session as complete
                        saveSession(messageId, {
                            sessionId,
                            content: data.content,
                            isComplete: true
                        });
                    }
                });
            }

            // Otherwise, process the stream
            // Rest of the function remains the same...
            const reader = response.body.getReader();
            const decoder = new TextDecoder();
            let accumulatedContent = currentContent || '';
            let lastUpdateTime = Date.now();
            let updateTimer: NodeJS.Timeout | null = null;
            const store = require('../store').store;

            const processReconnectedStream = async () => {
                debugLog('Starting to process reconnected stream');
                try {
                    while (true) {
                        const { done, value } = await reader.read();

                        if (done) {
                            debugLog('Reconnected stream done');
                            updateMessageContent(accumulatedContent);
                            store.dispatch(setStreamingState({ isStreaming: false, messageId: null }));
                            break;
                        }

                        const chunk = decoder.decode(value, { stream: true });
                        debugLog('Received chunk in reconnection:', chunk.length, 'bytes');
                        const events = chunk.split('\n\n');
                        debugLog('Events in reconnection chunk:', events.length);

                        for (const event of events) {
                            if (!event.trim()) continue;

                            const lines = event.split('\n');
                            const eventType = lines.find(line => line.startsWith('event:'))?.substring(6).trim();
                            const dataLine = lines.find(line => line.startsWith('data:'));

                            debugLog('Reconnection event type:', eventType);

                            if (eventType === 'resume' && dataLine) {
                                try {
                                    const data = JSON.parse(dataLine.substring(5).trim());
                                    debugLog('Resume event data:', data);
                                    if (data.content) {
                                        accumulatedContent = data.content;
                                        updateMessageContent(accumulatedContent);
                                    }
                                } catch (e) {
                                    console.error("Error parsing resume event data", e);
                                }
                            } else if (dataLine && eventType === 'token') {
                                try {
                                    const data = JSON.parse(dataLine.substring(5).trim());

                                    if (data.token) {
                                        accumulatedContent += data.token;

                                        // Throttle UI updates
                                        const currentTime = Date.now();
                                        if (currentTime - lastUpdateTime > 100) {
                                            updateMessageContent(accumulatedContent);
                                            lastUpdateTime = currentTime;
                                        } else if (updateTimer === null) {
                                            updateTimer = setTimeout(() => {
                                                updateMessageContent(accumulatedContent);
                                                lastUpdateTime = Date.now();
                                                updateTimer = null;
                                            }, 100);
                                        }
                                    }
                                } catch (e) {
                                    console.error("Error parsing token event data", e);
                                }
                            } else if (eventType === 'end') {
                                debugLog('End event in reconnection');
                                if (updateTimer) {
                                    clearTimeout(updateTimer);
                                    updateTimer = null;
                                }

                                updateMessageContent(accumulatedContent);
                                store.dispatch(setStreamingState({ isStreaming: false, messageId: null }));
                                break;
                            }
                        }
                    }
                } catch (error: unknown) {
                    if (error instanceof Error && error.name !== 'AbortError') {
                        console.error("Reconnection stream processing error:", error);
                        debugLog('Reconnection error:', error);
                        store.dispatch(setStreamingState({ isStreaming: false, messageId: null }));
                    } else {
                        debugLog('Reconnection aborted intentionally');
                    }
                }
            };

            const updateMessageContent = (content: string) => {
                const updatedMessage: IMessage = {
                    id: messageId,
                    content: content,
                    created_at: new Date().toISOString(),
                    sender: {
                        id: 'assistant-id',
                        user_id: 'assistant-id',
                        username: 'AI Assistant',
                        email: '',
                        created_at: new Date().toISOString(),
                        updated_at: new Date().toISOString(),
                        active_rooms: [],
                        archived_rooms: [],
                        role: 'assistant'
                    },
                    avatar: '',
                    room_id: ''
                };

                store.dispatch(updateMessage(updatedMessage));

                // Dispatch custom event for scrolling
                const scrollEvent = new CustomEvent('chatMessageUpdated');
                window.dispatchEvent(scrollEvent);
            };

            processReconnectedStream();
        })
        .catch(error => {
            if (error instanceof Error && error.name !== 'AbortError') {
                console.error("Failed to reconnect to stream:", error);
                debugLog('Reconnection fetch error:', error);
                const store = require('../store').store;
                store.dispatch(setStreamingState({ isStreaming: false, messageId: null }));
            } else {
                debugLog('Reconnection fetch aborted intentionally');
            }
        });
};

export const loadMessagesFromSessions = (): IMessage[] => {
    const sessions = JSON.parse(localStorage.getItem('activeStreamSessions') || '{}');
    return Object.entries(sessions).map(([messageId, session]: [string, any]) => ({
        id: messageId,
        content: session.content || '',
        created_at: new Date(session.lastUpdated || Date.now()).toISOString(),
        sender: {
            id: 'assistant-id',
            user_id: 'assistant-id',
            username: 'AI Assistant',
            email: '',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            active_rooms: [],
            archived_rooms: [],
            role: 'assistant'
        },
        avatar: '',
        room_id: ''
    }));
};

export default streamingMiddleware; 