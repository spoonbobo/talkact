"use client";

import { Box, Text, Menu, Portal, Group } from "@chakra-ui/react";
import { IMessage } from "@/types/chat";
import ReactMarkdown from "react-markdown";
import { useEffect, useState, useMemo, useRef, useLayoutEffect } from "react";
import { useTranslations } from "next-intl";
import React from "react";
import { useChatPageColors, useCodeSyntaxHighlightColors } from "@/utils/colors";
import { LuCopy, LuMessageSquare, LuPencil, LuTrash, LuQuote, LuShare } from "react-icons/lu";
import { useColorModeValue } from "@/components/ui/color-mode";
import remarkGfm from 'remark-gfm';
import rehypeRaw from 'rehype-raw';
import rehypeSanitize from 'rehype-sanitize';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { DeleteMessageModal } from "@/components/chat/delete_message.modal";
import { motion, AnimatePresence } from 'framer-motion';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

// Define the cn function directly
function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// An improved Web Animation API based staggered text animation
const StaggeredTextAnimation = ({ text, className = '' }: { text: string; className?: string }) => {
  const containerRef = useRef<HTMLDivElement>(null);

  // Use a layout effect to set up the animation once
  useLayoutEffect(() => {
    if (!containerRef.current) return;

    const container = containerRef.current;
    // Clear any existing content
    container.innerHTML = '';

    // Skip animation for very long texts to improve performance
    if (text.length > 1000) {
      container.textContent = text;
      return;
    }

    // Create a document fragment for better performance
    const fragment = document.createDocumentFragment();

    // Group characters into chunks for better performance
    const chunkSize = 4; // Process characters in small groups
    const chunks = [];

    for (let i = 0; i < text.length; i += chunkSize) {
      chunks.push(text.slice(i, i + chunkSize));
    }

    // Create and append each chunk
    chunks.forEach((chunk, chunkIndex) => {
      const span = document.createElement('span');
      span.textContent = chunk;
      span.style.opacity = '0';
      span.style.display = 'inline';

      // Add to fragment instead of directly to DOM
      fragment.appendChild(span);

      // Use Web Animation API with easing for smoother animation
      requestAnimationFrame(() => {
        span.animate(
          [
            { opacity: 0, transform: 'translateY(2px)' },
            { opacity: 1, transform: 'translateY(0)' }
          ],
          {
            duration: 120, // Slightly longer for smoother effect
            delay: chunkIndex * 8, // Increased stagger for more visible effect
            easing: 'ease-out', // Add easing for smoother animation
            fill: 'forwards'
          }
        );
      });
    });

    // Append all elements at once
    container.appendChild(fragment);

  }, [text]);

  return (
    <div
      ref={containerRef}
      className={cn("w-full whitespace-pre-wrap", className)}
    />
  );
};

// An improved streaming content component with better animations
const StreamingContent = ({ content, className = '' }: { content: string; className?: string }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const previousContentRef = useRef('');

  // Use a layout effect to update only the new content
  useLayoutEffect(() => {
    if (!containerRef.current) return;

    const container = containerRef.current;
    const previousContent = previousContentRef.current;

    // If this is the first render or content is shorter than before (rare case)
    if (!previousContent || content.length < previousContent.length) {
      container.innerHTML = '';
      previousContentRef.current = '';
    }

    // Only process the new chunk (what's been added since last update)
    if (content.length > previousContent.length) {
      const newChunk = content.slice(previousContent.length);

      // Group characters into chunks for better performance
      const chunkSize = 4; // Process characters in small groups
      const chunks = [];

      for (let i = 0; i < newChunk.length; i += chunkSize) {
        chunks.push(newChunk.slice(i, i + chunkSize));
      }

      // Create a document fragment for better performance
      const fragment = document.createDocumentFragment();

      // Create and append each chunk with improved animation
      chunks.forEach((chunk, chunkIndex) => {
        const span = document.createElement('span');
        span.textContent = chunk;
        span.style.opacity = '0';
        span.style.display = 'inline';

        // Add to fragment instead of directly to DOM
        fragment.appendChild(span);

        // Use Web Animation API with improved animation
        requestAnimationFrame(() => {
          span.animate(
            [
              { opacity: 0, transform: 'translateY(1px)' },
              { opacity: 1, transform: 'translateY(0)' }
            ],
            {
              duration: 100, // Slightly longer for smoother effect
              delay: chunkIndex * 5, // Small stagger between chunks
              easing: 'ease-out', // Add easing for smoother animation
              fill: 'forwards'
            }
          );
        });
      });

      // Append the new chunk
      container.appendChild(fragment);

      // Update the previous content reference
      previousContentRef.current = content;
    }
  }, [content]);

  return (
    <div
      ref={containerRef}
      className={cn("w-full whitespace-pre-wrap", className)}
    />
  );
};

// Add a shimmering loading effect component
const ShimmeringLoadingEffect = () => {
  return (
    <div className="relative overflow-hidden w-full">
      <div className="animate-pulse bg-gray-200 dark:bg-gray-700 opacity-30 h-4 w-24 rounded mb-2"></div>
      <div className="animate-pulse bg-gray-200 dark:bg-gray-700 opacity-30 h-4 w-full rounded mb-2"></div>
      <div className="animate-pulse bg-gray-200 dark:bg-gray-700 opacity-30 h-4 w-3/4 rounded mb-2"></div>
      <div className="animate-pulse bg-gray-200 dark:bg-gray-700 opacity-30 h-4 w-5/6 rounded"></div>

      {/* Shimmering overlay effect */}
      <div
        className="absolute inset-0 z-10"
        style={{
          background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.2), transparent)',
          animation: 'shimmer 2s infinite',
        }}
      ></div>

      <style jsx>{`
        @keyframes shimmer {
          0% {
            transform: translateX(-100%);
          }
          100% {
            transform: translateX(100%);
          }
        }
      `}</style>
    </div>
  );
};

// Add a component for the generating text with shimmer effect
const GeneratingText = () => {
  const t = useTranslations("Chat");

  return (
    <div className="relative inline-block">
      <span
        className="font-medium italic bg-clip-text text-transparent"
        style={{
          backgroundImage:
            'linear-gradient(270deg, #ff6b6b, #f7d774, #6bffb0, #6bc1ff, #b86bff, #ff6b6b)',
          backgroundSize: '400% 100%',
          backgroundRepeat: 'repeat',
          animation: 'shine-multicolor 4s linear infinite',
        }}
      >
        {t("generating")}
      </span>

      <style jsx>{`
        @keyframes shine-multicolor {
          0% {
            background-position: 400% center;
          }
          100% {
            background-position: 0% center;
          }
        }
      `}</style>
    </div>
  );
};

// Extend the props interface directly in the file
interface IChatBubbleProps {
  message: IMessage;
  isUser: boolean;
  isFirstInGroup: boolean;
  isTaskMode?: boolean;
  isStreaming?: boolean;
  isLoadingOlder?: boolean;
  showThumbnails?: boolean;
}

// Define a type for menu items
interface MenuItemType {
  label: string;
  value: string;
  icon: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  tooltip?: string;
}

export const ChatBubble = React.memo(({
  message,
  isUser,
  isFirstInGroup,
  isTaskMode = true,
  isStreaming = false,
  isLoadingOlder = false,
  showThumbnails = false,
}: IChatBubbleProps) => {
  const t = useTranslations("Chat");
  const colors = useChatPageColors();
  const codeColors = useCodeSyntaxHighlightColors();

  // Move these to the top of the component function
  const menuBgColor = useColorModeValue("white", "gray.800");
  const menuBorderColor = useColorModeValue("gray.100", "gray.700");
  const menuItemHoverBg = useColorModeValue("gray.50", "gray.700");
  const menuIconColor = useColorModeValue("gray.600", "gray.400");
  const menuTextColor = useColorModeValue("gray.800", "gray.200");
  const codeBlockBg = useColorModeValue('rgba(0,0,0,0.03)', 'rgba(255,255,255,0.05)');
  const tableHeadBg = useColorModeValue('rgba(0,0,0,0.05)', 'rgba(255,255,255,0.05)');
  const menuBoxShadow = useColorModeValue(
    "0 4px 12px rgba(0,0,0,0.1)",
    "0 4px 12px rgba(0,0,0,0.3)"
  );

  // Add state to track if content is single line
  const [isSingleLine, setIsSingleLine] = useState(false);

  // Add ref for the bubble element to enable scrolling into view
  const bubbleRef = React.useRef<HTMLDivElement>(null);

  // Get current bubble background
  const currentBubbleBg = isUser
    ? (isTaskMode ? colors.userBgTask : colors.userBgChat)
    : (isTaskMode ? colors.otherBgTask : colors.otherBgChat);

  // Add state for delete modal
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

  // Pre-process the message content
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

    // If this is an interrupted message, add special styling to the interruption notice
    if (isInterrupted) {
      content = content.replace(
        /(\[Generation was interrupted.*?\])/g,
        '<span style="color: #ff6b6b; font-style: italic; font-size: 0.9em; display: block; margin-top: 8px;">$1</span>'
      );
    }

    return content;
  }, [message.content]);

  // Function to handle message deletion success
  const handleDeleteSuccess = () => {
    // Your existing delete success logic...
    window.dispatchEvent(new CustomEvent('messageDeleted', {
      detail: { messageId: message.id }
    }));
  };

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

  // Handle copy functionality
  const handleCopy = () => {
    if (!message.content) return;

    // Use the fallback method directly
    const textArea = document.createElement('textarea');
    textArea.value = message.content;

    // Make the textarea out of viewport
    textArea.style.position = 'fixed';
    textArea.style.left = '-999999px';
    textArea.style.top = '-999999px';
    document.body.appendChild(textArea);

    textArea.focus();
    textArea.select();

    try {
      document.execCommand('copy');
    } catch (err) {
      console.error('Failed to copy text: ', err);
    }

    document.body.removeChild(textArea);
  };

  // Add a ref to track if we're currently streaming
  const isCurrentlyStreamingRef = useRef(isStreaming);

  // Update the ref when isStreaming changes
  useEffect(() => {
    isCurrentlyStreamingRef.current = isStreaming;
  }, [isStreaming]);

  // Use a ref to track the last processed content to avoid unnecessary DOM updates
  const lastContentRef = useRef('');

  // Use a ref to track the last content length to optimize updates
  const lastContentLengthRef = useRef(0);

  return (
    <>
      <Menu.Root>
        <Menu.ContextTrigger>
          <div>
            <Box
              ref={bubbleRef}
              position="relative"
              px={3}
              py={isSingleLine ? 1.5 : 2}
              width="auto"
              maxW="100%"
              borderRadius="xl"
              bg={currentBubbleBg}
              color={isUser
                ? "white"
                : (isTaskMode ? colors.otherTextTask : colors.otherTextChat)}
              mb={1}
              boxShadow="0 2px 4px rgba(0,0,0,0.08)"
              alignSelf={isUser ? "flex-end" : "flex-start"}
              wordBreak="break-word"
              textAlign="left"
              style={{
                opacity: 1,
                userSelect: "text",
                marginLeft: !isUser && showThumbnails ? '40px' : '0',
                marginRight: isUser && showThumbnails ? '40px' : '0',
              }}
            >
              <Box position="relative" textAlign="left" width="100%" overflow="hidden">
                {/* Keep streaming content animation but remove regular content animation */}
                {isStreaming ? (
                  processedContent ? (
                    <StreamingContent
                      content={processedContent}
                      className="whitespace-pre-wrap"
                    />
                  ) : (
                    <GeneratingText />
                  )
                ) : (
                  <div style={{ maxWidth: '100%' }}>
                    {message.content ? (
                      <ReactMarkdown
                        remarkPlugins={[remarkGfm]}
                        rehypePlugins={[rehypeRaw, rehypeSanitize]}
                        components={{
                          code({ node, inline, className, children, ...props }: any) {
                            const match = /language-(\w+)/.exec(className || '');

                            if (!inline && match) {
                              return (
                                <div style={{
                                  position: 'relative',
                                  margin: '0.75em 0',
                                  borderRadius: '6px',
                                  border: `1px solid ${isUser ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.1)'}`,
                                  backgroundColor: isUser ? 'rgba(0,0,0,0.2)' : codeBlockBg,
                                  maxWidth: '100%',
                                  overflow: 'hidden'
                                }}>
                                  <div className="custom-scrollbar" style={{
                                    overflowX: 'auto',
                                    overflowY: 'auto',
                                    maxHeight: '400px',
                                    width: '100%',
                                    WebkitOverflowScrolling: 'touch',
                                    scrollbarWidth: 'thin',
                                  }}>
                                    <SyntaxHighlighter
                                      language={match[1]}
                                      style={codeColors.codeStyle}
                                      customStyle={{
                                        margin: 0,
                                        padding: '1em',
                                        fontSize: '0.875em',
                                        lineHeight: 1.5,
                                        backgroundColor: 'transparent'
                                      }}
                                    >
                                      {String(children).replace(/\n$/, '')}
                                    </SyntaxHighlighter>
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
                              border: `1px solid ${isUser ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.1)'}`,
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
                                  : tableHeadBg,
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
                                  : 'rgba(0,0,0,0.1)'}`
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
                                  : 'rgba(0,0,0,0.15)'}`,
                                borderRight: `1px solid ${isUser
                                  ? 'rgba(255,255,255,0.1)'
                                  : 'rgba(0,0,0,0.05)'}`
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
                                  : 'rgba(0,0,0,0.05)'}`
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
                    ) : (
                      <Text color={colors.textColorSecondary} fontStyle="italic">
                        {t("empty_message")}
                      </Text>
                    )}
                  </div>
                )}
              </Box>
            </Box>
          </div>
        </Menu.ContextTrigger>
        <Portal>
          <Menu.Positioner>
            <Menu.Content
              bg={menuBgColor}
              borderRadius="xl"
              boxShadow={menuBoxShadow}
              overflow="hidden"
              border="1px solid"
              borderColor={menuBorderColor}
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
                borderColor={menuBorderColor}
              >
                {/* Horizontal menu items with emojis */}
                {[
                  { label: "👍", value: "like", icon: null },
                  { label: "👎", value: "unlike", icon: null },
                  { label: "❤️", value: "heart", icon: null },
                  { label: "😂", value: "laugh", icon: null },
                ].map((item) => (
                  <Menu.Item
                    key={item.value}
                    value={item.value}
                    width="10"
                    height="10"
                    gap="0"
                    flexDirection="column"
                    fontSize="lg"
                    borderRadius="md"
                    _hover={{ bg: menuItemHoverBg }}
                    p={1}
                  >
                    {item.label}
                  </Menu.Item>
                ))}
              </Group>

              <Box py={1}>
                {/* Vertical menu items */}
                {[
                  { label: t("Copy"), value: "copy", icon: <LuCopy />, onClick: handleCopy },
                  ...(isUser ? [
                    { label: t("Edit"), value: "edit", icon: <LuPencil /> },
                    {
                      label: t("Delete"),
                      value: "delete",
                      icon: <LuTrash />,
                      onClick: () => setIsDeleteModalOpen(true)
                    }
                  ] : [])
                ].map((item) => (
                  <Menu.Item
                    key={item.value}
                    value={item.value}
                    onClick={item.onClick}
                    borderRadius="md"
                    _hover={{ bg: menuItemHoverBg }}
                    py={1.5}
                    px={3}
                    fontSize="sm"
                  >
                    <Group gap={2} justify="flex-start" align="center">
                      <Box fontSize="sm" color={menuIconColor}>{item.icon}</Box>
                      <Text fontWeight="medium" color={menuTextColor}>{item.label}</Text>
                    </Group>
                  </Menu.Item>
                ))}
              </Box>
            </Menu.Content>
          </Menu.Positioner>
        </Portal>
      </Menu.Root>

      {/* Add the delete message modal */}
      {isUser && (
        <DeleteMessageModal
          isOpen={isDeleteModalOpen}
          onClose={() => setIsDeleteModalOpen(false)}
          message={message}
          onDeleteSuccess={handleDeleteSuccess}
        />
      )}
    </>
  );
}, (prevProps, nextProps) => {
  // Always update when streaming state changes
  if (prevProps.isStreaming !== nextProps.isStreaming) {
    return false; // Force update
  }

  // For streaming content, update on any content change
  if (nextProps.isStreaming && prevProps.message.content !== nextProps.message.content) {
    return false; // Force update for any content change during streaming
  }

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
    prevProps.isLoadingOlder === nextProps.isLoadingOlder &&
    prevProps.showThumbnails === nextProps.showThumbnails &&
    prevProps.message.content === nextProps.message.content
  );
});
