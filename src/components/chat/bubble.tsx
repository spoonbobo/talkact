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
  isLoadingOlder?: boolean;
}

export const ChatBubble = React.memo(({
  message,
  isUser,
  isFirstInGroup,
  isTaskMode = true,
  isStreaming = false,
  isLoadingOlder = false,
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

    // Ensure header separator row has proper format with at least 3 dashes
    content = content.replace(/\|(-+)\|/g, (match, dashes) => {
      // Make sure each cell separator has at least 3 dashes
      const cells = dashes.split('|');
      const formattedCells = cells.map((cell: string) => {
        const trimmed = cell.trim();
        return trimmed.length >= 3 ? trimmed : '---';
      });
      return '|' + formattedCells.join('|') + '|';
    });

    // Improve table header separator detection and formatting
    content = content.replace(/\|([\s-:]*)\|/g, (match, separators) => {
      if (separators.includes('-')) {
        // This is likely a table separator row, ensure it's properly formatted
        const cells = separators.split('|');
        const formattedCells = cells.map((cell: string) => {
          const trimmed = cell.trim();
          // Preserve alignment colons if present
          if (trimmed.startsWith(':') && trimmed.endsWith(':')) {
            return ':---:'; // Center align
          } else if (trimmed.startsWith(':')) {
            return ':---';  // Left align
          } else if (trimmed.endsWith(':')) {
            return '---:';  // Right align
          } else {
            return '---';   // Default align
          }
        });
        return '|' + formattedCells.join('|') + '|';
      }
      return match; // Not a separator row, leave as is
    });

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
    // Only auto-scroll for new messages (streaming or first in group at the bottom)
    // Don't auto-scroll when loading older messages at the top
    if (bubbleRef.current && isStreaming && !isLoadingOlder) {
      // For streaming messages, we still want to scroll into view
      bubbleRef.current.scrollIntoView({
        behavior: 'smooth',
        block: 'end'
      });

      // Dispatch an event to notify that we're scrolling to bottom
      window.dispatchEvent(new CustomEvent('scrollToBottom'));
    }
  }, [message.content, isStreaming, isLoadingOlder]);

  // Add a small delay to ensure content is fully rendered before scrolling
  useEffect(() => {
    // Only auto-scroll for new messages at the bottom
    // Don't auto-scroll when loading older messages at the top
    if (bubbleRef.current && isFirstInGroup && isStreaming && !isLoadingOlder) {
      const timer = setTimeout(() => {
        bubbleRef.current?.scrollIntoView({
          behavior: 'smooth',
          block: 'end'
        });
      }, 100);

      return () => clearTimeout(timer);
    }
  }, [isFirstInGroup, isStreaming, isLoadingOlder]);

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
          px={3}
          py={isSingleLine ? 1.5 : 2}
          width="auto"
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
          }}
        >
          <Box position="relative" textAlign="left" width="100%" overflow="hidden">
            {isStreaming || !message.content ? (
              <div
                dangerouslySetInnerHTML={{ __html: contentWithCursor }}
                style={{ whiteSpace: "pre-wrap" }}
              />
            ) : (
              <div style={{ maxWidth: '100%' }}>
                <ReactMarkdown
                  remarkPlugins={[remarkGfm]}
                  rehypePlugins={[rehypeRaw, rehypeSanitize]}
                  components={{
                    code({ node, inline, className, children, ...props }: any) {
                      const match = /language-(\w+)/.exec(className || '');

                      if (!inline && match) {
                        // Force horizontal scrolling with explicit inline styles
                        return (
                          <div style={{
                            position: 'relative',
                            margin: '0.75em 0',
                            borderRadius: '6px',
                            border: `1px solid ${isUser ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.1)'}`,
                            backgroundColor: isUser ? 'rgba(0,0,0,0.2)' : useColorModeValue('rgba(0,0,0,0.03)', 'rgba(255,255,255,0.05)'),
                            maxWidth: '100%',
                            overflow: 'hidden'
                          }}>
                            <div style={{
                              overflowX: 'auto',
                              overflowY: 'auto',
                              maxHeight: '400px',
                              width: '100%',
                              WebkitOverflowScrolling: 'touch'
                            }}>
                              <table style={{
                                tableLayout: 'fixed',
                                width: '1px', // This forces the table to be as narrow as possible
                                margin: 0,
                                padding: 0,
                                border: 'none',
                                borderCollapse: 'collapse'
                              }}>
                                <tbody>
                                  <tr>
                                    <td style={{
                                      padding: 0,
                                      border: 'none',
                                      whiteSpace: 'pre'
                                    }}>
                                      <pre style={{
                                        margin: 0,
                                        padding: '1em',
                                        fontSize: '0.875em',
                                        lineHeight: 1.5,
                                        fontFamily: '"SFMono-Regular", Consolas, "Liberation Mono", Menlo, monospace',
                                        whiteSpace: 'pre',
                                        display: 'block'
                                      }}>
                                        <code>
                                          {String(children).replace(/\n$/, '')}
                                        </code>
                                      </pre>
                                    </td>
                                  </tr>
                                </tbody>
                              </table>
                            </div>
                          </div>
                        );
                      }

                      // For inline code
                      return (
                        <code
                          className={className}
                          style={{
                            backgroundColor: isUser ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.05)',
                            padding: '0.2em 0.4em',
                            borderRadius: '3px',
                            fontSize: '0.9em',
                            fontFamily: 'monospace',
                            wordBreak: 'break-all',
                            whiteSpace: 'pre-wrap',
                          }}
                          {...props}
                        >
                          {children}
                        </code>
                      );
                    },
                    a: ({ node, ...props }) => (
                      <a
                        {...props}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{
                          color: isUser ? 'rgba(255,255,255,0.9)' : undefined,
                          textDecoration: 'underline',
                          textUnderlineOffset: '2px',
                          textDecorationThickness: '1px',
                          transition: 'opacity 0.2s ease',
                        }}
                        onMouseOver={(e) => { e.currentTarget.style.opacity = '0.8'; }}
                        onMouseOut={(e) => { e.currentTarget.style.opacity = '1'; }}
                      />
                    ),
                    p: ({ node, ...props }) => (
                      <p
                        style={{
                          margin: '0.5em 0',
                          padding: 0,
                          maxWidth: '100%',
                          overflowWrap: 'break-word',
                          wordBreak: 'break-word',
                        }}
                        {...props}
                      />
                    ),
                    ul: ({ node, ...props }) => (
                      <ul
                        style={{
                          paddingLeft: '1.5em',
                          margin: '0.6em 0',
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
                          margin: '0.6em 0',
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
                          paddingLeft: '0.2em',
                          display: 'list-item'
                        }}
                        {...props}
                      />
                    ),
                    blockquote: ({ node, ...props }) => (
                      <blockquote
                        style={{
                          borderLeft: `3px solid ${isUser ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.2)'}`,
                          margin: '0.6em 0',
                          color: isUser ? 'rgba(255,255,255,0.9)' : undefined,
                          fontStyle: 'italic',
                          backgroundColor: isUser ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.03)',
                          padding: '0.5em 0.75em',
                          borderRadius: '0 6px 6px 0',
                          boxShadow: `inset 0 1px 3px ${isUser ? 'rgba(0,0,0,0.1)' : 'rgba(0,0,0,0.03)'}`
                        }}
                        {...props}
                      />
                    ),
                    hr: ({ node, ...props }) => (
                      <hr
                        style={{
                          border: 'none',
                          height: '2px',
                          backgroundImage: isUser
                            ? 'linear-gradient(to right, rgba(255,255,255,0.1), rgba(255,255,255,0.3), rgba(255,255,255,0.1))'
                            : 'linear-gradient(to right, rgba(0,0,0,0.03), rgba(0,0,0,0.1), rgba(0,0,0,0.03))',
                          margin: '1.5em 0'
                        }}
                        {...props}
                      />
                    ),
                    h1: ({ node, ...props }) => (
                      <h1
                        style={{
                          borderBottom: `1px solid ${isUser ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.1)'}`,
                          paddingBottom: '0.3em',
                          marginTop: '1.5em',
                          marginBottom: '0.75em',
                          fontWeight: 600,
                          fontSize: '1.6em',
                          lineHeight: 1.3
                        }}
                        {...props}
                      />
                    ),
                    h2: ({ node, ...props }) => (
                      <h2
                        style={{
                          borderBottom: `1px solid ${isUser ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)'}`,
                          paddingBottom: '0.2em',
                          marginTop: '1.4em',
                          marginBottom: '0.7em',
                          fontWeight: 600,
                          fontSize: '1.4em',
                          lineHeight: 1.3
                        }}
                        {...props}
                      />
                    ),
                    h3: ({ node, ...props }) => (
                      <h3
                        style={{
                          marginTop: '1.3em',
                          marginBottom: '0.6em',
                          fontWeight: 600,
                          fontSize: '1.2em',
                          lineHeight: 1.3
                        }}
                        {...props}
                      />
                    ),
                    h4: ({ node, ...props }) => (
                      <h4
                        style={{
                          marginTop: '1.2em',
                          marginBottom: '0.5em',
                          fontWeight: 600,
                          fontSize: '1.1em',
                          lineHeight: 1.3
                        }}
                        {...props}
                      />
                    ),
                    table: ({ node, ...props }) => (
                      <div style={{
                        width: '100%',
                        maxWidth: '100%',
                        overflowX: 'auto',
                        margin: '1em 0',
                        padding: '0',
                        borderRadius: '6px',
                        border: `1px solid ${isUser ? 'rgba(255,255,255,0.2)' : colors.borderColor}`,
                      }}>
                        <table
                          style={{
                            borderCollapse: 'collapse',
                            width: 'auto',
                            fontSize: '0.9em',
                            margin: 0,
                            padding: 0,
                          }}
                          {...props}
                        />
                      </div>
                    ),
                    thead: ({ node, ...props }) => (
                      <thead
                        style={{
                          backgroundColor: isUser
                            ? 'rgba(255,255,255,0.15)'
                            : useColorModeValue('rgba(0,0,0,0.05)', 'rgba(255,255,255,0.05)'),
                          margin: 0,
                          padding: 0
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
                          padding: '0.5em 0.75em',
                          textAlign: 'left',
                          fontWeight: 'bold',
                          borderBottom: `2px solid ${isUser
                            ? 'rgba(255,255,255,0.3)'
                            : colors.borderColor}`,
                          borderRight: `1px solid ${isUser
                            ? 'rgba(255,255,255,0.1)'
                            : colors.borderColor}`
                        }}
                        {...props}
                      />
                    ),
                    td: ({ node, ...props }) => (
                      <td
                        style={{
                          padding: '0.5em 0.75em',
                          borderRight: `1px solid ${isUser
                            ? 'rgba(255,255,255,0.1)'
                            : colors.borderColor}`
                        }}
                        {...props}
                      />
                    ),
                    img: ({ node, ...props }) => (
                      <img
                        style={{
                          maxWidth: '100%',
                          height: 'auto',
                          borderRadius: '4px',
                          margin: '0.5em 0',
                          border: `1px solid ${isUser ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.1)'}`,
                        }}
                        {...props}
                        loading="lazy"
                      />
                    ),
                    pre: ({ children }: any) => <>{children}</>,
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
              transform: "none"
            }}
          >
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
  if (
    prevProps.message.content?.includes('[Generation was interrupted') ||
    nextProps.message.content?.includes('[Generation was interrupted')
  ) {
    return false;
  }

  return (
    prevProps.isUser === nextProps.isUser &&
    prevProps.isFirstInGroup === nextProps.isFirstInGroup &&
    prevProps.isTaskMode === nextProps.isTaskMode &&
    prevProps.isStreaming === nextProps.isStreaming &&
    prevProps.isLoadingOlder === nextProps.isLoadingOlder &&
    prevProps.message.content === nextProps.message.content
  );
});
