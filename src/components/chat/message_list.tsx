// TODO: message delete schema

import { Avatar, Box, Flex, Text, VStack, Drawer, Portal, CloseButton, Button, HStack, Separator, Icon, IconButton, Spinner } from "@chakra-ui/react";
import { motion } from "framer-motion";
import { IMessage } from "@/types/chat";
import { User } from "@/types/user";
import { ChatBubble } from "@/components/chat/bubble";
import React, { useState, useEffect, useCallback } from "react";
import { useChatPageColors } from "@/utils/colors";
import { useTranslations } from "next-intl";
import { useSelector } from "react-redux";

interface MessageGroup {
    sender: string | User;
    avatar: string;
    messages: IMessage[];
    isCurrentUser: boolean;
}

interface ChatMessageListProps {
    messageGroups: MessageGroup[];
    messagesEndRef: React.RefObject<HTMLDivElement | null>;
    onLoadMore?: () => void;
    isLoadingMore?: boolean;
    hasMoreMessages?: boolean;
    className?: string;
    isStreaming?: boolean;
    streamingMessageId?: string | null;
}

export const ChatMessageList = ({
    messageGroups,
    messagesEndRef,
    onLoadMore,
    isLoadingMore = false,
    hasMoreMessages = true,
    className = '',
    isStreaming = false,
    streamingMessageId = null
}: ChatMessageListProps) => {
    const colors = useChatPageColors();
    const t = useTranslations("Chat");
    const [isUserProfileOpen, setIsUserProfileOpen] = useState(false);
    const [selectedUser, setSelectedUser] = useState<{
        username: string;
        userId?: string;
        avatar?: string;
    } | null>(null);
    // Remove loading state since we're removing animations
    const [isLoading, setIsLoading] = useState(false);

    // Add ref to track scroll position
    const scrollContainerRef = React.useRef<HTMLDivElement>(null);
    // Track if we should auto-scroll to bottom
    const shouldScrollToBottom = React.useRef(true);
    // Add ref to track if component has mounted
    const hasMounted = React.useRef(false);

    // Add a ref to track the current room
    const currentRoomRef = React.useRef<string | null>(null);

    // Add refs for animation frame and room change tracking
    const scrollToBottomRAF = React.useRef<number | null>(null);
    const currentRoomChanged = React.useRef<boolean>(false);

    // Add this state to track when we're loading older messages
    const [isLoadingOlder, setIsLoadingOlder] = useState(false);

    // Add this ref to track if the first scroll event has occurred
    const hasUserScrolled = React.useRef(false);

    // Move formatMessageDate inside the component to access the t function
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

    // Modify the handleScroll function to prevent onLoadMore on initial mount
    const handleScroll = useCallback(() => {
        if (!scrollContainerRef.current) return;

        const { scrollTop, scrollHeight, clientHeight } = scrollContainerRef.current;

        // Mark that the user has scrolled at least once
        if (!hasUserScrolled.current && scrollTop !== 0) {
            hasUserScrolled.current = true;
        }

        // Check if user is near bottom for auto-scroll
        const isNearBottom = scrollHeight - scrollTop - clientHeight < 100;
        shouldScrollToBottom.current = isNearBottom;

        // Only trigger onLoadMore if the user has scrolled before
        const loadMoreThreshold = clientHeight * 0.1;
        if (
            scrollTop < loadMoreThreshold &&
            onLoadMore &&
            !isLoadingMore &&
            hasMoreMessages &&
            hasUserScrolled.current // Only after user scrolls
        ) {
            // Store current scroll height and position
            const prevScrollHeight = scrollHeight;
            const prevScrollPosition = scrollTop;

            setIsLoadingOlder(true);

            onLoadMore();

            const observer = new MutationObserver(() => {
                if (scrollContainerRef.current) {
                    const newScrollHeight = scrollContainerRef.current.scrollHeight;
                    const heightDifference = newScrollHeight - prevScrollHeight;
                    scrollContainerRef.current.scrollTop = prevScrollPosition + heightDifference;
                }
            });

            if (scrollContainerRef.current) {
                observer.observe(scrollContainerRef.current, {
                    childList: true,
                    subtree: true
                });

                setTimeout(() => {
                    observer.disconnect();
                    setIsLoadingOlder(false);
                }, 1000);
            }
        }
    }, [onLoadMore, isLoadingMore, hasMoreMessages]);

    // Simplify the scrollToBottom function
    const scrollToBottom = useCallback(() => {
        if (scrollContainerRef.current && !isLoadingOlder) {
            scrollContainerRef.current.scrollTop = scrollContainerRef.current.scrollHeight;
        }
    }, [isLoadingOlder]);

    // Listen for room changes
    useEffect(() => {
        const handleRoomChange = () => {
            currentRoomChanged.current = true;
            // Ensure we scroll to bottom on room change
            shouldScrollToBottom.current = true;

            // Use multiple attempts to scroll to bottom to ensure it works
            scrollToBottom();
            setTimeout(scrollToBottom, 50);
            setTimeout(scrollToBottom, 150);
            setTimeout(scrollToBottom, 300);
        };

        window.addEventListener('chatRoomChanged', handleRoomChange);
        return () => {
            window.removeEventListener('chatRoomChanged', handleRoomChange);
        };
    }, [scrollToBottom]);

    // Simplify the useEffect for initial scroll
    useEffect(() => {
        // Only scroll to bottom once on initial mount
        if (!hasMounted.current) {
            scrollToBottom();
            hasMounted.current = true;
        }
    }, [scrollToBottom]);

    // Also modify the useEffect that responds to messageGroups changes
    useEffect(() => {
        // Only scroll to bottom for new messages at the bottom, not when loading older messages
        if (shouldScrollToBottom.current && !isLoadingOlder) {
            scrollToBottom();
        }
    }, [messageGroups, scrollToBottom, isLoadingOlder]);

    // Add this effect to ensure the loading indicator is visible initially
    useEffect(() => {
        // If we have messages and hasMoreMessages is true, show a visual indicator
        if (messageGroups.length > 0 && hasMoreMessages) {
            // Add a small instruction text at the top
            const instructionEl = document.createElement('div');
            instructionEl.id = 'scroll-instruction';
            instructionEl.style.textAlign = 'center';
            instructionEl.style.padding = '8px';
            instructionEl.style.fontSize = '12px';
            instructionEl.style.color = colors.textColorSecondary;
            instructionEl.textContent = t("scroll_up_for_more");

            // Add it to the top of the container if it doesn't exist yet
            if (scrollContainerRef.current && !document.getElementById('scroll-instruction')) {
                scrollContainerRef.current.prepend(instructionEl);

                // Remove it after 5 seconds
                setTimeout(() => {
                    document.getElementById('scroll-instruction')?.remove();
                }, 5000);
            }
        }
    }, [messageGroups.length, hasMoreMessages, colors.textColorSecondary, t]);

    // Listen for message sent events to scroll to bottom
    useEffect(() => {
        const handleMessageSent = () => {
            // Force scroll to bottom when a message is sent
            shouldScrollToBottom.current = true;
            scrollToBottom();
        };

        window.addEventListener('scrollToBottom', handleMessageSent);
        return () => {
            window.removeEventListener('scrollToBottom', handleMessageSent);
        };
    }, [scrollToBottom]);

    // Add effect to listen for message deletion events
    useEffect(() => {
        const handleMessageDeleted = (event: CustomEvent) => {
            // You might want to refresh the messages or update the UI
            // This depends on how your app manages state
            console.log("Message deleted:", event.detail.messageId);

            // If you're using a state management library or context,
            // you could dispatch an action here to remove the message
        };

        window.addEventListener('messageDeleted', handleMessageDeleted as EventListener);
        return () => {
            window.removeEventListener('messageDeleted', handleMessageDeleted as EventListener);
        };
    }, []);

    // Function to handle avatar click
    const handleUserProfileClick = (username: string, userId?: string, avatar?: string) => {
        setSelectedUser({ username, userId, avatar });
        setIsUserProfileOpen(true);
    };

    // Function to render day separators between message groups
    const renderMessageGroups = () => {
        let lastDate: string | null = null;
        const result: React.ReactNode[] = [];

        // Add initial date separator for the first group
        if (messageGroups.length > 0 && messageGroups[0].messages.length > 0) {
            const firstMessageDate = new Date(messageGroups[0].messages[0].created_at);
            const firstDateStr = firstMessageDate.toDateString();

            result.push(
                <Flex
                    key={`date-first-${firstDateStr}`}
                    justify="center"
                    width="100%"
                    my={4}
                    position="relative"
                >
                    <Box
                        position="absolute"
                        width="100%"
                        height="1px"
                        bg={colors.borderColor}
                        top="50%"
                    />
                    <Text
                        fontSize="xs"
                        fontWeight="medium"
                        color={colors.textColorSecondary}
                        bg={colors.bgSubtle}
                        px={3}
                        zIndex={1}
                        borderRadius="full"
                    >
                        {formatMessageDate(firstMessageDate)}
                    </Text>
                </Flex>
            );

            lastDate = firstDateStr;
        }

        messageGroups.forEach((group, groupIndex) => {
            // Get the date of the first message in the group
            if (group.messages.length > 0) {
                const messageDate = new Date(group.messages[0].created_at);
                const currentDateStr = messageDate.toDateString();

                // Only add a day separator when crossing to a different day
                if (lastDate !== null && currentDateStr !== lastDate) {
                    result.push(
                        <Flex
                            key={`date-${currentDateStr}`}
                            justify="center"
                            width="100%"
                            my={4}
                            position="relative"
                        >
                            <Box
                                position="absolute"
                                width="100%"
                                height="1px"
                                bg={colors.borderColor}
                                top="50%"
                            />
                            <Text
                                fontSize="xs"
                                fontWeight="medium"
                                color={colors.textColorSecondary}
                                bg={colors.bgSubtle}
                                px={3}
                                zIndex={1}
                                borderRadius="full"
                            >
                                {formatMessageDate(messageDate)}
                            </Text>
                        </Flex>
                    );
                }

                // Update the last date
                lastDate = currentDateStr;
            }

            // Add the message group
            result.push(
                <Box
                    key={`${group.sender}-${groupIndex}`}
                    width="100%"
                    className="message-group-item"
                >
                    <Flex
                        gap={group.isCurrentUser ? 2 : 3}
                        justifyContent={
                            group.isCurrentUser ? "flex-end" : "flex-start"
                        }
                        alignItems="flex-start"
                        mb={3}
                        px={2}
                        width="100%"
                    >
                        {/* Avatar for other users */}
                        {!group.isCurrentUser && (
                            <Avatar.Root
                                size="sm"
                                mt={1}
                                cursor="pointer"
                                onClick={() => handleUserProfileClick(
                                    typeof group.sender === 'string' ? group.sender : group.sender?.username || 'Unknown',
                                    typeof group.sender === 'string' ? undefined : group.sender?.user_id,
                                    group.avatar
                                )}
                            >
                                <Avatar.Fallback name={typeof group.sender === 'string' ? group.sender : group.sender?.username || 'Unknown'} />
                                <Avatar.Image src={group.avatar === "" ? undefined : group.avatar} />
                            </Avatar.Root>
                        )}

                        <VStack
                            align={group.isCurrentUser ? "flex-end" : "flex-start"}
                            maxWidth="70%"
                            gap={0.5}
                            width="auto"
                        >
                            {/* User name display - only for other users */}
                            {!group.isCurrentUser && (
                                <Text
                                    fontSize="xs"
                                    fontWeight="bold"
                                    color={colors.textColorHeading}
                                    ml={1}
                                    mb={0}
                                >
                                    {typeof group.sender === 'string' ? group.sender : group.sender?.username || 'Unknown'}
                                </Text>
                            )}

                            {group.messages.map(
                                (message: IMessage, msgIndex: number) => (
                                    <div
                                        key={message.id}
                                        data-message-id={message.id}
                                        style={{
                                            width: "100%",
                                            display: "flex",
                                            flexDirection: "column",
                                            alignItems: group.isCurrentUser ? "flex-end" : "flex-start"
                                        }}
                                    >
                                        <div>
                                            <ChatBubble
                                                key={message.id}
                                                message={message}
                                                isUser={group.isCurrentUser}
                                                isFirstInGroup={msgIndex === 0}
                                                isStreaming={isStreaming && streamingMessageId === message.id}
                                                isLoadingOlder={isLoadingOlder}
                                            />
                                        </div>

                                        {/* Timestamp with improved colors and positioning */}
                                        {msgIndex === group.messages.length - 1 && (
                                            <Text
                                                fontSize="xs"
                                                color={colors.textColorSecondary}
                                                mt={1}
                                                width="auto"
                                                display="block"
                                            >
                                                {new Date(message.created_at).toLocaleTimeString([], {
                                                    hour: '2-digit',
                                                    minute: '2-digit'
                                                })}
                                            </Text>
                                        )}
                                    </div>
                                )
                            )}
                        </VStack>

                        {/* Avatar for current user */}
                        {group.isCurrentUser && (
                            <Avatar.Root
                                size="sm"
                                mt={1}
                                cursor="pointer"
                                onClick={() => handleUserProfileClick(
                                    typeof group.sender === 'string' ? group.sender : group.sender?.username || 'Unknown',
                                    typeof group.sender === 'string' ? undefined : group.sender?.user_id,
                                    group.avatar
                                )}
                            >
                                <Avatar.Fallback name={typeof group.sender === 'string' ? group.sender : group.sender?.username || 'Unknown'} />
                                <Avatar.Image src={group.avatar} />
                            </Avatar.Root>
                        )}
                    </Flex>
                </Box>
            );
        });

        return result;
    };

    return (
        <>
            <Box
                ref={scrollContainerRef}
                flex="1"
                overflowY="auto"
                p={4}
                bg={colors.bgSubtle}
                position="relative"
                onScroll={handleScroll}
                className={`message-list-container ${className}`}
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
                {/* Loading indicator at the top - removed animation */}
                {isLoadingMore && (
                    <Flex
                        justify="center"
                        py={3}
                        width="100%"
                        bg={colors.bgSubtle}
                        position="sticky"
                        top="0"
                        zIndex="1"
                    >
                        <HStack gap={2}>
                            <Spinner size="sm" color={colors.textColorSecondary} />
                            <Text fontSize="sm" color={colors.textColorSecondary}>{t("loading_more_messages")}</Text>
                        </HStack>
                    </Flex>
                )}

                {/* No more messages indicator - removed animation */}
                {!hasMoreMessages && messageGroups.length > 0 && (
                    <Text
                        textAlign="center"
                        fontSize="sm"
                        color={colors.textColorSecondary}
                        py={3}
                    >
                        {t("no_more_messages")}
                    </Text>
                )}

                {/* Display messages in a flex container that pushes content to the bottom */}
                <Flex
                    direction="column"
                    minHeight="100%"
                    justify="flex-end"
                >
                    {/* Render message groups with day separators */}
                    {renderMessageGroups()}

                    {/* Add invisible div at the end for auto-scrolling */}
                    <div ref={messagesEndRef} />
                </Flex>
            </Box>

            {/* User Profile Drawer with improved colors */}
            <Drawer.Root open={isUserProfileOpen} onOpenChange={(e) => setIsUserProfileOpen(e.open)}>
                <Portal>
                    <Drawer.Backdrop />
                    <Drawer.Positioner>
                        <Drawer.Content bg={colors.bgSubtle} borderColor={colors.borderColor}>
                            <Drawer.Header borderBottomColor={colors.borderColor}>
                                <Drawer.Title color={colors.textColorHeading}>
                                    {selectedUser?.username || t("user_profile")}
                                </Drawer.Title>
                            </Drawer.Header>
                            <Drawer.Body>
                                {selectedUser ? (
                                    <VStack align="stretch" gap={4}>
                                        <Box textAlign="center" py={4}>
                                            <Avatar.Root size="xl" mb={4}>
                                                <Avatar.Fallback name={selectedUser.username} />
                                                <Avatar.Image src={selectedUser.avatar || undefined} />
                                            </Avatar.Root>
                                            <Text fontSize="xl" fontWeight="bold" color={colors.textColorHeading}>
                                                {selectedUser.username}
                                            </Text>
                                        </Box>

                                        <Separator />

                                        <Box>
                                            <Text fontWeight="bold" mb={2} color={colors.textColorHeading}>{t("user_info")}</Text>
                                            {selectedUser.userId && (
                                                <Text fontSize="sm" color={colors.textColor}>ID: {selectedUser.userId}</Text>
                                            )}
                                        </Box>
                                    </VStack>
                                ) : (
                                    <Text color={colors.textColor}>{t("user_not_found")}</Text>
                                )}
                            </Drawer.Body>
                            <Drawer.Footer borderTopColor={colors.borderColor}>
                                <Button
                                    variant="outline"
                                    onClick={() => setIsUserProfileOpen(false)}
                                    borderColor={colors.borderColor}
                                    color={colors.textColor}
                                >
                                    {t("close")}
                                </Button>
                            </Drawer.Footer>
                            <Drawer.CloseTrigger asChild>
                                <CloseButton size="sm" position="absolute" right={3} top={3} color={colors.textColor} />
                            </Drawer.CloseTrigger>
                        </Drawer.Content>
                    </Drawer.Positioner>
                </Portal>
            </Drawer.Root>
        </>
    );
};