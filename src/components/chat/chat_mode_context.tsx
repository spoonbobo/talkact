"use client";

import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { IMessage } from "@/types/chat";
import { v4 as uuidv4 } from 'uuid';
import { User } from '@/types/user';
import { useParams } from 'next/navigation';
import { toaster } from '@/components/ui/toaster';

interface ChatModeContextType {
    chatModeMessages: IMessage[];
    isStreaming: boolean;
    currentStreamingMessage: IMessage | null;
    sendChatModeMessage: (content: string, user: User) => void;
    clearChatModeMessages: () => void;
    cancelGeneration: () => void;
    pauseUpdates: boolean;
    setPauseUpdates: (pause: boolean) => void;
}

const ChatModeContext = createContext<ChatModeContextType | undefined>(undefined);

export const useChatMode = () => {
    const context = useContext(ChatModeContext);
    if (context === undefined) {
        throw new Error('useChatMode must be used within a ChatModeProvider');
    }
    return context;
};

interface ChatModeProviderProps {
    children: ReactNode;
    currentUser: User | null;
}

export const ChatModeProvider: React.FC<ChatModeProviderProps> = ({ children, currentUser }) => {
    const [chatModeMessages, setChatModeMessages] = useState<IMessage[]>([]);
    const [isStreaming, setIsStreaming] = useState(false);
    const [currentStreamingMessage, setCurrentStreamingMessage] = useState<IMessage | null>(null);
    const [eventSource, setEventSource] = useState<EventSource | null>(null);
    const locale = useParams().locale;
    const lastScrollEventTime = React.useRef(0);
    const [pauseUpdates, setPauseUpdates] = useState<boolean>(false);

    // Clean up event source on unmount
    useEffect(() => {
        return () => {
            if (eventSource) {
                eventSource.close();
            }
        };
    }, [eventSource]);

    // Use useCallback to memoize functions that are passed to child components
    const sendChatModeMessage = useCallback(async (content: string, user: User) => {
        if (!user) return;

        // Add user message to chat
        const userMessage: IMessage = {
            id: uuidv4(),
            room_id: 'chat-mode',
            sender: user,
            content: content,
            created_at: new Date().toISOString(),
            avatar: user?.avatar || "",
        };

        setChatModeMessages(prev => [...prev, userMessage]);

        // Create an initial empty message for the AI response
        const aiMessage: IMessage = {
            id: uuidv4(),
            room_id: 'chat-mode',
            // @ts-ignore
            sender: {
                user_id: 'ai',
                username: 'AI Assistant',
                email: 'ai@assistant.com',
                image: '/ai-avatar.png',
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
                active_rooms: [],
                archived_rooms: [],
                role: 'ai',
                status: 'active',
                avatar: '/ai-avatar.png'
            } as User,
            content: '',
            created_at: new Date().toISOString(),
            avatar: '/ai-avatar.png',
        };

        setCurrentStreamingMessage(aiMessage);
        setChatModeMessages(prev => [...prev, aiMessage]);
        setIsStreaming(true);

        // Close any existing event source
        if (eventSource) {
            eventSource.close();
        }

        try {
            // Create a new EventSource for streaming
            const url = `http://${window.location.hostname}:35430/api/query`;

            // Get the last 10 messages for context (excluding the new AI message)
            const lastMessages = chatModeMessages.slice(-10).concat(userMessage);
            const conversationContext = lastMessages.map(msg =>
                `${msg.sender.username}: ${msg.content}`
            ).join('\n');

            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    query: content,
                    conversation_history: conversationContext,
                    source_id: "local_store",
                    streaming: true,
                    top_k: 5,
                    preferred_language: locale
                })
            });

            if (!response.body) {
                throw new Error("Response body is null");
            }

            const reader = response.body.getReader();
            const decoder = new TextDecoder();
            let accumulatedContent = '';
            let updateTimer: NodeJS.Timeout | null = null;
            let lastUpdateTime = Date.now();

            // Process the stream with debounced updates
            const processStream = async () => {
                while (true) {
                    const { done, value } = await reader.read();

                    if (done) {
                        // Final update to ensure we have the complete message
                        updateMessageContent(accumulatedContent);
                        setIsStreaming(false);
                        setCurrentStreamingMessage(null);
                        break;
                    }

                    // Decode the chunk and add to accumulated content
                    const chunk = decoder.decode(value, { stream: true });

                    // Parse SSE format - each event is separated by double newlines
                    const events = chunk.split('\n\n');

                    for (const event of events) {
                        if (!event.trim()) continue;

                        const lines = event.split('\n');
                        const eventType = lines.find(line => line.startsWith('event:'))?.substring(6).trim();
                        const dataLine = lines.find(line => line.startsWith('data:'));

                        if (dataLine && eventType === 'token') {
                            try {
                                const data = JSON.parse(dataLine.substring(5).trim());
                                if (data.token) {
                                    accumulatedContent += data.token;

                                    // Throttle UI updates to reduce performance impact
                                    const currentTime = Date.now();
                                    if (currentTime - lastUpdateTime > 100) { // Update UI at most every 100ms
                                        updateMessageContent(accumulatedContent);
                                        lastUpdateTime = currentTime;
                                    } else if (updateTimer === null) {
                                        // Schedule an update if we haven't already
                                        updateTimer = setTimeout(() => {
                                            updateMessageContent(accumulatedContent);
                                            lastUpdateTime = Date.now();
                                            updateTimer = null;
                                        }, 100);
                                    }
                                }
                            } catch (e) {
                                toaster.create({
                                    title: "Parsing Error",
                                    description: "Error parsing server-sent event data",
                                    type: "error"
                                });
                            }
                        } else if (eventType === 'end') {
                            // Clear any pending update
                            if (updateTimer) {
                                clearTimeout(updateTimer);
                                updateTimer = null;
                            }

                            // Final update
                            updateMessageContent(accumulatedContent);
                            setIsStreaming(false);
                            setCurrentStreamingMessage(null);
                            break;
                        }
                    }
                }
            };

            // Helper function to update message content
            const updateMessageContent = (content: string) => {
                setCurrentStreamingMessage(prev => {
                    if (!prev) return null;
                    return {
                        ...prev,
                        content: content
                    };
                });

                setChatModeMessages(prev => {
                    const newMessages = [...prev];
                    const lastIndex = newMessages.length - 1;
                    if (lastIndex >= 0) {
                        newMessages[lastIndex] = {
                            ...newMessages[lastIndex],
                            content: content
                        };
                    }
                    return newMessages;
                });

                // Throttle scroll events to reduce performance impact
                const now = Date.now();
                if (now - lastScrollEventTime.current > 150) { // Throttle to max once per 150ms
                    lastScrollEventTime.current = now;
                    // Dispatch a custom event to trigger scrolling
                    const scrollEvent = new CustomEvent('chatMessageUpdated');
                    window.dispatchEvent(scrollEvent);
                }
            };

            processStream().catch(error => {
                toaster.create({
                    title: "Stream Processing Error",
                    description: "Error processing response stream",
                    type: "error"
                });
                setIsStreaming(false);
                setCurrentStreamingMessage(null);
            });

        } catch (error) {
            toaster.create({
                title: "Request Failed",
                description: "Error with streaming request. Please try again.",
                type: "error"
            });
            setIsStreaming(false);
            setCurrentStreamingMessage(null);

            // Add error message
            setChatModeMessages(prev => [
                ...prev,
                {
                    id: uuidv4(),
                    room_id: 'chat-mode',
                    // @ts-ignore
                    sender: {
                        user_id: 'ai',
                        username: 'AI Assistant',
                        email: 'ai@assistant.com',
                        image: '/ai-avatar.png',
                        created_at: new Date().toISOString(),
                        updated_at: new Date().toISOString(),
                        active_rooms: [],
                        archived_rooms: [],
                        role: 'ai',
                        status: 'active',
                        avatar: '/ai-avatar.png'
                    } as User,
                    content: 'Sorry, there was an error processing your request.',
                    created_at: new Date().toISOString(),
                    avatar: '/ai-avatar.png',
                }
            ]);
        }
    }, [eventSource, chatModeMessages, locale]);

    const clearChatModeMessages = useCallback(() => {
        setChatModeMessages([]);
        setIsStreaming(false);
        setCurrentStreamingMessage(null);

        if (eventSource) {
            eventSource.close();
            setEventSource(null);
        }
    }, [eventSource]);

    const cancelGeneration = useCallback(() => {
        if (eventSource) {
            eventSource.close();
            setEventSource(null);
        }
        setIsStreaming(false);
        setCurrentStreamingMessage(null);

        // Add a cancellation message
        setChatModeMessages(prev => {
            const newMessages = [...prev];
            const lastIndex = newMessages.length - 1;
            if (lastIndex >= 0 && newMessages[lastIndex].sender.user_id === 'ai') {
                newMessages[lastIndex] = {
                    ...newMessages[lastIndex],
                    content: newMessages[lastIndex].content + ' [Generation stopped]'
                };
            }
            return newMessages;
        });
    }, [eventSource]);

    // Memoize the context value to prevent unnecessary re-renders
    const contextValue = React.useMemo(() => ({
        chatModeMessages,
        isStreaming,
        currentStreamingMessage,
        sendChatModeMessage,
        clearChatModeMessages,
        cancelGeneration,
        pauseUpdates,
        setPauseUpdates
    }), [chatModeMessages, isStreaming, currentStreamingMessage, sendChatModeMessage, clearChatModeMessages, cancelGeneration, pauseUpdates, setPauseUpdates]);

    return (
        <ChatModeContext.Provider value={contextValue}>
            {children}
        </ChatModeContext.Provider>
    );
}; 