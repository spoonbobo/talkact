import { Avatar, Box, Flex, Text, VStack, Drawer, Portal, CloseButton, Button, HStack, Separator, Icon, IconButton } from "@chakra-ui/react";
import { motion } from "framer-motion";
import { IMessage } from "@/types/chat";
import { User } from "@/types/user";
import { ChatBubble } from "@/components/chat/bubble";
import React, { useState, useEffect, useCallback } from "react";
import { useChatPageColors } from "@/utils/colors";
import { useTranslations } from "next-intl";

interface MessageGroup {
    sender: string | User;
    avatar: string;
    messages: IMessage[];
    isCurrentUser: boolean;
}

interface ChatMessageListProps {
    messageGroups: MessageGroup[];
    messagesEndRef: React.RefObject<HTMLDivElement | null>;
    isTaskMode?: boolean;
}

export const ChatMessageList = ({ messageGroups, messagesEndRef, isTaskMode = true }: ChatMessageListProps) => {
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

    // Function to handle scroll events
    const handleScroll = () => {
        if (!scrollContainerRef.current) return;

        const { scrollTop, scrollHeight, clientHeight } = scrollContainerRef.current;
        // If user scrolls up more than 100px from bottom, disable auto-scroll
        const isNearBottom = scrollHeight - scrollTop - clientHeight < 100;
        shouldScrollToBottom.current = isNearBottom;
    };

    // Improved function to scroll to bottom with less jank
    const scrollToBottom = useCallback(() => {
        if (scrollContainerRef.current) {
            // Cancel any previous animation frame to prevent multiple scrolls
            if (scrollToBottomRAF.current) {
                cancelAnimationFrame(scrollToBottomRAF.current);
            }

            // Use requestAnimationFrame to ensure DOM is ready
            scrollToBottomRAF.current = requestAnimationFrame(() => {
                if (scrollContainerRef.current) {
                    // Force scroll to bottom immediately
                    scrollContainerRef.current.scrollTop = scrollContainerRef.current.scrollHeight;

                    // Double-check with a small delay to ensure it worked
                    setTimeout(() => {
                        if (scrollContainerRef.current) {
                            scrollContainerRef.current.scrollTop = scrollContainerRef.current.scrollHeight;
                        }
                    }, 50);
                }
                scrollToBottomRAF.current = null;
            });
        }
    }, []);

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

    // Scroll to bottom when component mounts
    useEffect(() => {
        // Initial scroll to bottom
        scrollToBottom();

        // Set multiple timeouts to ensure it works across different browsers/situations
        const timeoutIds = [
            setTimeout(scrollToBottom, 100),
            setTimeout(scrollToBottom, 300),
            setTimeout(() => {
                scrollToBottom();
                hasMounted.current = true;
                // Set loading to false after a short delay to allow smooth animation
                setTimeout(() => setIsLoading(false), 100);
            }, 500)
        ];

        return () => timeoutIds.forEach(id => clearTimeout(id));
    }, [scrollToBottom]);

    // Scroll to bottom when new messages arrive, but only if we're already at the bottom
    // or if this is the initial load
    useEffect(() => {
        if (shouldScrollToBottom.current || !hasMounted.current) {
            scrollToBottom();
            // Add a second attempt after a short delay
            const timeoutId = setTimeout(scrollToBottom, 100);
            return () => clearTimeout(timeoutId);
        }
    }, [messageGroups, scrollToBottom]);

    // Function to handle avatar click
    const handleUserProfileClick = (username: string, userId?: string, avatar?: string) => {
        setSelectedUser({ username, userId, avatar });
        setIsUserProfileOpen(true);
    };

    return (
        <>
            <Box
                ref={scrollContainerRef}
                flex="1"
                overflowY="auto"
                p={4}
                bg={isTaskMode ? colors.bgSubtle : colors.chatModeBg}
                position="relative"
                onScroll={handleScroll}
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
                {/* Display messages in a flex container that pushes content to the bottom */}
                <Flex
                    direction="column"
                    minHeight="100%"
                    justify="flex-end"
                >
                    {messageGroups.map((group, groupIndex) => (
                        <Box
                            key={`${group.sender}-${groupIndex}`}
                            width="100%"
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
                                        <Avatar.Image src={group.avatar} />
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
                                                style={{
                                                    width: "100%",
                                                    display: "flex",
                                                    flexDirection: "column",
                                                    alignItems: group.isCurrentUser ? "flex-end" : "flex-start"
                                                }}
                                            >
                                                <motion.div
                                                    initial={hasMounted.current ? { scale: 0.95, opacity: 0.5 } : { scale: 1, opacity: 1 }}
                                                    animate={{ scale: 1, opacity: 1 }}
                                                    transition={{
                                                        duration: 0.1,
                                                        delay: 0 // No delay between messages
                                                    }}
                                                >
                                                    <ChatBubble
                                                        key={message.id}
                                                        message={message}
                                                        isUser={group.isCurrentUser}
                                                        isFirstInGroup={msgIndex === 0}
                                                        isTaskMode={isTaskMode}
                                                        isStreaming={!message.content}
                                                    />
                                                </motion.div>

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
                    ))}

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