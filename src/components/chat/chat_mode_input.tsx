"use client";

import {
    Box,
    Input,
    IconButton,
    Flex,
    Icon,
    Button,
} from "@chakra-ui/react";
import { Tooltip } from "@/components/ui/tooltip";
import { FaPaperPlane, FaStop } from "react-icons/fa";
import { useState, KeyboardEvent } from "react";
import { useChatMode } from "./chat_mode_context";
import { User } from "@/types/user";
import { useColorModeValue } from "@/components/ui/color-mode";
import { motion } from "framer-motion";
import { useTranslations } from "next-intl";

interface ChatModeInputProps {
    currentUser: User | null;
}

export const ChatModeInput = ({ currentUser }: ChatModeInputProps) => {
    const [inputValue, setInputValue] = useState("");
    const { sendChatModeMessage, isStreaming, cancelGeneration } = useChatMode();
    const t = useTranslations("Chat");
    // Enhanced colors for better UI with warmer greens
    const inputBg = useColorModeValue("white", "gray.800");
    const inputBorder = useColorModeValue("green.300", "green.600");
    const buttonBg = useColorModeValue("green.600", "green.700");
    const buttonHoverBg = useColorModeValue("green.700", "green.600");
    const cancelBg = useColorModeValue("red.500", "red.600");
    const cancelHoverBg = useColorModeValue("red.600", "red.500");
    const containerBg = useColorModeValue("rgba(240, 255, 244, 0.8)", "rgba(25, 45, 35, 0.8)");
    const placeholderColor = useColorModeValue("gray.500", "gray.500");
    const inputTextColor = useColorModeValue("gray.800", "gray.100");

    const handleSendMessage = () => {
        if (inputValue.trim() && currentUser && !isStreaming) {
            sendChatModeMessage(inputValue.trim(), currentUser);
            setInputValue("");
        }
    };

    const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            handleSendMessage();
        }
    };

    const MotionFlex = motion(Flex);

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
                <Input
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
                    height="44px"
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
                >
                    <Icon as={FaPaperPlane} />
                </IconButton>
            </Flex>
        </Box>
    );
}; 