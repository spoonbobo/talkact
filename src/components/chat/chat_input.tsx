import React, { useState, useCallback, useEffect } from "react";
import { Flex, Input, Box, Icon } from "@chakra-ui/react";
import { FaPaperPlane } from "react-icons/fa";
import { useColorModeValue } from "@/components/ui/color-mode";
import { useTranslations } from "next-intl";
import { motion, AnimatePresence } from "framer-motion";
import { User } from "@/types/user";
import { IChatRoom } from "@/types/chat";

const MotionBox = motion.create(Box);

interface MentionState {
    isActive: boolean;
    startPosition: number;
    searchText: string;
}

interface ChatInputProps {
    messageInput: string;
    setMessageInput: (value: string) => void;
    handleSendMessage: () => void;
    selectedRoomId: string | null;
    users?: User[];
    agents?: User[];
    currentUser?: {
        id?: string;
        username?: string;
        token?: string;
        tokenCreatedAt?: number;
        user_id?: string;
    } | null;
    isTaskMode?: boolean;
    currentRoom?: IChatRoom | null;
    roomUsers?: User[];
}

export const ChatInput = ({
    messageInput,
    setMessageInput,
    handleSendMessage,
    selectedRoomId,
    users = [],
    agents = [],
    currentUser = null,
    isTaskMode = true,
    currentRoom = null,
    roomUsers = [],
}: ChatInputProps) => {
    const t = useTranslations("Chat");
    const [mentionState, setMentionState] = useState<MentionState>({
        isActive: false,
        startPosition: 0,
        searchText: ''
    });
    const [selectedSuggestionIndex, setSelectedSuggestionIndex] = useState(0);

    const borderColor = useColorModeValue("gray.200", "gray.700");
    const bgSubtle = useColorModeValue("bg.subtle", "gray.800");
    const textColor = useColorModeValue("gray.600", "gray.400");
    const textColorStrong = useColorModeValue("gray.700", "gray.300");
    const inputBg = useColorModeValue("white", "gray.700");
    const mentionBg = useColorModeValue("white", "gray.800");
    const mentionBorderColor = useColorModeValue("gray.200", "gray.600");
    const mentionHoverBg = useColorModeValue("gray.100", "gray.600");
    const mentionSelectedBg = useColorModeValue("blue.100", "blue.700");

    // New color variables for mention avatars
    const agentAvatarBg = useColorModeValue("green.100", "green.800");
    const agentAvatarColor = useColorModeValue("green.700", "green.200");
    const userAvatarBg = useColorModeValue("blue.100", "blue.800");
    const userAvatarColor = useColorModeValue("blue.700", "blue.200");

    const getMentionSuggestions = useCallback(() => {
        if (!mentionState.isActive) return [];

        // Use roomUsers directly if available, otherwise fall back to filtering users
        const currentRoomUsers = roomUsers.length > 0
            ? roomUsers.filter(user =>
                user.user_id !== currentUser?.user_id &&
                user.id !== currentUser?.id?.toString()
            )
            : users.filter(user =>
                currentRoom?.active_users?.includes(user.user_id || '') &&
                user.user_id !== currentUser?.user_id &&
                user.id !== currentUser?.id?.toString()
            );

        // Get other users who are not in the current room
        // const otherUsers = users.filter(user =>
        //     !currentRoomUsers.some(roomUser => roomUser.user_id === user.user_id) &&
        //     user.user_id !== currentUser?.user_id &&
        //     user.id !== currentUser?.id?.toString()
        // );

        // Combine filtered users with agents
        // const allUsers = [...currentRoomUsers, ...otherUsers, ...agents];

        const allUsers = [...currentRoomUsers, ...agents];
        // No longer adding default "agent" mention when no agents are available

        const uniqueUsers = Array.from(new Map(allUsers.map(user => [user.username, user])).values());

        // If search text is empty, return all users
        // If search text is not empty, filter by username
        // Always prioritize agents by putting them first in the list
        const filteredSuggestions = mentionState.searchText.trim() === ''
            ? uniqueUsers
            : uniqueUsers.filter(user =>
                user.username.toLowerCase().includes(mentionState.searchText.toLowerCase()));

        // Sort to put agents at the top of the list
        return filteredSuggestions.sort((a, b) => {
            // First check if either is an agent (by role or username)
            const aIsAgent = a.role === "agent" || a.username === "agent";
            const bIsAgent = b.role === "agent" || b.username === "agent";

            if (aIsAgent && !bIsAgent) return -1;
            if (!aIsAgent && bIsAgent) return 1;

            // If both or neither are agents, sort alphabetically
            return a.username.localeCompare(b.username);
        });
    }, [users, agents, mentionState, currentUser, currentRoom, roomUsers]);

    // Set selection index to the last item when search text changes
    useEffect(() => {
        const suggestions = getMentionSuggestions();
        setSelectedSuggestionIndex(Math.max(0, suggestions.length - 1));
    }, [mentionState.searchText, getMentionSuggestions]);

    // Set selection index to the last item when mention becomes active
    useEffect(() => {
        if (mentionState.isActive) {
            const suggestions = getMentionSuggestions();
            setSelectedSuggestionIndex(Math.max(0, suggestions.length - 1));
        }
    }, [mentionState.isActive, getMentionSuggestions]);

    // Prevent scrolling when mention dropdown is active
    useEffect(() => {
        if (mentionState.isActive) {
            // Prevent scrolling on the parent container
            const parentElement = document.querySelector('[data-scroll-container="true"]');
            if (parentElement) {
                parentElement.setAttribute('style', 'overflow: hidden;');
            }

            // Also prevent horizontal scrolling on the body
            document.body.style.overflowX = 'hidden';

            return () => {
                if (parentElement) {
                    parentElement.setAttribute('style', 'overflow: auto;');
                }
                document.body.style.overflowX = '';
            };
        }
    }, [mentionState.isActive]);

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const newValue = e.target.value;
        setMessageInput(newValue);

        // Handle @ mentions
        const lastAtIndex = newValue.lastIndexOf('@');
        if (lastAtIndex >= 0 && (lastAtIndex === 0 || newValue[lastAtIndex - 1] === ' ')) {
            // Extract search text after @
            const searchText = newValue.substring(lastAtIndex + 1);

            // If there's a space after the search text, disable mention
            if (searchText.includes(' ')) {
                setMentionState({ isActive: false, startPosition: 0, searchText: '' });
            } else {
                setMentionState({
                    isActive: true,
                    startPosition: lastAtIndex,
                    searchText: searchText
                });
            }
        } else {
            setMentionState({ isActive: false, startPosition: 0, searchText: '' });
        }
    };

    const handleSelectMention = useCallback((username: string) => {
        const beforeMention = messageInput.substring(0, mentionState.startPosition);
        const afterMention = messageInput.substring(mentionState.startPosition + mentionState.searchText.length + 1);

        setMessageInput(`${beforeMention}@${username} ${afterMention}`);
        setMentionState({ isActive: false, startPosition: 0, searchText: '' });
    }, [messageInput, mentionState, setMessageInput]);

    const handleKeyDown = (e: React.KeyboardEvent) => {
        const suggestions = getMentionSuggestions();

        if (mentionState.isActive && suggestions.length > 0) {
            // Handle arrow key navigation for mention suggestions
            if (e.key === "ArrowDown") {
                e.preventDefault();
                setSelectedSuggestionIndex(prev =>
                    prev < suggestions.length - 1 ? prev + 1 : prev
                );
            } else if (e.key === "ArrowUp") {
                e.preventDefault();
                setSelectedSuggestionIndex(prev => prev > 0 ? prev - 1 : 0);
            } else if (e.key === "Enter" && mentionState.isActive) {
                e.preventDefault();
                handleSelectMention(suggestions[selectedSuggestionIndex].username);
                return;
            } else if (e.key === "Escape") {
                e.preventDefault();
                setMentionState({ isActive: false, startPosition: 0, searchText: '' });
                return;
            }
        }

        // Only send message on Enter if not handling mentions
        if (e.key === "Enter" && !e.shiftKey && !mentionState.isActive) {
            e.preventDefault();
            handleSendMessage();
        }
    };

    return (
        <Flex
            p={4}
            borderTopWidth="1px"
            borderColor={isTaskMode ? borderColor : "green.200"}
            bg={isTaskMode ? bgSubtle : "rgba(236, 253, 245, 0.4)"}
            align="center"
            position="relative"
        >
            <Input
                flex="1"
                placeholder={!selectedRoomId ? t("please_select_a_room") : t("type_message")}
                mr={2}
                value={messageInput}
                onChange={handleInputChange}
                onKeyDown={handleKeyDown}
                borderRadius="full"
                size="md"
                disabled={!selectedRoomId}
                _disabled={{ opacity: 0.5, cursor: "not-allowed" }}
                bg={inputBg}
                color={textColorStrong}
                _placeholder={{ color: textColor }}
                borderColor={isTaskMode ? "inherit" : "green.200"}
                _focus={{
                    borderColor: isTaskMode ? "blue.500" : "green.400",
                    boxShadow: isTaskMode ?
                        "0 0 0 1px var(--chakra-colors-blue-500)" :
                        "0 0 0 1px var(--chakra-colors-green-400)"
                }}
            />

            <Box
                as="button"
                py={2}
                px={4}
                borderRadius="md"
                bg={isTaskMode ? "blue.500" : "green.500"}
                color="white"
                fontWeight="medium"
                fontSize="sm"
                _hover={{ bg: isTaskMode ? "blue.600" : "green.600" }}
                _active={{ bg: isTaskMode ? "blue.700" : "green.700" }}
                // @ts-ignore
                // TODO: is fine
                disabled={!messageInput.trim() || !selectedRoomId}
                _disabled={{ opacity: 0.5, cursor: "not-allowed" }}
                onClick={handleSendMessage}
            >
                <Flex align="center" justify="center">
                    <Icon as={FaPaperPlane} mr={2} />
                    {t("send")}
                </Flex>
            </Box>

            {/* Mention suggestions dropdown */}
            <AnimatePresence onExitComplete={() => {
                // Ensure overflow is properly reset after animation completes
                const parentElement = document.querySelector('[data-scroll-container="true"]');
                if (parentElement) {
                    parentElement.setAttribute('style', 'overflow: auto;');
                }
                document.body.style.overflowX = '';
            }}>
                {mentionState.isActive && (
                    <MotionBox
                        position="absolute"
                        bottom="100%"
                        left="10px"
                        width="250px"
                        bg={mentionBg}
                        borderRadius="md"
                        boxShadow="lg"
                        zIndex={1000}
                        maxHeight="200px"
                        overflowY="auto"
                        overflowX="hidden"
                        border="1px solid"
                        borderColor={mentionBorderColor}
                        mb={2}
                        variants={{
                            hidden: { opacity: 0, y: 10, scale: 0.95 },
                            visible: {
                                opacity: 1,
                                y: 0,
                                scale: 1,
                                transition: {
                                    type: "spring",
                                    stiffness: 500,
                                    damping: 30,
                                    staggerChildren: 0.03
                                }
                            },
                            exit: {
                                opacity: 0,
                                y: 10,
                                scale: 0.95,
                                transition: { duration: 0.2 }
                            }
                        }}
                        initial="hidden"
                        animate="visible"
                        exit="exit"
                    >
                        {getMentionSuggestions().length > 0 ? (
                            getMentionSuggestions().map((user, index) => (
                                <MotionBox
                                    key={user.user_id}
                                    p={2}
                                    cursor="pointer"
                                    bg={index === selectedSuggestionIndex ? mentionSelectedBg : "transparent"}
                                    _hover={{ bg: mentionHoverBg }}
                                    onClick={() => handleSelectMention(user.username)}
                                    variants={{
                                        hidden: { opacity: 0, x: -5 },
                                        visible: { opacity: 1, x: 0 },
                                        exit: { opacity: 0, x: 5 }
                                    }}
                                    display="flex"
                                    alignItems="center"
                                    borderBottom={index < getMentionSuggestions().length - 1 ? "1px solid" : "none"}
                                    borderColor={mentionBorderColor}
                                    color={textColorStrong}
                                >
                                    <Box
                                        borderRadius="full"
                                        bg={user.username.startsWith('agent') ? agentAvatarBg : userAvatarBg}
                                        color={user.username.startsWith('agent') ? agentAvatarColor : userAvatarColor}
                                        p={1}
                                        mr={2}
                                        fontSize="xs"
                                        width="24px"
                                        height="24px"
                                        display="flex"
                                        alignItems="center"
                                        justifyContent="center"
                                    >
                                        {user.username[0].toUpperCase()}
                                    </Box>
                                    <Flex flex="1" alignItems="center" justifyContent="space-between">
                                        <Box>{user.username}</Box>
                                        {user.role && (
                                            <Box
                                                ml={2}
                                                px={2}
                                                py={0.5}
                                                borderRadius="full"
                                                fontSize="xs"
                                                fontWeight="medium"
                                                bg={user.role === "agent" ? "green.100" : "blue.100"}
                                                color={user.role === "agent" ? "green.700" : "blue.700"}
                                                _dark={{
                                                    bg: user.role === "agent" ? "green.800" : "blue.800",
                                                    color: user.role === "agent" ? "green.200" : "blue.200"
                                                }}
                                            >
                                                {user.role}
                                            </Box>
                                        )}
                                    </Flex>
                                </MotionBox>
                            ))
                        ) : (
                            <MotionBox
                                p={2}
                                color={textColor}
                                variants={{
                                    hidden: { opacity: 0 },
                                    visible: { opacity: 1 },
                                    exit: { opacity: 0 }
                                }}
                                textAlign="center"
                            >
                                {t("no_users_found")}
                            </MotionBox>
                        )}
                    </MotionBox>
                )}
            </AnimatePresence>
        </Flex>
    );
};