"use client";

import { Box, Text, Menu, Portal, Group } from "@chakra-ui/react";
import { IMessage } from "@/types/chat";
import ReactMarkdown from "react-markdown";
import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import React from "react";
import { useChatPageColors } from "@/utils/colors";
import { LuCopy, LuMessageSquare, LuPencil, LuTrash, LuQuote, LuShare } from "react-icons/lu";
import { useColorModeValue } from "@/components/ui/color-mode";

// Extend the props interface directly in the file
interface IChatBubbleProps {
  message: IMessage;
  isUser: boolean;
  isFirstInGroup: boolean;
  isTaskMode?: boolean;
  isStreaming?: boolean;
}

export const ChatBubble = React.memo(({
  message,
  isUser,
  isFirstInGroup,
  isTaskMode = true,
  isStreaming = false,
}: IChatBubbleProps) => {
  const t = useTranslations("Chat");
  const colors = useChatPageColors();
  // const toast = useToast();

  // Add blinking cursor for streaming messages
  const [showCursor, setShowCursor] = useState(true);
  const [dotCount, setDotCount] = useState(1);
  const [isVisible, setIsVisible] = useState(false);

  // Content with cursor for streaming messages or generating text
  const contentWithCursor = isStreaming
    ? message.content
      ? message.content + (showCursor ? '|' : ' ')
      : t("generating") + '.'.repeat(dotCount)
    : message.content;

  // Blinking cursor effect for streaming messages
  useEffect(() => {
    if (!isStreaming) return;

    const cursorInterval = setInterval(() => {
      setShowCursor(prev => !prev);
    }, 500);

    return () => clearInterval(cursorInterval);
  }, [isStreaming]);

  // Animated dots for "generating..." text
  useEffect(() => {
    if (!isStreaming || message.content) return;

    const dotsInterval = setInterval(() => {
      setDotCount(prev => prev < 3 ? prev + 1 : 1);
    }, 400);

    return () => clearInterval(dotsInterval);
  }, [isStreaming, message.content]);

  // Fade-in effect
  useEffect(() => {
    setIsVisible(true);
  }, []);

  const handleCopy = () => {
    console.log("handleCopy", message.content);

  };

  // Define horizontal menu items with emojis
  const horizontalMenuItems = [
    { label: "👍", value: "like", icon: null },
    { label: "👎", value: "unlike", icon: null },
    { label: "❤️", value: "heart", icon: null },
    { label: "😂", value: "laugh", icon: null },
  ];

  // Define vertical menu items - starting with copy
  const verticalMenuItems = [
    { label: t("Copy"), value: "copy", icon: <LuCopy />, onClick: handleCopy },
    { label: t("Quote"), value: "quote", icon: <LuQuote /> },
    { label: t("Share"), value: "share", icon: <LuShare /> },
    { label: t("Translate"), value: "translate", icon: <LuMessageSquare /> },
  ];

  // Add edit and delete options only for user messages
  if (isUser) {
    verticalMenuItems.push(
      { label: t("Edit"), value: "edit", icon: <LuPencil /> },
      { label: t("Delete"), value: "delete", icon: <LuTrash /> }
    );
  }

  return (
    <Menu.Root>
      <Menu.ContextTrigger>
        <Box
          position="relative"
          px={4}
          py={3}
          width="fit-content"
          maxW="100%"
          borderRadius="xl"
          bg={isUser
            ? (isTaskMode ? colors.userBgTask : colors.userBgChat)
            : (isTaskMode ? colors.otherBgTask : colors.otherBgChat)}
          color={isUser
            ? "white"
            : (isTaskMode ? colors.otherTextTask : colors.otherTextChat)}
          mb={1}
          boxShadow="0 2px 4px rgba(0,0,0,0.08)"
          alignSelf={isUser ? "flex-end" : "flex-start"}
          wordBreak="break-word"
          style={{
            opacity: isVisible ? 1 : 0,
            transition: "opacity 0.5s ease-in-out"
          }}
        >
          <Box position="relative">
            {isStreaming ? (
              <ReactMarkdown>{contentWithCursor}</ReactMarkdown>
            ) : (
              <ReactMarkdown>{message.content}</ReactMarkdown>
            )}
          </Box>
        </Box>
      </Menu.ContextTrigger>
      <Portal>
        <Menu.Positioner>
          <Menu.Content
            bg={useColorModeValue("white", "gray.800")}
            borderRadius="xl"
            boxShadow={useColorModeValue(
              "0 4px 12px rgba(0,0,0,0.1)",
              "0 4px 12px rgba(0,0,0,0.3)"
            )}
            overflow="hidden"
            border="1px solid"
            borderColor={useColorModeValue("gray.100", "gray.700")}
            minWidth="180px"
            maxWidth="220px"
          >
            {/* Horizontal menu items (emojis) */}
            <Group
              grow
              gap="0"
              p={1.5}
              borderBottom="1px solid"
              borderColor={useColorModeValue("gray.100", "gray.700")}
            >
              {horizontalMenuItems.map((item) => (
                <Menu.Item
                  key={item.value}
                  value={item.value}
                  width="10"
                  height="10"
                  gap="0"
                  flexDirection="column"
                  justifyContent="center"
                  alignItems="center"
                  fontSize="lg"
                  borderRadius="md"
                  _hover={{ bg: useColorModeValue("gray.50", "gray.700") }}
                  p={1}
                >
                  {item.label}
                </Menu.Item>
              ))}
            </Group>

            {/* Vertical menu items (starting with copy) */}
            <Box py={1}>
              {verticalMenuItems.map((item) => (
                <Menu.Item
                  key={item.value}
                  value={item.value}
                  onClick={item.onClick}
                  borderRadius="md"
                  _hover={{ bg: useColorModeValue("gray.50", "gray.700") }}
                  py={1.5}
                  px={3}
                  fontSize="sm"
                >
                  <Group gap={2} justify="flex-start" align="center">
                    <Box fontSize="sm" color={useColorModeValue("gray.600", "gray.400")}>{item.icon}</Box>
                    <Text fontWeight="medium" color={useColorModeValue("gray.800", "gray.200")}>{item.label}</Text>
                  </Group>
                </Menu.Item>
              ))}
            </Box>
          </Menu.Content>
        </Menu.Positioner>
      </Portal>
    </Menu.Root>
  );
}, (prevProps, nextProps) => {
  // Custom comparison function to determine if re-render is needed
  return (
    prevProps.isUser === nextProps.isUser &&
    prevProps.isFirstInGroup === nextProps.isFirstInGroup &&
    prevProps.isTaskMode === nextProps.isTaskMode &&
    prevProps.isStreaming === nextProps.isStreaming &&
    prevProps.message.content === nextProps.message.content
  );
});
