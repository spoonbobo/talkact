"use client";

import { Box, Text } from "@chakra-ui/react";
import { IMessage } from "@/types/chat";
import ReactMarkdown from "react-markdown";
import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import React from "react";
import { useChatPageColors } from "@/utils/colors";

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

  return (
    <Box
      position="relative"
      px={4}
      py={3}
      width="fit-content"
      maxW="100%"
      borderRadius="lg"
      bg={isUser
        ? (isTaskMode ? colors.userBgTask : colors.userBgChat)
        : (isTaskMode ? colors.otherBgTask : colors.otherBgChat)}
      color={isUser
        ? "white"
        : (isTaskMode ? colors.otherTextTask : colors.otherTextChat)}
      mb={1}
      boxShadow="0 1px 2px rgba(0,0,0,0.05)"
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
