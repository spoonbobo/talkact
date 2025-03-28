import { Avatar, Box, Flex, Text, VStack } from "@chakra-ui/react";
import { motion } from "framer-motion";
import { IMessage } from "@/types/chat";
import { ChatBubble } from "@/components/chat/bubble";
import { useColorModeValue } from "@/components/ui/color-mode";
import React from "react";

interface MessageGroup {
    sender: string;
    avatar: string;
    messages: IMessage[];
    isCurrentUser: boolean;
}

interface ChatMessageListProps {
    messageGroups: MessageGroup[];
    messagesEndRef: React.RefObject<HTMLDivElement>;
}

export const ChatMessageList = ({ messageGroups, messagesEndRef }: ChatMessageListProps) => {
    const textColor = useColorModeValue("gray.600", "gray.400");
    const scrollbarTrackBg = useColorModeValue("#f1f1f1", "#2d3748");
    const scrollbarThumbBg = useColorModeValue("#c5c5c5", "#4a5568");
    const scrollbarThumbHoverBg = useColorModeValue("#a8a8a8", "#718096");
    const bgSubtle = useColorModeValue("bg.subtle", "gray.800");

    return (
        <Box
            flex="1"
            overflowY="auto"
            p={4}
            bg={bgSubtle}
            display="flex"
            flexDirection="column"
            gap={4}
            css={{
                "&::-webkit-scrollbar": {
                    width: "8px",
                },
                "&::-webkit-scrollbar-track": {
                    background: scrollbarTrackBg,
                    borderRadius: "4px",
                },
                "&::-webkit-scrollbar-thumb": {
                    background: scrollbarThumbBg,
                    borderRadius: "4px",
                },
                "&::-webkit-scrollbar-thumb:hover": {
                    background: scrollbarThumbHoverBg,
                },
            }}
        >
            {messageGroups.map((group, groupIndex) => (
                <Flex
                    key={groupIndex}
                    gap={3}
                    justifyContent={
                        group.isCurrentUser ? "flex-end" : "flex-start"
                    }
                    alignItems="flex-start"
                    as={motion.div}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    // @ts-ignore
                    transition={{ duration: 0.2, delay: groupIndex * 0.02 }}
                >
                    {/* Avatar for other users - improved positioning */}
                    {!group.isCurrentUser && (
                        <Avatar.Root size="sm" mt={2}>
                            <Avatar.Fallback name={group.sender} />
                            <Avatar.Image src={group.avatar} />
                        </Avatar.Root>
                    )}

                    <VStack
                        align={group.isCurrentUser ? "flex-end" : "flex-start"}
                        maxWidth="70%"
                        // @ts-ignore
                        spacing={1}
                    >
                        {/* User name display - only for other users */}
                        {!group.isCurrentUser && (
                            <Text
                                fontSize="xs"
                                fontWeight="bold"
                                color={textColor}
                                ml={1}
                                mb={0}
                            >
                                {group.sender}
                            </Text>
                        )}

                        {group.messages.map(
                            (message: IMessage, msgIndex: number) => (
                                <motion.div
                                    key={message.id}
                                    initial={{ opacity: 0, scale: 0.95 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    transition={{ duration: 0.15, delay: msgIndex * 0.02 }}
                                >
                                    <ChatBubble
                                        key={message.id}
                                        message={message}
                                        isUser={group.isCurrentUser}
                                        isFirstInGroup={msgIndex === 0}
                                    />

                                    {/* Add timestamp to the last message in each group */}
                                    {msgIndex === group.messages.length - 1 && (
                                        <Text
                                            fontSize="xs"
                                            color={textColor}
                                            textAlign={group.isCurrentUser ? "right" : "left"}
                                            mt={1}
                                            mr={group.isCurrentUser ? 2 : 0}
                                            ml={group.isCurrentUser ? 0 : 2}
                                        >
                                            {new Date(message.created_at).toLocaleTimeString([], {
                                                hour: '2-digit',
                                                minute: '2-digit'
                                            })}
                                        </Text>
                                    )}
                                </motion.div>
                            )
                        )}
                    </VStack>

                    {/* Avatar for current user - improved positioning */}
                    {group.isCurrentUser && (
                        <Avatar.Root size="sm" mt={1}>
                            <Avatar.Fallback name={group.sender} />
                            <Avatar.Image src={group.avatar} />
                        </Avatar.Root>
                    )}
                </Flex>
            ))}

            {/* Add invisible div at the end for auto-scrolling */}
            <div ref={messagesEndRef} />
        </Box>
    );
};