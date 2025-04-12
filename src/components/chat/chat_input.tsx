import React, { useState, useCallback, useEffect, useMemo } from "react";
import { Flex, Textarea, Box, Icon } from "@chakra-ui/react";
import { FaPaperPlane } from "react-icons/fa";
import { useColorModeValue } from "@/components/ui/color-mode";
import { useTranslations } from "next-intl";
import { motion, AnimatePresence } from "framer-motion";
import { User } from "@/types/user";
import { IChatRoom, IMessage } from "@/types/chat";
import { v4 as uuidv4 } from "uuid";

const MotionBox = motion.create(Box);

// do not change
interface MentionState {
    isActive: boolean;
    startPosition: number;
    searchText: string;
}

// do not change
interface ChatInputProps {
    messageInput: string;
    setMessageInput: (value: string) => void;
    handleSendMessage: (message: IMessage) => void;
    selectedRoomId: string | null;
    users?: User[];
    agents?: User[];
    currentUser?: User | null;
    isTaskMode?: boolean;
    currentRoom?: IChatRoom | null;
    roomUsers?: User[];
}

// Extract color values to a custom hook to prevent recalculation on every render
const useInputColors = (isTaskMode = true) => {
    const borderColor = useColorModeValue("gray.200", "gray.700");
    const bgSubtle = useColorModeValue("bg.subtle", "gray.800");
    const textColor = useColorModeValue("gray.600", "gray.400");
    const textColorStrong = useColorModeValue("gray.700", "gray.300");
    const inputBg = useColorModeValue("white", "#1A202C");
    const mentionBg = useColorModeValue("white", "#1A202C");
    const mentionHoverBg = useColorModeValue("gray.100", "gray.800");
    const mentionSelectedBg = useColorModeValue("blue.100", "blue.900");
    const buttonBg = useColorModeValue(
        isTaskMode ? "blue.500" : "green.500",
        isTaskMode ? "blue.600" : "green.600"
    );
    const buttonHoverBg = useColorModeValue(
        isTaskMode ? "blue.600" : "green.600",
        isTaskMode ? "blue.700" : "green.700"
    );

    return {
        borderColor,
        bgSubtle,
        textColor,
        textColorStrong,
        inputBg,
        mentionBg,
        mentionHoverBg,
        mentionSelectedBg,
        buttonBg,
        buttonHoverBg
    };
};

export const ChatInput = React.memo(({
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
    const [activeMentions, setActiveMentions] = useState<User[]>([]);

    // Use memoized colors
    const colors = useInputColors(isTaskMode);

    // Memoize current room users to prevent recalculations
    const currentRoomUsers = useMemo(() => {
        return roomUsers.length > 0
            ? roomUsers.filter(user => user.user_id !== currentUser?.user_id)
            : users.filter(user => currentRoom?.active_users?.includes(user.user_id || ''));
    }, [roomUsers, users, currentRoom?.active_users, currentUser?.user_id]);

    // Memoize all users to prevent array recreation on every render
    const allUsers = useMemo(() => {
        const combined = [...currentRoomUsers, ...agents];
        return Array.from(new Map(combined.map(user => [user.username, user])).values());
    }, [currentRoomUsers, agents]);

    const getMentionSuggestions = useCallback(() => {
        if (!mentionState.isActive) return [];

        return mentionState.searchText.trim() === ''
            ? allUsers
            : allUsers.filter(user =>
                user.username.toLowerCase().includes(mentionState.searchText.toLowerCase())
            ).sort((a, b) => {
                const aIsAgent = a.role === "agent";
                const bIsAgent = b.role === "agent";
                if (aIsAgent && !bIsAgent) return -1;
                if (!aIsAgent && bIsAgent) return 1;
                return a.username.localeCompare(b.username);
            });
    }, [mentionState.isActive, mentionState.searchText, allUsers]);

    // Memoize suggestions to prevent recalculation
    const suggestions = useMemo(() => {
        return getMentionSuggestions();
    }, [getMentionSuggestions]);

    useEffect(() => {
        if (mentionState.isActive) {
            setSelectedSuggestionIndex(Math.max(0, suggestions.length - 1));
        }
    }, [mentionState.searchText, suggestions.length, mentionState.isActive]);

    useEffect(() => {
        if (mentionState.isActive) {
            const parentElement = document.querySelector('[data-scroll-container="true"]');
            if (parentElement) {
                parentElement.setAttribute('style', 'overflow: hidden;');
            }
            document.body.style.overflowX = 'hidden';

            return () => {
                if (parentElement) {
                    parentElement.setAttribute('style', 'overflow: auto;');
                }
                document.body.style.overflowX = '';
            };
        }
    }, [mentionState.isActive]);

    // Add this effect to handle scrolling when selection changes
    useEffect(() => {
        if (mentionState.isActive && suggestions.length > 0) {
            // Use setTimeout to ensure the DOM has updated
            setTimeout(() => {
                const suggestionBox = document.querySelector('[data-mention-suggestions="true"]');
                const selectedItem = document.querySelector('[data-selected-suggestion="true"]');

                if (suggestionBox && selectedItem) {
                    // Get the position of the selected item relative to the suggestion box
                    const boxRect = suggestionBox.getBoundingClientRect();
                    const itemRect = selectedItem.getBoundingClientRect();

                    // Check if the selected item is outside the visible area
                    if (itemRect.top < boxRect.top) {
                        // If the item is above the visible area, scroll up to show it
                        selectedItem.scrollIntoView({ block: 'start', behavior: 'smooth' });
                    } else if (itemRect.bottom > boxRect.bottom) {
                        // If the item is below the visible area, scroll down to show it
                        selectedItem.scrollIntoView({ block: 'end', behavior: 'smooth' });
                    }
                }
            }, 10);
        }
    }, [mentionState.isActive, suggestions.length, selectedSuggestionIndex]);

    // Add state to track cursor position
    const [cursorPosition, setCursorPosition] = useState({ left: 10, top: 0 });

    // Debounce the cursor position update to reduce calculations
    const debouncedUpdateCursorPosition = useCallback(
        debounce((textarea: HTMLTextAreaElement) => {
            if (!textarea) return;

            const { selectionStart } = textarea;
            const text = textarea.value;
            const textBeforeCursor = text.substring(0, selectionStart);
            const lastAtIndex = textBeforeCursor.lastIndexOf('@');
            if (lastAtIndex === -1) return;

            // Create a hidden div with the same styling as the textarea
            const temp = document.createElement('div');
            temp.style.position = 'absolute';
            temp.style.visibility = 'hidden';
            temp.style.whiteSpace = 'pre-wrap';
            temp.style.wordBreak = 'break-word';
            temp.style.width = `${textarea.clientWidth}px`;
            temp.style.fontSize = getComputedStyle(textarea).fontSize;
            temp.style.fontFamily = getComputedStyle(textarea).fontFamily;
            temp.style.padding = getComputedStyle(textarea).padding;
            temp.style.boxSizing = 'border-box';
            temp.style.letterSpacing = getComputedStyle(textarea).letterSpacing;

            // Calculate the position of the @ symbol
            const textBeforeLastLine = textBeforeCursor.substring(0, lastAtIndex);
            const lastNewlineIndex = textBeforeLastLine.lastIndexOf('\n');
            const charsInLastLine = lastAtIndex - (lastNewlineIndex === -1 ? 0 : lastNewlineIndex + 1);

            // Create a span for the text in the last line up to the @ symbol
            const span = document.createElement('span');
            span.textContent = textBeforeLastLine.substring(lastNewlineIndex + 1);
            temp.appendChild(span);
            document.body.appendChild(temp);

            // Get the actual width of the text
            const actualWidth = span.getBoundingClientRect().width;

            // Calculate the position
            const lineHeight = parseInt(getComputedStyle(textarea).lineHeight) || parseInt(getComputedStyle(textarea).fontSize) * 1.2;
            const newlines = (textBeforeCursor.substring(0, lastAtIndex).match(/\n/g) || []).length;
            const top = (newlines * lineHeight) - 200;

            document.body.removeChild(temp);

            setCursorPosition({
                left: actualWidth + parseInt(getComputedStyle(textarea).paddingLeft),
                top: Math.max(top, 0)
            });
        }, 100), // 100ms debounce
        []
    );

    // Optimize the updateCursorPosition function
    const updateCursorPosition = useCallback(() => {
        if (!textareaRef.current) return;
        debouncedUpdateCursorPosition(textareaRef.current);
    }, [debouncedUpdateCursorPosition]);

    // Optimize handleInputChange to reduce work
    const handleInputChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
        const newValue = e.target.value;
        setMessageInput(newValue);

        // Only process mentions if the value has changed significantly
        if (Math.abs(newValue.length - messageInput.length) > 3) {
            // Skip mention processing for large changes (like paste operations)
            if (mentionState.isActive) {
                setMentionState({ isActive: false, startPosition: 0, searchText: '' });
            }
            return;
        }

        const lastAtIndex = newValue.lastIndexOf('@');
        if (lastAtIndex >= 0 && (lastAtIndex === 0 || newValue[lastAtIndex - 1] === ' ')) {
            const searchText = newValue.substring(lastAtIndex + 1);
            if (searchText.includes(' ')) {
                if (mentionState.isActive) {
                    setMentionState({ isActive: false, startPosition: 0, searchText: '' });
                }
            } else {
                if (!mentionState.isActive ||
                    mentionState.startPosition !== lastAtIndex ||
                    mentionState.searchText !== searchText) {
                    setMentionState({
                        isActive: true,
                        startPosition: lastAtIndex,
                        searchText: searchText
                    });
                    // Only update cursor position when mention state activates
                    updateCursorPosition();
                }
            }
        } else if (mentionState.isActive) {
            setMentionState({ isActive: false, startPosition: 0, searchText: '' });
        }
    }, [mentionState.isActive, mentionState.startPosition, mentionState.searchText, messageInput.length, setMessageInput, updateCursorPosition]);

    const handleSelectMention = useCallback((user: User) => {
        const beforeMention = messageInput.substring(0, mentionState.startPosition);
        const afterMention = messageInput.substring(mentionState.startPosition + mentionState.searchText.length + 1);

        setMessageInput(`${beforeMention}@${user.username} ${afterMention}`);

        setActiveMentions(prev => {
            if (!prev.some(u => u.user_id === user.user_id)) {
                return [...prev, user];
            }
            return prev;
        });

        setMentionState({ isActive: false, startPosition: 0, searchText: '' });
    }, [messageInput, mentionState.startPosition, mentionState.searchText, setMessageInput]);

    const createNewMessage = useCallback((content: string): IMessage => {
        return {
            id: uuidv4(),
            room_id: selectedRoomId || '',
            sender: {
                user_id: currentUser?.user_id || '',
                username: currentUser?.username || '',
                email: currentUser?.email || '',
                created_at: currentUser?.created_at || new Date().toISOString(),
                updated_at: currentUser?.updated_at || new Date().toISOString(),
                active_rooms: currentUser?.active_rooms || [],
                archived_rooms: currentUser?.archived_rooms || [],
                avatar: currentUser?.avatar || '',
                role: currentUser?.role || 'user',
                id: currentUser?.id
            },
            content,
            created_at: new Date().toISOString(),
            avatar: currentUser?.avatar || "",
            mentions: activeMentions.length > 0 ? activeMentions : undefined,
        };
    }, [selectedRoomId, currentUser, activeMentions]);

    const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
        if (mentionState.isActive && suggestions.length > 0) {
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
                handleSelectMention(suggestions[selectedSuggestionIndex]);
                return;
            } else if (e.key === "Escape") {
                e.preventDefault();
                setMentionState({ isActive: false, startPosition: 0, searchText: '' });
                return;
            }
        }

        if (e.key === "Enter" && !mentionState.isActive) {
            if (e.shiftKey) {
                // Allow Shift+Enter to create a new line
                return;
            } else {
                e.preventDefault();
                if (messageInput.trim() && selectedRoomId) {
                    const newMessage = createNewMessage(messageInput);
                    handleSendMessage(newMessage);
                    setActiveMentions([]);
                }
            }
        }
    }, [
        mentionState.isActive,
        suggestions,
        selectedSuggestionIndex,
        handleSelectMention,
        messageInput,
        selectedRoomId,
        createNewMessage,
        handleSendMessage
    ]);

    const handleSendButtonClick = useCallback(() => {
        if (messageInput.trim() && selectedRoomId) {
            const newMessage = createNewMessage(messageInput);
            handleSendMessage(newMessage);
            setActiveMentions([]);
        }
    }, [messageInput, selectedRoomId, createNewMessage, handleSendMessage]);

    // Add a ref for the textarea
    const textareaRef = React.useRef<HTMLTextAreaElement>(null);

    // Add effect to auto-resize the textarea
    useEffect(() => {
        const textarea = textareaRef.current;
        if (!textarea) return;

        // Reset height to auto to get the correct scrollHeight
        textarea.style.height = 'auto';

        // Calculate the new height (capped at 50% of viewport height)
        const maxHeight = window.innerHeight * 0.5;
        const newHeight = Math.min(textarea.scrollHeight, maxHeight);

        // Set the new height
        textarea.style.height = `${newHeight}px`;
    }, [messageInput]);

    // Add a debounce utility function
    function debounce(func: Function, wait: number) {
        let timeout: NodeJS.Timeout;
        return function (...args: any[]) {
            clearTimeout(timeout);
            timeout = setTimeout(() => func(...args), wait);
        };
    }

    return (
        <Flex
            p={4}
            borderTopWidth="1px"
            borderColor={isTaskMode ? colors.borderColor : "green.200"}
            bg={isTaskMode ? colors.bgSubtle : "rgba(236, 253, 245, 0.4)"}
            align="center"
            position="relative"
        >
            <Textarea
                ref={textareaRef}
                flex="1"
                placeholder={!selectedRoomId ? t("please_select_a_room") : t("type_message")}
                mr={2}
                value={messageInput}
                onChange={handleInputChange}
                onKeyDown={handleKeyDown}
                borderRadius="md"
                size="md"
                disabled={!selectedRoomId}
                _disabled={{ opacity: 0.5, cursor: "not-allowed" }}
                bg={colors.inputBg}
                color={colors.textColorStrong}
                _placeholder={{ color: colors.textColor }}
                borderColor={isTaskMode ? "inherit" : "green.200"}
                _focus={{
                    borderColor: isTaskMode ? "blue.500" : "green.400",
                    boxShadow: isTaskMode ?
                        "0 0 0 1px var(--chakra-colors-blue-500)" :
                        "0 0 0 1px var(--chakra-colors-green-400)"
                }}
                resize="none"
                overflow="auto"
                minHeight="40px"
                maxHeight="50vh"
                py={2}
                px={4}
                rows={1}
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
                opacity={!messageInput.trim() || !selectedRoomId ? 0.5 : 1}
                cursor={!messageInput.trim() || !selectedRoomId ? "not-allowed" : "pointer"}
                pointerEvents={!messageInput.trim() || !selectedRoomId ? "none" : "auto"}
                onClick={handleSendButtonClick}
            >
                <Flex align="center" justify="center">
                    <Icon as={FaPaperPlane} mr={2} />
                    {t("send")}
                </Flex>
            </Box>

            <AnimatePresence onExitComplete={() => {
                const parentElement = document.querySelector('[data-scroll-container="true"]');
                if (parentElement) {
                    parentElement.setAttribute('style', 'overflow: auto;');
                }
                document.body.style.overflowX = '';
            }}>
                {mentionState.isActive && (
                    <MotionBox
                        data-mention-suggestions="true"
                        position="absolute"
                        bottom={`calc(100% - ${cursorPosition.top}px)`}
                        left={`${cursorPosition.left}px`}
                        width="250px"
                        maxHeight="200px"
                        maxWidth="calc(100vw - 20px)"
                        bg={colors.mentionBg}
                        borderRadius="md"
                        boxShadow="lg"
                        zIndex={1000}
                        overflowY="auto"
                        overflowX="hidden"
                        border="1px solid"
                        borderColor="gray.200"
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
                        style={{
                            transformOrigin: "bottom left",
                            scrollbarWidth: "none",
                            msOverflowStyle: "none",
                        }}

                    >
                        {suggestions.length > 0 ? (
                            <Box>
                                {suggestions.map((user, index) => (
                                    <MotionBox
                                        key={user.user_id}
                                        data-selected-suggestion={index === selectedSuggestionIndex ? "true" : "false"}
                                        p={2}
                                        cursor="pointer"
                                        bg={index === selectedSuggestionIndex ? colors.mentionSelectedBg : "transparent"}
                                        _hover={{ bg: colors.mentionHoverBg }}
                                        onClick={() => handleSelectMention(user)}
                                        variants={{
                                            hidden: { opacity: 0, x: -5 },
                                            visible: { opacity: 1, x: 0 },
                                            exit: { opacity: 0, x: 5 }
                                        }}
                                        display="flex"
                                        alignItems="center"
                                        borderBottom={index < suggestions.length - 1 ? "1px solid" : "none"}
                                        borderColor="gray.200"
                                        color={colors.textColorStrong}
                                    >
                                        <Box
                                            borderRadius="full"
                                            bg={user.username.startsWith('agent') ? "green.100" : "blue.100"}
                                            color={user.username.startsWith('agent') ? "green.700" : "blue.700"}
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
                                ))}
                            </Box>
                        ) : (
                            <MotionBox
                                p={2}
                                color={colors.textColor}
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
}, (prevProps, nextProps) => {
    // Custom comparison function for React.memo
    // Return true if props are equal (no re-render), false if they're not equal (trigger re-render)

    // Simple comparison for primitive props
    if (prevProps.messageInput !== nextProps.messageInput) return false;
    if (prevProps.selectedRoomId !== nextProps.selectedRoomId) return false;
    if (prevProps.isTaskMode !== nextProps.isTaskMode) return false;

    // Deep comparison for complex objects when needed
    if (prevProps.currentRoom?.id !== nextProps.currentRoom?.id) return false;

    // No need to deeply compare functions since they should be memoized in the parent

    // Compare arrays length as a quick check
    if (prevProps.roomUsers?.length !== nextProps.roomUsers?.length) return false;
    if (prevProps.users?.length !== nextProps.users?.length) return false;
    if (prevProps.agents?.length !== nextProps.agents?.length) return false;

    // By default, assume props are equal
    return true;
});