"use client";

import React, { useState, useRef, useEffect, useCallback, useMemo } from "react";
import {
    Box,
    IconButton,
    Popover,
    VStack,
    Text,
    Flex,
    Portal,
    Icon,
    Button,
    Textarea,
    Heading
} from "@chakra-ui/react";
import { FaComment, FaPaperPlane, FaTimes, FaStop } from "react-icons/fa";
import { useDispatch, useSelector } from 'react-redux';
import { RootState } from '@/store/store';
import { toaster } from "@/components/ui/toaster";
import { useColorModeValue } from "@/components/ui/color-mode";
import { updatePosition, toggleOpen, setIsOpen, addMessage, clearMessages, updateMessage, setStreamingState, startStreaming, stopStreaming, resumeGeneration } from '@/store/features/assistantSlice';
import { v4 as uuidv4 } from 'uuid';
import { useTranslations } from "next-intl";
import { useChatPageColors } from "@/utils/colors";
import { ChatBubble } from "@/components/chat/bubble";
import { useSession } from "next-auth/react";
import { IMessage } from "@/types/chat";
import { useParams } from 'next/navigation';
import AssistantInput from "@/components/assistant/assistant_input";
import AssistantMessageList from "@/components/assistant/assistant_message_list";
import { loadMessagesFromSessions, getActiveStreamingSession, getSession, saveSession } from '@/store/middleware/streamingMiddleware';
import { debugLog } from "@/store/middleware/streamingMiddleware";

const Assistant: React.FC = () => {
    const dispatch = useDispatch();
    const { data: session } = useSession();
    const { currentUser, isAuthenticated } = useSelector((state: RootState) => state.user);
    const { position, isOpen, messages, isStreaming, streamingMessageId } = useSelector((state: RootState) => state.assistant);
    const t = useTranslations("Assistant");
    const colors = useChatPageColors();
    const params = useParams();
    const locale = params.locale as string;

    // Move all useColorModeValue hooks to the top level, before any conditional logic
    const bgColor = useColorModeValue("white", "gray.800");
    const borderColor = useColorModeValue("gray.200", "gray.700");
    const hoverBg = useColorModeValue("gray.100", "gray.700");
    const userMessageBg = useColorModeValue("blue.50", "blue.900");
    const assistantMessageBg = useColorModeValue("gray.50", "gray.700");
    const inputBg = useColorModeValue("white", "#1A202C");
    const containerBg = useColorModeValue("rgba(240, 255, 244, 0.8)", "rgba(26, 32, 44, 0.8)");
    const buttonHoverBgValue = useColorModeValue("green.50", "gray.700");

    const [dragStartPosition, setDragStartPosition] = useState({ x: 0, y: 0 });
    const [isDragging, setIsDragging] = useState(false);
    const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
    const [inputValue, setInputValue] = useState('');
    const [currentStreamingMessage, setCurrentStreamingMessage] = useState<IMessage | null>(null);
    const assistantRef = useRef<HTMLDivElement>(null);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const eventSourceRef = useRef<EventSource | null>(null);
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const lastScrollEventTime = useRef(0);

    // Add constants for boundary margins
    const BOUNDARY_MARGIN = 20; // pixels from edge of screen

    // Input styling from ChatModeInput
    const inputBorder = colors.chatModeHeading;
    const buttonBg = colors.chatModeHeading;
    const buttonHoverBg = "green.700";
    const cancelHoverBg = "red.600";
    const placeholderColor = colors.textColor;
    const inputTextColor = colors.textColorHeading;

    const scrollToBottom = () => {
        // Use requestAnimationFrame to avoid forced reflow
        requestAnimationFrame(() => {
            if (messagesEndRef.current) {
                messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
            }
        });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    // Auto-resize effect for textarea
    useEffect(() => {
        const textarea = textareaRef.current;
        if (!textarea) return;

        // Reset height to auto to get the correct scrollHeight
        textarea.style.height = 'auto';

        // Calculate the new height (capped at 100px)
        const maxHeight = 100;
        const newHeight = Math.min(textarea.scrollHeight, maxHeight);

        // Set the new height
        textarea.style.height = `${newHeight}px`;
    }, [inputValue]);

    // Clean up event source on unmount
    useEffect(() => {
        return () => {
            if (eventSourceRef.current) {
                eventSourceRef.current.close();
            }
        };
    }, []);

    useEffect(() => {
        const sessionMessages = loadMessagesFromSessions();
        sessionMessages.forEach((msg) => {
            dispatch(updateMessage(msg));
        });

        // Check if there's an active streaming session to reconnect
        const activeStreamingSession = sessionMessages.find(msg => {
            const session = JSON.parse(localStorage.getItem('activeStreamSessions') || '{}')[msg.id];
            return session && !session.isComplete;
        });

        if (activeStreamingSession) {
            dispatch(setStreamingState({
                isStreaming: false,
                messageId: null,
                canResume: true,
                resumeMessageId: activeStreamingSession.id
            }));
        }
    }, [dispatch, locale]); // Include locale or route params if needed


    // Reconnect streaming if needed when component mounts
    useEffect(() => {
        // Only run this effect once on mount, not on every update
        const initialCheck = () => {
            // If we were streaming when the component unmounted, we need to reconnect
            if (isStreaming && streamingMessageId) {
                // Find the message we were streaming
                const message = messages.find(msg => msg.id === streamingMessageId);
                if (message) {
                    setCurrentStreamingMessage(message);
                    // You might want to reconnect to the stream here
                    // This depends on how your API is structured
                }
            }
        };

        initialCheck();
        // Empty dependency array means this only runs once on mount
    }, []); // <-- Remove dependencies that cause the loop

    // Add this effect to handle route changes
    useEffect(() => {
        // This effect runs on mount and when the route changes
        const handleRouteChange = () => {
            debugLog('Route changed to:', window.location.pathname);

            // If we're streaming, update the session with the new route
            if (isStreaming && streamingMessageId) {
                const session = getSession(streamingMessageId);
                if (session) {
                    saveSession(streamingMessageId, {
                        ...session,
                        currentRoute: window.location.pathname
                    });
                }
            }
        };

        // Call once on mount
        handleRouteChange();

        // Clean up function not needed since we're just updating state

        return () => {
            // If we're streaming when the component unmounts, save the state
            if (isStreaming && streamingMessageId) {
                debugLog('Assistant unmounting while streaming, preserving state');
                // We don't need to do anything special here since the streaming state
                // is already being saved in localStorage by the middleware
            }
        };
    }, [isStreaming, streamingMessageId, dispatch]);

    // Add this effect to reconnect to active streams when the component mounts
    useEffect(() => {
        // This function will only run once when the component mounts
        const checkForActiveSession = () => {
            // Check if there's an active streaming session
            const activeSession = getActiveStreamingSession();
            if (activeSession && typeof activeSession.session === 'object' && activeSession.session &&
                'currentRoute' in activeSession.session &&
                activeSession.session.currentRoute === window.location.pathname) {
                debugLog('Found active streaming session on current route:', activeSession.messageId);

                // Set the current streaming message
                const message = messages.find(msg => msg.id === activeSession.messageId);
                if (message) {
                    setCurrentStreamingMessage(message);

                    // If we were actively streaming (not just paused), resume
                    if (typeof activeSession.session === 'object' &&
                        activeSession.session &&
                        'isStreaming' in activeSession.session &&
                        activeSession.session.isStreaming) {
                        debugLog('Auto-resuming active stream');
                        dispatch(resumeGeneration({ messageId: activeSession.messageId }));
                    } else {
                        // Otherwise just set the state to show the resume button
                        dispatch(setStreamingState({
                            isStreaming: false,
                            messageId: null,
                            canResume: true,
                            resumeMessageId: activeSession.messageId
                        }));
                    }
                }
            }
        };

        // Run the check once on mount
        checkForActiveSession();

        // Empty dependency array to ensure this only runs once on mount
    }, []); // <-- Empty dependency array

    const handleMouseDown = (e: React.MouseEvent) => {
        // Only initiate dragging if clicking directly on the button, not the popover content
        if (assistantRef.current && !isOpen) {
            setIsDragging(true);
            setDragStartPosition({ x: e.clientX, y: e.clientY });
            const rect = assistantRef.current.getBoundingClientRect();
            setDragOffset({
                x: e.clientX - rect.left,
                y: e.clientY - rect.top
            });
        }
    };

    const handleClick = (e: React.MouseEvent) => {
        // Only toggle popover if it wasn't a drag (moved less than 5px)
        // and if we're clicking directly on the button
        const moveDistance = Math.sqrt(
            Math.pow(e.clientX - dragStartPosition.x, 2) +
            Math.pow(e.clientY - dragStartPosition.y, 2)
        );

        if (moveDistance < 5 && !isOpen) {
            dispatch(toggleOpen());
        }
    };

    useEffect(() => {
        const handleMouseMove = (e: MouseEvent) => {
            if (isDragging) {
                // Calculate new position with boundary constraints
                const newX = e.clientX - dragOffset.x;
                const newY = e.clientY - dragOffset.y;

                // Get window dimensions
                const windowWidth = window.innerWidth;
                const windowHeight = window.innerHeight;

                // Apply boundary constraints
                const boundedX = Math.max(BOUNDARY_MARGIN, Math.min(newX, windowWidth - BOUNDARY_MARGIN));
                const boundedY = Math.max(BOUNDARY_MARGIN, Math.min(newY, windowHeight - BOUNDARY_MARGIN));

                dispatch(updatePosition({
                    x: boundedX,
                    y: boundedY
                }));
            }
        };

        const handleMouseUp = () => {
            setIsDragging(false);
        };

        if (isDragging) {
            document.addEventListener('mousemove', handleMouseMove);
            document.addEventListener('mouseup', handleMouseUp);
        }

        return () => {
            document.removeEventListener('mousemove', handleMouseMove);
            document.removeEventListener('mouseup', handleMouseUp);
        };
    }, [isDragging, dragOffset, dispatch]);

    // Add effect to ensure assistant stays within bounds when window is resized
    useEffect(() => {
        const handleResize = () => {
            if (assistantRef.current) {
                const windowWidth = window.innerWidth;
                const windowHeight = window.innerHeight;

                // Check if current position is outside boundaries after resize
                const boundedX = Math.max(BOUNDARY_MARGIN, Math.min(position.x, windowWidth - BOUNDARY_MARGIN));
                const boundedY = Math.max(BOUNDARY_MARGIN, Math.min(position.y, windowHeight - BOUNDARY_MARGIN));

                // Only update if position needs to change
                if (boundedX !== position.x || boundedY !== position.y) {
                    dispatch(updatePosition({
                        x: boundedX,
                        y: boundedY
                    }));
                }
            }
        };

        window.addEventListener('resize', handleResize);

        // Initial check when component mounts
        handleResize();

        return () => {
            window.removeEventListener('resize', handleResize);
        };
    }, [position, dispatch]);

    // Scroll when streaming content updates - with throttling
    useEffect(() => {
        const handleMessageUpdate = () => {
            const now = Date.now();
            if (now - lastScrollEventTime.current > 150) { // Throttle to max once per 150ms
                lastScrollEventTime.current = now;
                scrollToBottom();
            }
        };

        window.addEventListener('chatMessageUpdated', handleMessageUpdate);

        return () => {
            window.removeEventListener('chatMessageUpdated', handleMessageUpdate);
        };
    }, []);

    const handleSendMessage = async () => {
        if (!inputValue.trim() || isStreaming) return;

        // Create user message as IMessage directly
        const userMessage: IMessage = {
            id: uuidv4(),
            content: inputValue,
            created_at: new Date().toISOString(),
            sender: {
                id: currentUser?.id || 'user-id',
                user_id: currentUser?.id || 'user-id',
                username: 'You',
                email: '',
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
                active_rooms: [],
                archived_rooms: [],
                role: 'user'
            },
            avatar: '',
            room_id: ''
        };

        // Add user message to Redux store
        dispatch(addMessage(userMessage));
        setInputValue('');

        // Create an initial empty message for the AI response
        const newAiMessageId = uuidv4();

        const aiMessage: IMessage = {
            id: newAiMessageId,
            content: '',
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

        // Add empty AI message to Redux store
        dispatch(addMessage(aiMessage));

        // Get the last 10 messages for context (excluding the new AI message)
        const lastMessages = messages.slice(-10).concat(userMessage);
        const conversationContext = lastMessages.map(msg =>
            `${msg.sender.username}: ${msg.content}`
        ).join('\n');

        console.log("[Assistant] Dispatching startStreaming action");

        // Dispatch the action to start streaming
        dispatch(startStreaming({
            messageId: newAiMessageId,
            query: userMessage.content,
            conversationHistory: conversationContext,
            locale
        }));
    };

    const cancelGeneration = () => {
        dispatch(stopStreaming());

        // Add a cancellation message
        const updatedMessages = [...messages];
        const lastIndex = updatedMessages.length - 1;
        if (lastIndex >= 0 && updatedMessages[lastIndex].sender.role === 'assistant') {
            const updatedMessage = {
                ...updatedMessages[lastIndex],
                content: updatedMessages[lastIndex].content + ' [Generation stopped]'
            };

            // Update the message in Redux store
            dispatch(updateMessage(updatedMessage));
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSendMessage();
        }
    };

    const clearConversation = () => {
        dispatch(clearMessages());
        if (eventSourceRef.current) {
            eventSourceRef.current.close();
            eventSourceRef.current = null;
        }

        // Update streaming state in Redux
        dispatch(setStreamingState({ isStreaming: false, messageId: null }));

        setCurrentStreamingMessage(null);
    };

    // Group messages by sender for continuous messages (from ChatModeMessageList)
    const groupedMessages = useMemo(() => {
        return messages.reduce(
            (
                acc: { sender: string; messages: IMessage[]; isCurrentUser: boolean }[],
                message: IMessage,
                index
            ) => {
                const prevMessage = messages[index - 1];

                // Check if this message is from the current user
                const isCurrentUser = message.sender.username === 'You';

                // Check if this message is from the same sender as the previous one
                const isContinuation =
                    prevMessage &&
                    prevMessage.sender.username === message.sender.username;

                if (isContinuation) {
                    // Add to the last group
                    acc[acc.length - 1].messages.push(message);
                } else {
                    // Create a new group
                    acc.push({
                        sender: message.sender.username === 'You' ? 'You' : 'AI Assistant',
                        messages: [message],
                        isCurrentUser: isCurrentUser
                    });
                }

                return acc;
            },
            []
        );
    }, [messages]);

    if (!isAuthenticated) {
        return null;
    }

    return (
        <Box
            ref={assistantRef}
            position="fixed"
            left={`${position.x}px`}
            top={`${position.y}px`}
            zIndex="10"
            cursor={isDragging ? "grabbing" : "grab"}
            onMouseDown={handleMouseDown}
        >
            <Popover.Root
                lazyMount
                unmountOnExit
                positioning={{
                    placement: "bottom-start"
                }}
                open={isOpen}
                onOpenChange={(details) => dispatch(setIsOpen(details.open))}
            >
                <Popover.Trigger asChild>
                    <IconButton
                        aria-label="Assistant"
                        onClick={handleClick}
                        size="lg"
                        colorScheme="green"
                        variant="outline"
                        borderRadius="full"
                        boxShadow="lg"
                        position="relative"
                        bg={bgColor}
                        _hover={{ bg: hoverBg }}
                    >
                        <Icon as={FaComment} />
                    </IconButton>
                </Popover.Trigger>

                {/* Stop propagation on the popover content to prevent dragging */}
                <Portal>
                    <Popover.Positioner>
                        <Popover.Content
                            width="350px"
                            boxShadow="xl"
                            border="1px solid"
                            borderColor={borderColor}
                            onMouseDown={(e) => e.stopPropagation()}
                        >
                            <Popover.Arrow bg={bgColor} borderColor={borderColor} />
                            <Flex justifyContent="space-between" alignItems="center" p={2} borderBottom="1px solid" borderColor={borderColor}>
                                <Text fontWeight="bold">{t("ai_assistant")}</Text>
                                <Flex>
                                    <Button
                                        size="xs"
                                        colorScheme="red"
                                        variant="ghost"
                                        onClick={clearConversation}
                                        mr={2}
                                    >
                                        {t("clear_chat")}
                                    </Button>
                                    <Popover.CloseTrigger asChild>
                                        <IconButton
                                            aria-label="Close"
                                            size="xs"
                                            variant="ghost"
                                        >
                                            <Icon as={FaTimes} />
                                        </IconButton>
                                    </Popover.CloseTrigger>
                                </Flex>
                            </Flex>
                            <Popover.Body p={0} height="400px" display="flex" flexDirection="column">
                                {/* Use the extracted message list component */}
                                <AssistantMessageList
                                    messages={messages}
                                    isStreaming={isStreaming}
                                    aiMessageId={streamingMessageId}
                                    currentStreamingMessage={currentStreamingMessage}
                                />

                                {/* Use the extracted input component */}
                                <AssistantInput
                                    inputValue={inputValue}
                                    setInputValue={setInputValue}
                                    handleSendMessage={handleSendMessage}
                                    isStreaming={isStreaming}
                                    handleKeyDown={handleKeyDown}
                                    borderColor={borderColor}
                                    bgColor={bgColor}
                                />
                            </Popover.Body>
                        </Popover.Content>
                    </Popover.Positioner>
                </Portal>
            </Popover.Root>

            {/* Keep the animation style */}
            <style jsx global>{`
                @keyframes fadeInUp {
                    from {
                        opacity: 0;
                        transform: translateY(10px);
                    }
                    to {
                        opacity: 1;
                        transform: translateY(0);
                    }
                }
            `}</style>
        </Box>
    );
};

export default Assistant; 