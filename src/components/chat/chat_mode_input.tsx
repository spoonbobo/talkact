"use client";

import {
    Box,
    Textarea,
    IconButton,
    Flex,
    Icon,
} from "@chakra-ui/react";
import { FaPaperPlane, FaStop } from "react-icons/fa";
import { useState, KeyboardEvent, useRef, useEffect } from "react";
import { useChatMode } from "./chat_mode_context";
import { User } from "@/types/user";
import { motion } from "framer-motion";
import { useTranslations } from "next-intl";
import { useChatPageColors } from "@/utils/colors";
import { useColorModeValue } from "@/components/ui/color-mode";

interface ChatModeInputProps {
    currentUser: User | null;
    setIsEventSourceActive: (active: boolean) => void;
    eventSourceRef: React.MutableRefObject<EventSource | null>;
}

export const ChatModeInput = ({
    currentUser,
    setIsEventSourceActive,
    eventSourceRef
}: ChatModeInputProps) => {
    const [inputValue, setInputValue] = useState("");
    const { sendChatModeMessage, isStreaming } = useChatMode();
    const t = useTranslations("Chat");
    const colors = useChatPageColors();

    // Add textarea ref for auto-resizing
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    // Use the centralized colors
    const inputBg = useColorModeValue("white", "#1A202C"); // Direct hex for dark mode
    const inputBorder = colors.chatModeHeading; // Using the green accent color
    const buttonBg = colors.chatModeHeading;
    const buttonHoverBg = "green.700"; // Keep this specific hover state
    const cancelHoverBg = "red.600"; // Keep this specific hover state
    const containerBg = useColorModeValue("rgba(240, 255, 244, 0.8)", "rgba(26, 32, 44, 0.8)"); // Dark mode background
    const placeholderColor = colors.textColor;
    const inputTextColor = colors.textColorHeading;

    // Add this ref for the messages end
    const messagesEndRef = useRef<HTMLDivElement | null>(null);

    // Auto-resize effect
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
    }, [inputValue]);

    const handleSendMessage = () => {
        if (inputValue.trim() && currentUser && !isStreaming) {
            sendChatModeMessage(inputValue.trim(), currentUser);
            setInputValue("");

            // Scroll to bottom after sending a message - with requestAnimationFrame
            if (messagesEndRef) {
                // Use requestAnimationFrame to avoid forced reflow
                requestAnimationFrame(() => {
                    if (messagesEndRef.current) {
                        messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
                    }
                });
            }
        }
    };

    const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            handleSendMessage();
        }
    };

    const MotionFlex = motion.create(Flex);

    // Modify your event source creation to use the ref
    const startEventSource = () => {
        // Close any existing connection
        if (eventSourceRef.current) {
            eventSourceRef.current.close();
        }

        const eventSource = new EventSource(`/api/chat/stream?query=${encodeURIComponent(inputValue)}`);
        eventSourceRef.current = eventSource;
        setIsEventSourceActive(true);

        eventSource.onmessage = (event) => {
            // Process message
        };

        eventSource.onerror = () => {
            eventSource.close();
            setIsEventSourceActive(false);
            eventSourceRef.current = null;
        };
    };

    // Make sure to clean up when component unmounts
    useEffect(() => {
        return () => {
            if (eventSourceRef.current) {
                eventSourceRef.current.close();
                setIsEventSourceActive(false);
            }
        };
    }, []);

    return (
        <Box
            p={4}
            borderTopWidth="1px"
            borderColor={inputBorder}
            bg={containerBg}
            backdropFilter="blur(8px)"
            position="relative"
        >
            <Flex>
                <Textarea
                    ref={textareaRef}
                    color={inputTextColor}
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder={t("ask_anything")}
                    bg={inputBg}
                    borderColor={inputBorder}
                    borderRadius="md"
                    mr={2}
                    _focus={{
                        borderColor: "green.400",
                        boxShadow: "0 0 0 1px var(--chakra-colors-green-400)",
                    }}
                    _placeholder={{ color: placeholderColor }}
                    disabled={isStreaming}
                    fontSize="md"
                    minHeight="44px"
                    maxHeight="50vh"
                    resize="none"
                    overflow="auto"
                    rows={1}
                    py={2}
                    px={4}
                    transition="all 0.2s"
                />

                <IconButton
                    aria-label="Send message"
                    onClick={handleSendMessage}
                    colorScheme="green"
                    bg={buttonBg}
                    _hover={{ bg: buttonHoverBg }}
                    disabled={!inputValue.trim() || isStreaming}
                    height="44px"
                    width="44px"
                    borderRadius="md"
                    transition="all 0.2s"
                    alignSelf="flex-start"
                >
                    <Icon as={FaPaperPlane} />
                </IconButton>
            </Flex>
        </Box>
    );
}; 