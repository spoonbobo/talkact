"use client";

import { Box, Flex, Text, Heading } from "@chakra-ui/react";
// @ts-ignore
import { IMessage } from "@/types/chat";
import { ChatBubble } from "./bubble";
import { useSession } from "next-auth/react";
import { useChatMode } from "./chat_mode_context";
import { useTranslations } from "next-intl";
import { useEffect } from "react";
import { useChatPageColors } from "@/utils/colors";

interface ChatModeMessageListProps {
    messagesEndRef: React.RefObject<HTMLDivElement | null>;
}

export const ChatModeMessageList = ({ messagesEndRef }: ChatModeMessageListProps) => {
    const { data: session } = useSession();
    const { chatModeMessages, isStreaming, currentStreamingMessage } = useChatMode();
    const t = useTranslations("Chat");

    // Use the centralized colors
    const colors = useChatPageColors();

    // Auto-scroll functionality with performance optimization
    const scrollToBottom = () => {
        // Use requestAnimationFrame to avoid forced reflow
        requestAnimationFrame(() => {
            if (messagesEndRef.current) {
                messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
            }
        });
    };

    // Scroll when messages change - with debounce
    useEffect(() => {
        // Only scroll if there are messages
        if (chatModeMessages.length > 0) {
            scrollToBottom();
        }
    }, [chatModeMessages.length]);

    // Scroll when streaming content updates - with throttling
    useEffect(() => {
        let lastScrollTime = 0;
        const scrollThreshold = 150; // ms

        const handleMessageUpdate = () => {
            const now = Date.now();
            if (now - lastScrollTime > scrollThreshold) {
                lastScrollTime = now;
                scrollToBottom();
            }
        };

        window.addEventListener('chatMessageUpdated', handleMessageUpdate);

        return () => {
            window.removeEventListener('chatMessageUpdated', handleMessageUpdate);
        };
    }, []);

    // Group messages by sender for continuous messages
    const groupedMessages = chatModeMessages.reduce(
        (
            acc: { sender: string; avatar: string; messages: IMessage[]; isCurrentUser: boolean }[],
            message,
            index
        ) => {
            const prevMessage = chatModeMessages[index - 1];

            // Check if this message is from the current user
            const isCurrentUser = message.sender.email === session?.user?.email;

            // Check if this message is from the same sender as the previous one
            const isContinuation =
                prevMessage &&
                prevMessage.sender.email === message.sender.email;

            if (isContinuation) {
                // Add to the last group
                acc[acc.length - 1].messages.push(message);
            } else {
                // Create a new group
                acc.push({
                    sender: message.sender.username,
                    avatar: message.avatar,
                    messages: [message],
                    isCurrentUser: isCurrentUser
                });
            }

            return acc;
        },
        []
    );

    return (
        <Box
            flex="1"
            overflowY="auto"
            px={4}
            py={2}
            display="flex"
            flexDirection="column"
            position="relative"
        >
            {groupedMessages.length === 0 ? (
                <Flex
                    height="100%"
                    alignItems="center"
                    justifyContent="center"
                    flexDirection="column"
                    opacity={0.9}
                    bg={colors.emptyStateBg}
                    borderRadius="md"
                    p={8}
                    m={4}
                    boxShadow="sm"
                >
                    <Text color={colors.emptyStateTextColor} fontSize="lg" fontWeight="medium" textAlign="center">
                        {t("chat_mode_welcome")}
                    </Text>
                    <Text color={colors.emptyStateSubtleColor} fontSize="md" textAlign="center" mt={2}>
                        {t("chat_mode_description")}
                    </Text>
                    <Text color={colors.emptyStateSubtleColor} fontSize="sm" textAlign="center" mt={4}>
                        {t("chat_mode_hint")}
                    </Text>
                </Flex>
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
                                // Check if this is the streaming message
                                const isStreamingMessage =
                                    isStreaming &&
                                    currentStreamingMessage?.id === message.id;

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
                                            message={message}
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