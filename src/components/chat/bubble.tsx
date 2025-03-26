"use client";

import { Box, Text } from "@chakra-ui/react";
import { IMessage, IChatBubbleProps } from "@/types/chat";

export const ChatBubble = ({
  message,
  isUser,
  isFirstInGroup,
}: IChatBubbleProps) => {
  return (
    <Box
      position="relative"
      px={4}
      py={3}
      width="fit-content"
      maxW="100%"
      borderRadius="lg"
      bg={isUser ? "blue.500" : "gray.100"}
      color={isUser ? "white" : "gray.800"}
      mb={1}
      boxShadow="0 1px 2px rgba(0,0,0,0.05)"
      alignSelf={isUser ? "flex-end" : "flex-start"}
    >
      <Box>
        <Text fontSize="md">{message.content}</Text>
        <Text
          fontSize="xs"
          opacity="0.7"
          mt={1}
          textAlign="right"
          color={isUser ? "whiteAlpha.800" : "gray.500"}
        >
          {message.timestamp}
        </Text>
      </Box>
    </Box>
  );
};
