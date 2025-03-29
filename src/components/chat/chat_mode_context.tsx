"use client";

import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { IMessage } from "@/types/chat";
import { v4 as uuidv4 } from 'uuid';
import { User } from '@/types/user';
import { useParams } from 'next/navigation';

interface ChatModeContextType {
    chatModeMessages: IMessage[];
    isStreaming: boolean;
    currentStreamingMessage: IMessage | null;
    sendChatModeMessage: (content: string, user: User) => void;
    clearChatModeMessages: () => void;
    cancelGeneration: () => void;
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

            // Since EventSource doesn't support POST with body directly,
            // we'll use fetch to create a streaming response
            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    query: content,
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

            // Process the stream
            const processStream = async () => {
                while (true) {
                    const { done, value } = await reader.read();

                    if (done) {
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

                                    // Update the streaming message with new content
                                    setCurrentStreamingMessage(prev => {
                                        if (!prev) return null;
                                        return {
                                            ...prev,
                                            content: accumulatedContent
                                        };
                                    });

                                    // Also update in the messages array
                                    setChatModeMessages(prev => {
                                        const newMessages = [...prev];
                                        const lastIndex = newMessages.length - 1;
                                        if (lastIndex >= 0) {
                                            newMessages[lastIndex] = {
                                                ...newMessages[lastIndex],
                                                content: accumulatedContent
                                            };
                                        }
                                        return newMessages;
                                    });
                                }
                            } catch (e) {
                                console.error('Error parsing SSE data:', e);
                            }
                        } else if (eventType === 'end') {
                            setIsStreaming(false);
                            setCurrentStreamingMessage(null);
                            break;
                        }
                    }
                }
            };

            processStream().catch(error => {
                console.error('Error processing stream:', error);
                setIsStreaming(false);
                setCurrentStreamingMessage(null);
            });

        } catch (error) {
            console.error('Error with streaming request:', error);
            setIsStreaming(false);
            setCurrentStreamingMessage(null);

            // Add error message
            setChatModeMessages(prev => [
                ...prev,
                {
                    id: uuidv4(),
                    room_id: 'chat-mode',
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
    }, [eventSource]);

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
        cancelGeneration
    }), [chatModeMessages, isStreaming, currentStreamingMessage, sendChatModeMessage, clearChatModeMessages, cancelGeneration]);

    return (
        <ChatModeContext.Provider value={contextValue}>
            {children}
        </ChatModeContext.Provider>
    );
}; 