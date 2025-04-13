"use client"

import { useEffect, useState, useRef } from "react";
import { Box, Flex, Text } from "@chakra-ui/react";
import { motion, AnimatePresence } from "framer-motion";
import { useColorModeValue } from "@/components/ui/color-mode";
import { useDispatch, useSelector } from "react-redux";
import {
    selectIsVisible,
    selectMessage,
    setAnnouncementItems,
    selectAnnouncementItems,
    setCurrentAnnouncementIndex,
    selectCurrentAnnouncementIndex
} from "@/store/features/announcementSlice";

interface GitHubIssue {
    title: string;
    body: string;
    state: string;
    labels: { name: string }[];
}

export default function Announcement({ navExpanded, inFooter }: { navExpanded?: boolean, inFooter?: boolean }) {
    const dispatch = useDispatch();
    const isVisible = useSelector(selectIsVisible);
    const defaultMessage = useSelector(selectMessage);
    const storedAnnouncements = useSelector(selectAnnouncementItems) || [];
    const currentIndex = useSelector(selectCurrentAnnouncementIndex) || 0;

    const [isLoading, setIsLoading] = useState(true);

    // Use color mode values for text
    const textColor = useColorModeValue("gray.800", "gray.100");
    const bgColor = useColorModeValue("white", "gray.800");

    // Fetch all GitHub issues
    useEffect(() => {
        const fetchAnnouncements = async () => {
            try {
                setIsLoading(true);
                const response = await fetch('/api/github/issue');

                if (!response.ok) {
                    throw new Error('Failed to fetch announcements');
                }

                const data = await response.json();

                // Filter for open issues only
                const openIssues = data.issues.filter((issue: GitHubIssue) =>
                    issue.state === 'open'
                );

                if (openIssues.length > 0) {
                    // Format the announcements with type information
                    const formattedAnnouncements = openIssues.map((issue: GitHubIssue) => {
                        let type = "info";

                        if (issue.labels.some(label => label.name.toLowerCase() === 'bug')) {
                            type = "bug";
                        } else if (issue.labels.some(label => label.name.toLowerCase() === 'enhancement')) {
                            type = "enhancement";
                        } else if (issue.labels.some(label => label.name.toLowerCase() === 'announcement')) {
                            type = "announcement";
                        }

                        return {
                            text: issue.title,
                            type
                        };
                    });

                    // Store in Redux instead of local state
                    dispatch(setAnnouncementItems(formattedAnnouncements));
                } else {
                    // If no announcements found, use the default message
                    dispatch(setAnnouncementItems([{ text: defaultMessage, type: "info" }]));
                }
            } catch (error) {
                console.error('Error fetching announcements:', error);
                dispatch(setAnnouncementItems([{ text: defaultMessage, type: "info" }]));
            } finally {
                setIsLoading(false);
            }
        };

        // Only fetch if we don't already have announcements in Redux
        if (!storedAnnouncements || storedAnnouncements.length <= 1) {
            fetchAnnouncements();
        }
    }, [defaultMessage, dispatch, storedAnnouncements?.length]);

    // Carousel-like display of announcements
    useEffect(() => {
        if (!storedAnnouncements || storedAnnouncements.length <= 1) return;

        const interval = setInterval(() => {
            const nextIndex = (currentIndex + 1) % storedAnnouncements.length;
            dispatch(setCurrentAnnouncementIndex(nextIndex));
        }, 5000); // Change every 5 seconds

        return () => clearInterval(interval);
    }, [currentIndex, dispatch, storedAnnouncements]);

    // Get the appropriate label text and color based on issue type
    const getLabelStyle = (type: string) => {
        switch (type) {
            case "bug":
                return { text: "BUG", bgColor: "red.500", color: "white" };
            case "enhancement":
                return { text: "FEATURE", bgColor: "purple.500", color: "white" };
            case "announcement":
                return { text: "NEWS", bgColor: "blue.500", color: "white" };
            default:
                return { text: "INFO", bgColor: "gray.500", color: "white" };
        }
    };

    if (!isVisible || !storedAnnouncements || storedAnnouncements.length === 0) return null;

    // Ensure currentIndex is within bounds
    const safeIndex = Math.min(currentIndex, storedAnnouncements.length - 1);

    if (inFooter) {
        return (
            <Flex align="center" justify="flex-end" width="100%">
                <AnimatePresence mode="wait">
                    <motion.div
                        key={safeIndex}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.3 }}
                        style={{ display: "flex", alignItems: "center" }}
                    >
                        {storedAnnouncements[safeIndex] && (
                            <Flex align="center" justify="flex-end">
                                <Text
                                    as="span"
                                    px={1.5}
                                    py={0.5}
                                    mr={2}
                                    fontSize="2xs"
                                    fontWeight="bold"
                                    borderRadius="md"
                                    bg={getLabelStyle(storedAnnouncements[safeIndex].type).bgColor}
                                    color={getLabelStyle(storedAnnouncements[safeIndex].type).color}
                                >
                                    {getLabelStyle(storedAnnouncements[safeIndex].type).text}
                                </Text>
                                <Text
                                    fontSize="xs"
                                    color="gray.500"
                                    lineClamp={1}
                                    maxWidth="250px"
                                >
                                    {storedAnnouncements[safeIndex].text}
                                </Text>
                            </Flex>
                        )}
                    </motion.div>
                </AnimatePresence>
            </Flex>
        );
    }

    return (
        <Box
            position="relative"
            zIndex="20"
            width="100%"
            bg="transparent"
            backgroundColor="transparent"
            py={1}
            px={inFooter ? 0 : 4}
            backdropFilter="none"
            height="auto"
            overflow="hidden"
            opacity={navExpanded ? 0.9 : 1}
            boxShadow="none"
            border="none"
            outline="none"
        >
            <Flex
                justify={inFooter ? "flex-end" : "center"}
                align="center"
                position="relative"
                minHeight="40px"
                bg="transparent"
                backgroundColor="transparent"
                boxShadow="none"
                border="none"
                outline="none"
                overflow="hidden"
                width="100%"
            >
                <AnimatePresence mode="wait">
                    <motion.div
                        key={safeIndex}
                        initial={{ opacity: 0, x: 100 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -100 }}
                        transition={{
                            duration: 0.5,
                            ease: "linear"
                        }}
                        style={{
                            position: "absolute",
                            width: "100%",
                            textAlign: "center",
                            color: textColor === "gray.800" ? "#2D3748" : "#E2E8F0",
                            fontWeight: 500,
                            fontSize: "0.875rem",
                            padding: "0 30px",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center"
                        }}
                    >
                        {storedAnnouncements[safeIndex] && (
                            <Flex align="center" justify="center">
                                <Text
                                    as="span"
                                    px={2}
                                    py={1}
                                    mr={3}
                                    fontSize="xs"
                                    fontWeight="bold"
                                    borderRadius="md"
                                    bg={getLabelStyle(storedAnnouncements[safeIndex].type).bgColor}
                                    color={getLabelStyle(storedAnnouncements[safeIndex].type).color}
                                >
                                    {getLabelStyle(storedAnnouncements[safeIndex].type).text}
                                </Text>
                                <Text
                                    lineClamp={1}
                                    overflow="hidden"
                                    textOverflow="ellipsis"
                                    maxWidth="100%"
                                >
                                    {storedAnnouncements[safeIndex].text}
                                </Text>
                            </Flex>
                        )}
                    </motion.div>
                </AnimatePresence>
            </Flex>
        </Box>
    );
}