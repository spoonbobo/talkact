import React, { useRef, useMemo } from "react";
import {
    Box,
    Text,
    Flex,
    Heading,
} from "@chakra-ui/react";
import { ChatBubble } from "@/components/chat/bubble";
import { IMessage } from "@/types/chat";
import { useChatPageColors } from "@/utils/colors";
import { useTranslations } from 'next-intl';

interface AssistantMessageListProps {
    messages: IMessage[];
    isStreaming: boolean;
    aiMessageId: string | null;
    currentStreamingMessage: IMessage | null;
}

const AssistantMessageList: React.FC<AssistantMessageListProps> = ({
    messages,
    isStreaming,
    aiMessageId,
    currentStreamingMessage
}) => {
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const colors = useChatPageColors();
    const t = useTranslations("Assistant");
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
