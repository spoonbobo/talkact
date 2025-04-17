import React, { useRef, useMemo, useState, useEffect, useCallback } from "react";
import {
    Box,
    Text,
    Flex,
    Heading,
    Avatar,
    Spinner,
    HStack
} from "@chakra-ui/react";
import { ChatBubble } from "@/components/chat/bubble";
import { IMessage } from "@/types/chat";
import { useChatPageColors } from "@/utils/colors";
import { useTranslations } from 'next-intl';
import { motion } from "framer-motion";

interface AssistantMessageListProps {
    messages: IMessage[];
    isStreaming: boolean;
    aiMessageId: string | null;
    currentStreamingMessage: IMessage | null;
    messagesEndRef: React.RefObject<HTMLDivElement | null>;
    onLoadMore?: () => void;
    isLoadingMore?: boolean;
    hasMoreMessages?: boolean;
    className?: string;
}

const AssistantMessageList: React.FC<AssistantMessageListProps> = ({
    messages,
    isStreaming,
    aiMessageId,
    currentStreamingMessage,
    messagesEndRef = React.createRef<HTMLDivElement>(),
    onLoadMore,
    isLoadingMore = false,
    hasMoreMessages = true,
    className = ''
}) => {
    const colors = useChatPageColors();
    const t = useTranslations("Assistant");
    const scrollContainerRef = React.useRef<HTMLDivElement>(null);
    const shouldScrollToBottom = React.useRef(true);
    const hasMounted = React.useRef(false);
    const [isLoadingOlder, setIsLoadingOlder] = useState(false);

    // Group messages by sender for continuous messages
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

    // Format message date function (if needed)
    const formatMessageDate = (date: Date): string => {
        const today = new Date();
        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);

        if (date.toDateString() === today.toDateString()) {
            return t("today");
        } else if (date.toDateString() === yesterday.toDateString()) {
            return t("yesterday");
        } else {
            return date.toLocaleDateString(undefined, {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric'
            });
        }
    };

    // Scroll position preservation when loading older messages
    const handleScroll = useCallback(() => {
        if (!scrollContainerRef.current) return;

        const { scrollTop, scrollHeight, clientHeight } = scrollContainerRef.current;

        // Check if user is near bottom for auto-scroll
        const isNearBottom = scrollHeight - scrollTop - clientHeight < 100;
        shouldScrollToBottom.current = isNearBottom;

        // Check if user is near top for loading more messages
        const loadMoreThreshold = clientHeight * 0.1;
        if (scrollTop < loadMoreThreshold && onLoadMore && !isLoadingMore && hasMoreMessages) {
            // Store current scroll height and position
            const prevScrollHeight = scrollHeight;
            const prevScrollPosition = scrollTop;

            // Set flag to indicate we're loading older messages
            setIsLoadingOlder(true);

            // Load more messages
            onLoadMore();

            // Use MutationObserver to detect DOM changes and maintain scroll position
            const observer = new MutationObserver(() => {
                if (scrollContainerRef.current) {
                    const newScrollHeight = scrollContainerRef.current.scrollHeight;
                    const heightDifference = newScrollHeight - prevScrollHeight;

                    // Adjust scroll position to maintain the same relative position
                    scrollContainerRef.current.scrollTop = prevScrollPosition + heightDifference;
                }
            });

            // Start observing the container for changes
            if (scrollContainerRef.current) {
                observer.observe(scrollContainerRef.current, {
                    childList: true,
                    subtree: true
                });

                // Stop observing after a reasonable time
                setTimeout(() => {
                    observer.disconnect();
                    setIsLoadingOlder(false);
                }, 1000);
            }
        }
    }, [onLoadMore, isLoadingMore, hasMoreMessages]);

    // Scroll to bottom helper function
    const scrollToBottom = useCallback(() => {
        if (scrollContainerRef.current && !isLoadingOlder) {
            scrollContainerRef.current.scrollTop = scrollContainerRef.current.scrollHeight;
        }
    }, [isLoadingOlder]);

    // Initial scroll to bottom on mount
    useEffect(() => {
        if (!hasMounted.current) {
            scrollToBottom();
            hasMounted.current = true;
        }
    }, [scrollToBottom]);

    // Auto-scroll on new messages if already at bottom
    useEffect(() => {
        if (shouldScrollToBottom.current && !isLoadingOlder) {
            scrollToBottom();
        }
    }, [messages, scrollToBottom, isLoadingOlder]);

    // Show "scroll up for more" indicator
    useEffect(() => {
        if (messages.length > 0 && hasMoreMessages) {
            const instructionEl = document.createElement('div');
            instructionEl.id = 'assistant-scroll-instruction';
            instructionEl.style.textAlign = 'center';
            instructionEl.style.padding = '8px';
            instructionEl.style.fontSize = '12px';
            instructionEl.style.color = colors.textColorSecondary;
            instructionEl.textContent = t("scroll_up_for_more");

            if (scrollContainerRef.current && !document.getElementById('assistant-scroll-instruction')) {
                scrollContainerRef.current.prepend(instructionEl);

                setTimeout(() => {
                    document.getElementById('assistant-scroll-instruction')?.remove();
                }, 5000);
            }
        }
    }, [messages.length, hasMoreMessages, colors.textColorSecondary, t]);

    // Listen for events that should trigger scroll to bottom
    useEffect(() => {
        const handleMessageSent = () => {
            shouldScrollToBottom.current = true;
            scrollToBottom();
        };

        window.addEventListener('assistantScrollToBottom', handleMessageSent);
        return () => {
            window.removeEventListener('assistantScrollToBottom', handleMessageSent);
        };
    }, [scrollToBottom]);

    return (
        <Box
            ref={scrollContainerRef}
            flex="1"
            overflowY="auto"
            p={4}
            bg={colors.bgSubtle}
            position="relative"
            onScroll={handleScroll}
            className={`assistant-message-list-container ${className}`}
            css={{
                "&::-webkit-scrollbar": {
                    width: "8px",
                },
                "&::-webkit-scrollbar-track": {
                    background: colors.scrollbarTrackBg,
                    borderRadius: "4px",
                },
                "&::-webkit-scrollbar-thumb": {
                    background: colors.scrollbarThumbBg,
                    borderRadius: "4px",
                },
                "&::-webkit-scrollbar-thumb:hover": {
                    background: colors.scrollbarThumbHoverBg,
                },
            }}
        >
            {/* Loading indicator at the top */}
            {isLoadingMore && (
                <Flex
                    justify="center"
                    py={3}
                    width="100%"
                    bg={colors.bgSubtle}
                    position="sticky"
                    top="0"
                    zIndex="1"
                    as={motion.div}
                >
                    <HStack gap={2}>
                        <Spinner size="sm" color={colors.textColorSecondary} />
                        <Text fontSize="sm" color={colors.textColorSecondary}>{t("loading_more_messages")}</Text>
                    </HStack>
                </Flex>
            )}

            {/* No more messages indicator */}
            {!hasMoreMessages && messages.length > 0 && (
                <Text
                    textAlign="center"
                    fontSize="sm"
                    color={colors.textColorSecondary}
                    py={3}
                    as={motion.div}
                >
                    {t("no_more_messages")}
                </Text>
            )}

            {/* Messages container */}
            <Flex
                direction="column"
                minHeight="100%"
                justify="flex-end"
            >
                {groupedMessages.length === 0 ? (
                    <Box p={4} textAlign="center">
                        <Text color="gray.500">{t("how_can_i_help_you_today")}</Text>
                    </Box>
                ) : (
                    groupedMessages.map((group, groupIndex) => (
                        <Box
                            key={`${group.sender}-${groupIndex}`}
                            mb={4}
                            alignSelf={group.isCurrentUser ? "flex-end" : "flex-start"}
                            maxWidth="80%"
                        >
                            {/* Sender info - only show for first message in group */}
                            {!group.isCurrentUser && (
                                <Heading
                                    as="h4"
                                    size="xs"
                                    fontWeight="bold"
                                    color={colors.aiNameColor}
                                    ml={1}
                                    mb={1}
                                >
                                    {group.sender}
                                </Heading>
                            )}

                            {/* Messages */}
                            <Flex direction="column" align={group.isCurrentUser ? "flex-end" : "flex-start"}>
                                {group.messages.map((message, messageIndex) => {
                                    // Check if this is the streaming message by ID
                                    const isStreamingMessage = isStreaming && message.id === aiMessageId;

                                    return (
                                        <Box
                                            key={message.id}
                                            opacity={0}
                                            style={{
                                                width: "100%",
                                                animation: "fadeInUp 0.2s forwards",
                                            }}
                                        >
                                            <ChatBubble
                                                message={isStreamingMessage && currentStreamingMessage
                                                    ? currentStreamingMessage
                                                    : message}
                                                isUser={group.isCurrentUser}
                                                isFirstInGroup={messageIndex === 0}
                                                isTaskMode={false}
                                                isStreaming={isStreamingMessage}
                                            />
                                        </Box>
                                    );
                                })}
                            </Flex>
                        </Box>
                    ))
                )}
                <div ref={messagesEndRef} />
            </Flex>

            {/* Add this style for the animation */}
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

export default AssistantMessageList;
