import React, { useRef, useEffect } from "react";
import {
    Box,
    Flex,
    IconButton,
    Textarea,
    Icon,
} from "@chakra-ui/react";
import { FaPaperPlane } from "react-icons/fa";
import { useColorModeValue } from "@/components/ui/color-mode";
import { useTranslations } from "next-intl";
import { useChatPageColors } from "@/utils/colors";

interface AssistantInputProps {
    inputValue: string;
    setInputValue: (value: string) => void;
    handleSendMessage: () => void;
    isStreaming: boolean;
    handleKeyDown: (e: React.KeyboardEvent) => void;
    borderColor: string;
    bgColor: string;
}

const AssistantInput: React.FC<AssistantInputProps> = ({
    inputValue,
    setInputValue,
    handleSendMessage,
    isStreaming,
    handleKeyDown,
    borderColor,
    bgColor
}) => {
    const t = useTranslations("Chat");
    const colors = useChatPageColors();
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    // Input styling
    const inputBg = useColorModeValue("white", "#1A202C");
    const buttonBg = colors.chatModeHeading;
    const buttonHoverBg = "green.700";
    const placeholderColor = colors.textColor;
    const inputTextColor = colors.textColorHeading;

    // Auto-resize effect for textarea
    useEffect(() => {
        const textarea = textareaRef.current;
        if (!textarea) return;

        // Reset height to auto to get the correct scrollHeight
        textarea.style.height = 'auto';

        // Calculate the new height (capped at 100px)
        const maxHeight = 100;
        const newHeight = Math.min(textarea.scrollHeight, maxHeight);

        // Set the new height
        textarea.style.height = `${newHeight}px`;
    }, [inputValue]);

    return (
        <Box
            p={2}
            borderTop="1px solid"
            borderColor={borderColor}
            bg={bgColor}
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
                    borderColor={borderColor}
                    borderRadius="md"
                    mr={2}
                    _focus={{
                        borderColor: "green.400",
                        boxShadow: "0 0 0 1px var(--chakra-colors-green-400)",
                    }}
                    _placeholder={{ color: placeholderColor }}
                    disabled={isStreaming}
                    fontSize="sm"
                    minHeight="36px"
                    maxHeight="80px"
                    resize="none"
                    overflow="auto"
                    rows={1}
                    py={1}
                    px={3}
                    transition="all 0.2s"
                />

                <IconButton
                    aria-label="Send message"
                    onClick={handleSendMessage}
                    colorScheme="green"
                    bg={buttonBg}
                    _hover={{ bg: buttonHoverBg }}
                    disabled={!inputValue.trim() || isStreaming}
                    height="36px"
                    width="36px"
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

export default AssistantInput;
