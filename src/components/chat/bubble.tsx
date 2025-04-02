"use client";

import { Box, Text, Menu, Portal, Group } from "@chakra-ui/react";
import { IMessage } from "@/types/chat";
import ReactMarkdown from "react-markdown";
import { useEffect, useState, useMemo } from "react";
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

  // Add blinking cursor for streaming messages
  const [showCursor, setShowCursor] = useState(true);
  const [dotCount, setDotCount] = useState(1);
  const [isVisible, setIsVisible] = useState(false);

  // Softer, more glowing mention colors for user bubbles (dark backgrounds)
  const agentMentionBgInUserBubble = useColorModeValue("rgba(154, 230, 180, 0.3)", "rgba(74, 222, 128, 0.2)");
  const agentMentionColorInUserBubble = useColorModeValue("#e6ffed", "#d9f7be");
  const agentMentionBorderInUserBubble = useColorModeValue("rgba(154, 230, 180, 0.5)", "rgba(74, 222, 128, 0.4)");

  const userMentionBgInUserBubble = useColorModeValue("rgba(173, 216, 230, 0.3)", "rgba(96, 165, 250, 0.2)");
  const userMentionColorInUserBubble = useColorModeValue("#e6f7ff", "#d6e4ff");
  const userMentionBorderInUserBubble = useColorModeValue("rgba(173, 216, 230, 0.5)", "rgba(96, 165, 250, 0.4)");

  // Softer, more glowing mention colors for other bubbles (light backgrounds)
  const agentMentionBgInOtherBubble = useColorModeValue("rgba(154, 230, 180, 0.15)", "rgba(74, 222, 128, 0.15)");
  const agentMentionColorInOtherBubble = useColorModeValue("#2c7a7b", "#9ae6b4");
  const agentMentionBorderInOtherBubble = useColorModeValue("rgba(154, 230, 180, 0.4)", "rgba(74, 222, 128, 0.3)");

  const userMentionBgInOtherBubble = useColorModeValue("rgba(173, 216, 230, 0.15)", "rgba(96, 165, 250, 0.15)");
  const userMentionColorInOtherBubble = useColorModeValue("#2b6cb0", "#90cdf4");
  const userMentionBorderInOtherBubble = useColorModeValue("rgba(173, 216, 230, 0.4)", "rgba(96, 165, 250, 0.3)");

  // Even lighter bubble colors
  const userBgTask = useColorModeValue("rgba(66, 153, 225, 0.85)", "rgba(56, 161, 105, 0.85)"); // Blue for light, Green for dark
  const userBgChat = useColorModeValue("rgba(72, 187, 120, 0.85)", "rgba(49, 130, 206, 0.85)"); // Green for light, Blue for dark

  // Pre-process the message content to highlight mentions with glowing effect
  const processedContent = useMemo(() => {
    if (!message.content) return "";

    // Replace @mentions with HTML spans that have glowing styling
    return message.content.replace(/@(\w+)/g, (match, username) => {
      const isAgent = username.startsWith('agent');

      // Select appropriate colors based on bubble type and mention type
      const bgColor = isUser
        ? (isAgent ? agentMentionBgInUserBubble : userMentionBgInUserBubble)
        : (isAgent ? agentMentionBgInOtherBubble : userMentionBgInOtherBubble);

      const textColor = isUser
        ? (isAgent ? agentMentionColorInUserBubble : userMentionColorInUserBubble)
        : (isAgent ? agentMentionColorInOtherBubble : userMentionColorInOtherBubble);

      const borderColor = isUser
        ? (isAgent ? agentMentionBorderInUserBubble : userMentionBorderInUserBubble)
        : (isAgent ? agentMentionBorderInOtherBubble : userMentionBorderInOtherBubble);

      // Create a span with glowing styling for the mention
      return `<span class="mention" data-mention="${username}" style="
        background-color: ${bgColor}; 
        color: ${textColor}; 
        padding: 0.125rem 0.375rem; 
        border-radius: 0.25rem; 
        font-weight: 500; 
        margin: 0 0.125rem;
        border: 1px solid ${borderColor};
        box-shadow: 0 0 4px ${borderColor};
        text-shadow: 0 0 1px ${isUser ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.1)'};
      ">${match}</span>`;
    });
  }, [message.content, isUser,
    agentMentionBgInUserBubble, userMentionBgInUserBubble, agentMentionBgInOtherBubble, userMentionBgInOtherBubble,
    agentMentionColorInUserBubble, userMentionColorInUserBubble, agentMentionColorInOtherBubble, userMentionColorInOtherBubble,
    agentMentionBorderInUserBubble, userMentionBorderInUserBubble, agentMentionBorderInOtherBubble, userMentionBorderInOtherBubble]);

  // Content with cursor for streaming messages or generating text
  const contentWithCursor = isStreaming
    ? message.content
      ? processedContent + (showCursor ? '|' : ' ')
      : t("generating") + '.'.repeat(dotCount)
    : processedContent;

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
            ? (isTaskMode ? userBgTask : userBgChat) // Even lighter bubble colors
            : (isTaskMode ? colors.otherBgTask : colors.otherBgChat)}
          color={isUser
            ? "white"
            : (isTaskMode ? colors.otherTextTask : colors.otherTextChat)}
          mb={1}
          boxShadow="0 2px 4px rgba(0,0,0,0.08)"
          alignSelf={isUser ? "flex-end" : "flex-start"}
          wordBreak="break-word"
          textAlign="left"
          style={{
            opacity: isVisible ? 1 : 0,
            transition: "opacity 0.5s ease-in-out",
            userSelect: "text"
          }}
        >
          <Box position="relative" textAlign="left">
            {/* Use dangerouslySetInnerHTML to render the processed content with styled mentions */}
            <div dangerouslySetInnerHTML={{ __html: contentWithCursor }} />
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
