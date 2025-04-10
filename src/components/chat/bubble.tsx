"use client";

import { Box, Text, Menu, Portal, Group } from "@chakra-ui/react";
import { IMessage } from "@/types/chat";
import ReactMarkdown from "react-markdown";
import { useEffect, useState, useMemo } from "react";
import { useTranslations } from "next-intl";
import React from "react";
import { useChatPageColors, useCodeSyntaxHighlightColors } from "@/utils/colors";
import { LuCopy, LuMessageSquare, LuPencil, LuTrash, LuQuote, LuShare } from "react-icons/lu";
import { useColorModeValue } from "@/components/ui/color-mode";
import remarkGfm from 'remark-gfm';
import rehypeRaw from 'rehype-raw';
import rehypeSanitize from 'rehype-sanitize';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';

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
  const codeColors = useCodeSyntaxHighlightColors();

  // Add blinking cursor for streaming messages
  const [showCursor, setShowCursor] = useState(true);
  const [dotCount, setDotCount] = useState(1);
  const [isVisible, setIsVisible] = useState(false);

  // Add state to track if content is single line
  const [isSingleLine, setIsSingleLine] = useState(false);

  // Add ref for the bubble element to enable scrolling into view
  const bubbleRef = React.useRef<HTMLDivElement>(null);

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

  // Pre-process the message content to handle tables better
  const processedContent = useMemo(() => {
    if (!message.content) return "";

    // Check if this is an interrupted message
    const isInterrupted = message.content.includes('[Generation was interrupted');

    // First, let's properly format tables in the markdown
    let content = message.content;

    // Fix table formatting - ensure proper newlines between table rows
    content = content.replace(/\|\s*\|/g, '|\n|');  // Add newlines between rows that got merged
    content = content.replace(/\|\|/g, '|\n|');     // Another pattern for merged rows

    // Ensure header separator row has proper format
    content = content.replace(/\|([-|]+)\|/g, '|$1|');

    // Now convert remaining newlines to <br> tags for non-table content
    content = content.replace(/\n/g, '<br>');

    // But restore proper newlines for tables
    content = content.replace(/\|<br>\|/g, '|\n|');

    // If this is an interrupted message, add special styling to the interruption notice
    if (isInterrupted) {
      content = content.replace(
        /(\[Generation was interrupted.*?\])/g,
        '<span style="color: #ff6b6b; font-style: italic; font-size: 0.9em; display: block; margin-top: 8px;">$1</span>'
      );
    }

    // Then replace @mentions with HTML spans that have glowing styling
    return content.replace(/@(\w+)/g, (match, username) => {
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
    : processedContent || (t("generating") + '.'.repeat(dotCount)); // Show "Generating..." with dots for empty bubbles

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
    if ((!isStreaming && message.content) || !message.content === false) return;

    const dotsInterval = setInterval(() => {
      setDotCount(prev => prev < 3 ? prev + 1 : 1);
    }, 400);

    return () => clearInterval(dotsInterval);
  }, [isStreaming, message.content]);

  // Fade-in effect
  useEffect(() => {
    setIsVisible(true);
  }, []);

  // Check if content is a single line (no line breaks or paragraphs)
  useEffect(() => {
    if (!message.content) {
      setIsSingleLine(true);
      return;
    }

    // Consider content single line if it has no line breaks, no code blocks, and no lists
    const hasSingleLine = !message.content.includes('\n') &&
      !message.content.includes('```') &&
      !message.content.match(/^\s*[-*+]\s/) && // No list items
      !message.content.match(/^\s*\d+\.\s/);   // No numbered lists

    setIsSingleLine(hasSingleLine);
  }, [message.content]);

  // Auto-scroll when the bubble appears or content changes
  useEffect(() => {
    if (bubbleRef.current && (isStreaming || isFirstInGroup)) {
      bubbleRef.current.scrollIntoView({
        behavior: 'smooth',
        block: 'end'
      });
    }
  }, [message.content, isStreaming, isFirstInGroup]);

  // Add a small delay to ensure content is fully rendered before scrolling
  useEffect(() => {
    if (bubbleRef.current && isFirstInGroup) {
      const timer = setTimeout(() => {
        bubbleRef.current?.scrollIntoView({
          behavior: 'smooth',
          block: 'end'
        });
      }, 100);

      return () => clearTimeout(timer);
    }
  }, [isFirstInGroup]);

  const handleCopy = () => {
    if (message.content) {
      navigator.clipboard.writeText(message.content)
        .then(() => {
          console.log("Content copied to clipboard");
        })
        .catch(err => {
          console.error("Failed to copy content: ", err);
        });
    }
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
          ref={bubbleRef}
          position="relative"
          px={4}
          py={isSingleLine ? 2 : 3}
          width="fit-content"
          maxW="100%"
          borderRadius="xl"
          bg={isUser
            ? (isTaskMode ? userBgTask : userBgChat)
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
            userSelect: "text",
            whiteSpace: "pre-wrap"
          }}
        >
          <Box position="relative" textAlign="left">
            {isStreaming || !message.content ? (
              // Use dangerouslySetInnerHTML for streaming or generating state
              <div
                dangerouslySetInnerHTML={{ __html: contentWithCursor }}
                style={{ whiteSpace: "pre-wrap" }}
              />
            ) : (
              // Use ReactMarkdown for regular content with proper table handling
              <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
                <ReactMarkdown
                  remarkPlugins={[remarkGfm]}
                  rehypePlugins={[rehypeRaw, rehypeSanitize]}
                  components={{
                    code({ node, inline, className, children, ...props }: any) {
                      const match = /language-(\w+)/.exec(className || '');
                      return !inline && match ? (
                        <SyntaxHighlighter
                          style={codeColors.codeStyle}
                          language={match[1]}
                          PreTag="div"
                          {...props}
                        >
                          {String(children).replace(/\n$/, '')}
                        </SyntaxHighlighter>
                      ) : (
                        <code className={className} {...props}>
                          {children}
                        </code>
                      );
                    },
                    // Override link to open in new tab
                    a: ({ node, ...props }) => (
                      <a
                        {...props}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{
                          color: isUser ? 'rgba(255,255,255,0.9)' : undefined,
                          textDecoration: 'underline'
                        }}
                      />
                    ),
                    // Style other elements as needed
                    p: ({ node, ...props }) => {
                      // Check if this paragraph contains a table or is adjacent to a table
                      const hasTableChild = node?.children?.some(child =>
                        child.type === 'element' && (child.tagName === 'table' || child.tagName === 'div')
                      );

                      // Check if paragraph is empty or just contains whitespace
                      const isEmpty = node?.children?.length === 1 &&
                        node?.children[0]?.type === 'text' &&
                        node?.children[0]?.value?.trim() === '';

                      if (isEmpty) {
                        return null; // Don't render empty paragraphs
                      }

                      return (
                        <p style={{
                          margin: hasTableChild ? 0 : '0.25em 0',
                          padding: 0,
                          lineHeight: 1.5
                        }} {...props} />
                      );
                    },
                    ul: ({ node, ...props }) => (
                      <ul
                        style={{
                          paddingLeft: '1.5em',
                          margin: '0.5em 0',
                          listStyleType: 'disc',
                          listStylePosition: 'outside'
                        }}
                        {...props}
                      />
                    ),
                    ol: ({ node, ...props }) => (
                      <ol
                        style={{
                          paddingLeft: '1.5em',
                          margin: '0.5em 0',
                          listStyleType: 'decimal',
                          listStylePosition: 'outside'
                        }}
                        {...props}
                      />
                    ),
                    li: ({ node, ...props }) => (
                      <li
                        style={{
                          margin: '0.25em 0',
                          display: 'list-item'
                        }}
                        {...props}
                      />
                    ),
                    blockquote: ({ node, ...props }) => (
                      <blockquote
                        style={{
                          borderLeft: `3px solid ${isUser ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.2)'}`,
                          paddingLeft: '1em',
                          margin: '0.5em 0',
                          color: isUser ? 'rgba(255,255,255,0.9)' : undefined,
                        }}
                        {...props}
                      />
                    ),
                    // Add table styling components
                    table: ({ node, ...props }) => (
                      <div style={{
                        overflowX: 'auto',
                        maxWidth: '100%',
                        margin: '0',
                        padding: '0'
                      }}>
                        <table
                          style={{
                            borderCollapse: 'collapse',
                            width: '100%',
                            fontSize: '0.9em',
                            margin: 0,
                            padding: 0
                          }}
                          {...props}
                        />
                      </div>
                    ),
                    thead: ({ node, ...props }) => (
                      <thead
                        style={{
                          backgroundColor: isUser
                            ? 'rgba(255,255,255,0.1)'
                            : colors.otherBgChat,
                          margin: 0,     // Added to remove margin
                          padding: 0     // Added to ensure no padding
                        }}
                        {...props}
                      />
                    ),
                    tbody: ({ node, ...props }) => <tbody {...props} />,
                    tr: ({ node, ...props }) => (
                      <tr
                        style={{
                          borderBottom: `1px solid ${isUser
                            ? 'rgba(255,255,255,0.2)'
                            : colors.borderColor}`
                        }}
                        {...props}
                      />
                    ),
                    th: ({ node, ...props }) => (
                      <th
                        style={{
                          padding: '0.5em',
                          textAlign: 'left',
                          fontWeight: 'bold',
                          borderBottom: `2px solid ${isUser
                            ? 'rgba(255,255,255,0.3)'
                            : colors.borderColor}`
                        }}
                        {...props}
                      />
                    ),
                    td: ({ node, ...props }) => (
                      <td
                        style={{
                          padding: '0.5em',
                          borderRight: `1px solid ${isUser
                            ? 'rgba(255,255,255,0.1)'
                            : colors.borderColor}`
                        }}
                        {...props}
                      />
                    ),
                  }}
                >
                  {message.content}
                </ReactMarkdown>
              </div>
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
            style={{
              position: "fixed",
              zIndex: 1000,
              transform: "none" // Prevent automatic repositioning
            }}
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
  // Always re-render if the message contains an interruption notice
  if (
    prevProps.message.content?.includes('[Generation was interrupted') ||
    nextProps.message.content?.includes('[Generation was interrupted')
  ) {
    return false; // Force re-render for interrupted messages
  }

  return (
    prevProps.isUser === nextProps.isUser &&
    prevProps.isFirstInGroup === nextProps.isFirstInGroup &&
    prevProps.isTaskMode === nextProps.isTaskMode &&
    prevProps.isStreaming === nextProps.isStreaming &&
    prevProps.message.content === nextProps.message.content
  );
});
