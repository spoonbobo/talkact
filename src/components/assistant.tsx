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
    Heading,
    HStack,
    Badge
} from "@chakra-ui/react";
import { FaComment, FaPaperPlane, FaTimes, FaStop, FaThumbtack, FaDatabase } from "react-icons/fa";
import { FiDatabase, FiCircle } from "react-icons/fi";
import { useDispatch, useSelector } from 'react-redux';
import { RootState } from '@/store/store';
import { toaster } from "@/components/ui/toaster";
import { useColorModeValue } from "@/components/ui/color-mode";
import { updatePosition, toggleOpen, setIsOpen, addMessage, clearMessages, updateMessage, setStreamingState, startStreaming, stopStreaming, resumeGeneration, updateSize, setPinned } from '@/store/features/assistantSlice';
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
import axios from "axios";

const Assistant: React.FC = () => {
    const dispatch = useDispatch();
    const { data: session } = useSession();
    const { currentUser, isAuthenticated } = useSelector((state: RootState) => state.user);
    const { position, isOpen, messages, isStreaming, streamingMessageId, size = { width: 350, height: 500 }, isPinned } = useSelector((state: RootState) => state.assistant);
    const t = useTranslations("Assistant");
    const colors = useChatPageColors();
    const params = useParams();
    const locale = params.locale as string;

    // Move all useColorModeValue hooks to the top level, before any conditional logic
    const bgColor = useColorModeValue("white", "gray.800");
    const borderColor = useColorModeValue("gray.200", "gray.700");
    const hoverBg = useColorModeValue("gray.100", "gray.700");
    const titleTextColor = useColorModeValue("gray.800", "white");
    const textColor = useColorModeValue("gray.800", "white");
    const pinColor = useColorModeValue("gray.600", "gray.400");
    const activePinColor = useColorModeValue("blue.500", "blue.300");

    // Add these color values for the knowledge base badges
    const activeBadgeBg = useColorModeValue("blue.50", "blue.900");
    const inactiveBadgeBg = useColorModeValue("gray.50", "gray.800");
    const activeBadgeColor = useColorModeValue("blue.600", "blue.200");
    const activeBadgeHoverBg = useColorModeValue("blue.100", "blue.800");
    const inactiveBadgeHoverBg = useColorModeValue("gray.100", "gray.700");

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
    const [resizing, setResizing] = useState(false);
    const [resizeStartPosition, setResizeStartPosition] = useState({ x: 0, y: 0 });
    const [resizeStartSize, setResizeStartSize] = useState({ width: 0, height: 0 });
    // Inside the component, add state for active knowledge bases
    const [activeKnowledgeBases, setActiveKnowledgeBases] = useState<Record<string, boolean>>({});
    // State for knowledge base statuses
    const [kbStatuses, setKbStatuses] = useState<Record<string, string>>({});

    // Add constants for boundary margins
    const BOUNDARY_MARGIN = 20; // pixels from edge of screen

    // Get user settings including knowledge base settings - with more careful property access

    // Add debugging to see what's in the user settings
    useEffect(() => {
        if (currentUser) {
            console.log("Current User:", currentUser);
            console.log("User Settings:", currentUser.settings);
            console.log("KB Settings:", currentUser.settings?.knowledgeBase);
        }
    }, [currentUser]);

    // More careful property access with fallbacks
    const knowledgeBases = useMemo(() => {
        if (!currentUser || !currentUser.settings) return [];

        // Try different possible paths to the knowledge bases array
        const kbSettings = currentUser.settings.knowledgeBase;
        if (!kbSettings) return [];

        // Check if knowledgeBases is directly in the settings
        if (Array.isArray(kbSettings.knowledgeBases)) {
            return kbSettings.knowledgeBases;
        }

        // If it's not an array but an object with a knowledgeBases property
        if (kbSettings.knowledgeBases && Array.isArray(kbSettings.knowledgeBases)) {
            return kbSettings.knowledgeBases;
        }

        // If we can't find it in the expected location, check if it's directly in the settings
        if (Array.isArray(currentUser.settings.knowledgeBases)) {
            return currentUser.settings.knowledgeBases;
        }

        // Last resort - check if the entire knowledgeBase setting is an array
        if (Array.isArray(kbSettings)) {
            return kbSettings;
        }

        return [];
    }, [currentUser]);

    // Fetch knowledge base statuses
    const fetchKnowledgeBaseStatuses = useCallback(async () => {
        if (!knowledgeBases.length) return;

        try {
            const statuses: Record<string, string> = {};

            // Fetch status for each knowledge base
            await Promise.all(knowledgeBases.map(async (kb) => {
                if (!kb.id) return;

                try {
                    // Update the API endpoint path to match the one used in settings
                    const response = await axios.get(`/api/kb/kb_status/${kb.id}`);
                    statuses[kb.id] = response.data.status;
                } catch (error) {
                    console.error(`Failed to fetch status for KB ${kb.id}:`, error);
                    statuses[kb.id] = 'error';
                }
            }));

            setKbStatuses(statuses);
        } catch (error) {
            console.error('Error fetching KB statuses:', error);
        }
    }, [knowledgeBases]);

    // Fetch KB statuses on component mount and when knowledge bases change
    useEffect(() => {
        if (isOpen) {
            fetchKnowledgeBaseStatuses();
        }
    }, [isOpen, knowledgeBases, fetchKnowledgeBaseStatuses]);

    // Get status color based on status string
    const getStatusColor = (status: string) => {
        switch (status) {
            case 'ready':
                return 'green.500';
            case 'loading':
                return 'yellow.500';
            case 'error':
                return 'red.500';
            default:
                return 'gray.500';
        }
    };

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
                role: 'user',
                settings: {}
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
                role: 'assistant',
                settings: {}
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

        // Get the list of active knowledge base IDs
        const activeKbIds = Object.entries(activeKnowledgeBases)
            .filter(([_, isActive]) => isActive)
            .map(([kbId]) => kbId);

        // Only include knowledge bases that are both active in the UI and enabled in settings
        const enabledActiveKbIds = activeKbIds.filter(kbId => {
            const kb = knowledgeBases.find(kb => kb.id === kbId);
            return kb && kb.enabled !== false;
        });

        console.log("[Assistant] Active knowledge bases:", enabledActiveKbIds);

        // Dispatch the action to start streaming with knowledge base IDs
        dispatch(startStreaming({
            messageId: newAiMessageId,
            query: userMessage.content,
            conversationHistory: conversationContext,
            locale,
            knowledgeBases: enabledActiveKbIds.length > 0 ? enabledActiveKbIds : undefined
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

    // Handle resize start
    const handleResizeStart = (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setResizing(true);
        setResizeStartPosition({ x: e.clientX, y: e.clientY });
        setResizeStartSize({ width: size.width, height: size.height });
    };

    // Add effect for resize handling
    useEffect(() => {
        const handleMouseMove = (e: MouseEvent) => {
            if (resizing) {
                const deltaX = e.clientX - resizeStartPosition.x;
                const deltaY = e.clientY - resizeStartPosition.y;

                // Calculate new size with minimum constraints
                const newWidth = Math.max(300, resizeStartSize.width + deltaX);
                const newHeight = Math.max(300, resizeStartSize.height + deltaY);

                dispatch(updateSize({
                    width: newWidth,
                    height: newHeight
                }));
            }
        };

        const handleMouseUp = () => {
            setResizing(false);
        };

        if (resizing) {
            document.addEventListener('mousemove', handleMouseMove);
            document.addEventListener('mouseup', handleMouseUp);
        }

        return () => {
            document.removeEventListener('mousemove', handleMouseMove);
            document.removeEventListener('mouseup', handleMouseUp);
        };
    }, [resizing, resizeStartPosition, resizeStartSize, dispatch]);

    // Handle open change with pin logic
    const handleOpenChange = (details: { open: boolean }) => {
        // Only allow closing if not pinned
        if (!isPinned || details.open) {
            dispatch(setIsOpen(details.open));
        }
    };

    // Toggle pin state
    const togglePin = () => {
        dispatch(setPinned(!isPinned));
        // Ensure popover stays open when pinning
        if (!isPinned) {
            dispatch(setIsOpen(true));
        }
    };

    // Initialize active state from user settings when component mounts or when knowledge bases change
    useEffect(() => {
        if (knowledgeBases && knowledgeBases.length > 0) {
            const initialActiveState: Record<string, boolean> = {};
            knowledgeBases.forEach(kb => {
                if (kb.id) {
                    // Default to enabled if not explicitly disabled
                    initialActiveState[kb.id] = kb.enabled !== false;
                }
            });
            setActiveKnowledgeBases(initialActiveState);

            // Also refresh the status of all knowledge bases
            fetchKnowledgeBaseStatuses();
        }
    }, [knowledgeBases, fetchKnowledgeBaseStatuses]);

    // Add a periodic refresh for KB statuses when the assistant is open
    useEffect(() => {
        let intervalId: NodeJS.Timeout;

        if (isOpen && knowledgeBases.length > 0) {
            // Initial fetch
            fetchKnowledgeBaseStatuses();

            // Set up periodic refresh every 30 seconds
            intervalId = setInterval(() => {
                fetchKnowledgeBaseStatuses();
            }, 30000);
        }

        return () => {
            if (intervalId) {
                clearInterval(intervalId);
            }
        };
    }, [isOpen, knowledgeBases.length, fetchKnowledgeBaseStatuses]);

    // Function to toggle knowledge base active state
    const toggleKnowledgeBase = (kbId: string) => {
        setActiveKnowledgeBases(prev => ({
            ...prev,
            [kbId]: !prev[kbId]
        }));

        // You might want to save this state to the user settings or use it when sending queries
        // This could be implemented with a dispatch to update user settings
        // dispatch(updateKnowledgeBaseState({ kbId, enabled: !activeKnowledgeBases[kbId] }));
    };

    // Update the knowledge base rendering to better handle status and enabled state
    const renderKnowledgeBaseSection = () => {
        // Get the list of enabled and active knowledge bases
        const enabledActiveKbIds = Object.keys(activeKnowledgeBases).filter(
            id => activeKnowledgeBases[id] &&
                knowledgeBases.some(kb => kb.id === id && kb.enabled !== false)
        );

        // Get the list of running knowledge bases (those with status "ready" or "running")
        const runningKbIds = enabledActiveKbIds.filter(
            id => {
                const status = kbStatuses[id];
                return status === "ready" || status === "running";
            }
        );

        // Debug logs
        console.log("Active knowledge bases state:", activeKnowledgeBases);
        console.log("Knowledge bases from props:", knowledgeBases);
        console.log("Enabled active KB IDs:", enabledActiveKbIds);
        console.log("Running KB IDs:", runningKbIds);

        return (
            <Box
                p={2}
                borderBottom="1px solid"
                borderColor={borderColor}
                maxHeight="120px"
                overflowY="auto"
                display={isOpen ? 'block' : 'none'}
            >
                <Heading size="xs" mb={2} color={titleTextColor}>
                    <Flex align="center">
                        <Icon as={FiDatabase} mr={1} />
                        {t("knowledge_bases") || "Knowledge Bases"}
                    </Flex>
                </Heading>

                {(!knowledgeBases || knowledgeBases.length === 0) ? (
                    <Text fontSize="xs" color="gray.500" fontStyle="italic">
                        {t("no_knowledge_bases") || "No knowledge bases available. Queries requiring specific knowledge may be less effective."}
                    </Text>
                ) : (
                    <>
                        <Flex wrap="wrap" gap={1} mb={2}>
                            {knowledgeBases.map((kb) => {
                                // Check if KB is enabled in user settings
                                const isEnabled = kb.enabled !== false; // Default to true if not specified

                                // Check if KB is actually running based on status
                                const kbStatus = kbStatuses[kb.id || ''] || 'unknown';
                                const isRunning = kbStatus === 'ready' || kbStatus === 'running';

                                // KB is only selectable if both enabled in settings AND has "ready" or "running" status
                                const isSelectable = isEnabled && isRunning;

                                // Active state from user selection - default to true if enabled and running
                                const isActive = activeKnowledgeBases[kb.id || ''] ?? isSelectable;

                                return (
                                    <Badge
                                        key={kb.id || 'unknown'}
                                        px={2}
                                        py={1}
                                        borderRadius="full"
                                        fontSize="xs"
                                        cursor={isSelectable ? "pointer" : "not-allowed"}
                                        opacity={isSelectable ? 1 : 0.6}
                                        bg={isActive && isSelectable ? activeBadgeBg : inactiveBadgeBg}
                                        color={isActive && isSelectable ? activeBadgeColor : textColor}
                                        borderWidth="1px"
                                        borderColor={isActive && isSelectable ? "blue.400" : borderColor}
                                        onClick={() => isSelectable && kb.id && toggleKnowledgeBase(kb.id)}
                                        _hover={isSelectable ? {
                                            bg: isActive ? activeBadgeHoverBg : inactiveBadgeHoverBg
                                        } : {}}
                                        transition="all 0.2s"
                                        display="flex"
                                        alignItems="center"
                                        title={!isRunning
                                            ? `Knowledge base is ${kbStatus}`
                                            : !isEnabled
                                                ? "Knowledge base is disabled in settings"
                                                : "Click to toggle"}
                                    >
                                        <Box
                                            as="span"
                                            w="6px"
                                            h="6px"
                                            borderRadius="full"
                                            bg={getStatusColor(kbStatus)}
                                            mr={1}
                                        />
                                        {kb.name || 'Unnamed KB'}
                                    </Badge>
                                );
                            })}
                        </Flex>

                        {/* Show warning when no running KBs will be queried */}
                        {runningKbIds.length === 0 && (
                            <Box p={2} mt={2} bg="yellow.100" color="yellow.800" borderRadius="md">
                                <Text fontSize="sm">
                                    {t("no_kb_selected_warning") || "No running knowledge bases available. Your query will use general knowledge only."}
                                </Text>
                            </Box>
                        )}
                    </>
                )}
            </Box>
        );
    };

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
                onOpenChange={handleOpenChange}
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

                <Portal>
                    <Popover.Positioner>
                        <Popover.Content
                            width={`${size?.width || 350}px`}
                            height={`${size?.height || 500}px`}
                            boxShadow="xl"
                            border="1px solid"
                            borderColor={borderColor}
                            onMouseDown={(e) => e.stopPropagation()}
                            position="relative"
                        >
                            <Popover.Arrow bg={bgColor} borderColor={borderColor} />
                            <Flex justifyContent="space-between" alignItems="center" p={2} borderBottom="1px solid" borderColor={borderColor}>
                                <Text fontWeight="bold" color={titleTextColor}>{t("ai_assistant")}</Text>
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
                                            disabled={isPinned}
                                            title={isPinned ? "Unpin first to close" : "Close"}
                                        >
                                            <Icon as={FaTimes} />
                                        </IconButton>
                                    </Popover.CloseTrigger>
                                    <IconButton
                                        aria-label={isPinned ? "Unpin popover" : "Pin popover"}
                                        size="xs"
                                        variant="ghost"
                                        color={isPinned ? activePinColor : pinColor}
                                        transform={isPinned ? "rotate(0deg)" : "rotate(45deg)"}
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            togglePin();
                                        }}
                                        title={isPinned ? "Unpin (allow closing)" : "Pin (prevent closing)"}
                                    >
                                        <Icon as={FaThumbtack} />
                                    </IconButton>
                                </Flex>
                            </Flex>
                            <Popover.Body p={0} height={`calc(${size?.height || 500}px - 80px)`} display="flex" flexDirection="column">
                                {/* Knowledge Base Section */}
                                {renderKnowledgeBaseSection()}

                                {/* Message List */}
                                <AssistantMessageList
                                    messages={messages}
                                    isStreaming={isStreaming}
                                    messagesEndRef={messagesEndRef}
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

                            {/* Resize handle */}
                            <Box
                                position="absolute"
                                bottom="0"
                                right="0"
                                width="15px"
                                height="15px"
                                cursor="nwse-resize"
                                onMouseDown={handleResizeStart}
                                _before={{
                                    content: '""',
                                    position: 'absolute',
                                    bottom: '3px',
                                    right: '3px',
                                    width: '8px',
                                    height: '8px',
                                    borderRight: '2px solid',
                                    borderBottom: '2px solid',
                                    borderColor: borderColor,
                                    opacity: 0.7
                                }}
                            />
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