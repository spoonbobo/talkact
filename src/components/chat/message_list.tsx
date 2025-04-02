import { Avatar, Box, Flex, Text, VStack, Drawer, Portal, CloseButton, Button, HStack, Separator } from "@chakra-ui/react";
import { motion } from "framer-motion";
import { IMessage } from "@/types/chat";
import { ChatBubble } from "@/components/chat/bubble";
import React, { useState } from "react";
import { useChatPageColors } from "@/utils/colors";
import { useTranslations } from "next-intl";

interface MessageGroup {
    sender: string;
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
    // console.log(messageGroups, "messageGroups");
    const colors = useChatPageColors();
    const t = useTranslations("Chat");

    // Add state for user profile drawer
    const [isUserProfileOpen, setIsUserProfileOpen] = useState(false);
    const [selectedUser, setSelectedUser] = useState<{
        username: string;
        userId?: string;
        avatar?: string;
    } | null>(null);

    // console.log(selectedUser, "selectedUser");

    // Function to handle avatar click
    const handleUserProfileClick = (username: string, userId?: string, avatar?: string) => {
        setSelectedUser({ username, userId, avatar });
        setIsUserProfileOpen(true);
    };

    return (
        <>
            <Box
                flex="1"
                overflowY="auto"
                p={4}
                bg={isTaskMode ? colors.bgSubtle : colors.chatModeBg}
                position="relative"
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
                {messageGroups.map((group, groupIndex) => (
                    <Flex
                        key={`${group.sender}-${groupIndex}`}
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
                        mb={4}
                    >
                        {/* Avatar for other users - improved positioning */}
                        {!group.isCurrentUser && (
                            <Avatar.Root
                                size="sm"
                                mt={2}
                                cursor="pointer"
                                // TODO: do not delete
                                // @ts-ignore
                                onClick={() => handleUserProfileClick(group.sender, group.senderId, group.avatar)}
                            >
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
                                    color={colors.textColorHeading}
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
                                            isTaskMode={isTaskMode}
                                        />

                                        {/* Timestamp with improved colors */}
                                        {msgIndex === group.messages.length - 1 && (
                                            <Text
                                                fontSize="xs"
                                                color={colors.textColorSecondary}
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