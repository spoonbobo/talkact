"use client";

import { Box, Flex, Text, Heading } from "@chakra-ui/react";
// @ts-ignore
import { IMessage } from "@/types/chat";
import { ChatBubble } from "./bubble";
import { useSession } from "next-auth/react";
import { useChatMode } from "./chat_mode_context";
import { useColorModeValue } from "@/components/ui/color-mode";
import { motion } from "framer-motion";
import { useTranslations } from "next-intl";

interface ChatModeMessageListProps {
    messagesEndRef: React.RefObject<HTMLDivElement | null>;
}

export const ChatModeMessageList = ({ messagesEndRef }: ChatModeMessageListProps) => {
    const { data: session } = useSession();
    const { chatModeMessages, isStreaming, currentStreamingMessage } = useChatMode();
    const t = useTranslations("Chat");
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

    // Enhanced colors for better UI with more subtle greens
    const emptyStateBg = useColorModeValue("rgba(245, 250, 248, 0.3)", "rgba(30, 40, 38, 0.3)");
    const emptyStateTextColor = useColorModeValue("teal.700", "teal.300");
    const emptyStateSubtleColor = useColorModeValue("teal.600", "teal.400");
    const aiNameColor = useColorModeValue("teal.600", "teal.400");

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
                    bg={emptyStateBg}
                    borderRadius="md"
                    p={8}
                    m={4}
                    boxShadow="sm"
                >
                    <Text color={emptyStateTextColor} fontSize="lg" fontWeight="medium" textAlign="center">
                        {t("chat_mode_welcome")}
                    </Text>
                    <Text color={emptyStateSubtleColor} fontSize="md" textAlign="center" mt={2}>
                        {t("chat_mode_description")}
                    </Text>
                    <Text color={emptyStateSubtleColor} fontSize="sm" textAlign="center" mt={4}>
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
                                color={aiNameColor}
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
                                    <motion.div
                                        key={message.id}
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ duration: 0.2 }}
                                        style={{ width: "100%" }}
                                    >
                                        <ChatBubble
                                            message={message}
                                            isUser={group.isCurrentUser}
                                            isFirstInGroup={messageIndex === 0}
                                            isTaskMode={false}
                                            isStreaming={isStreamingMessage}
                                        />
                                    </motion.div>
                                );
                            })}
                        </Flex>
                    </Box>
                ))
            )}
            <div ref={messagesEndRef} />
        </Box>
    );
}; 