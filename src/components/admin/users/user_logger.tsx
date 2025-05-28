"use client"

import React, { useState, useEffect } from "react";
import {
    Box,
    Text,
    VStack,
    Flex,
    Icon,
    Spinner,
    Badge,
    Separator,
    Button,
    IconButton,
} from "@chakra-ui/react";
import { FaClock, FaUser, FaSignInAlt, FaSignOutAlt, FaEdit, FaTrash, FaPlus, FaUserPlus } from "react-icons/fa";
import { FiRefreshCw } from "react-icons/fi";
import { useColorModeValue } from "@/components/ui/color-mode";
import { motion } from "framer-motion";
import { toaster } from "@/components/ui/toaster";

// Define the UserLog interface
interface UserLog {
    id: string;
    username: string;
    action: string;
    action_type: "login" | "logout" | "create" | "update" | "delete" | "other";
    details?: string;
    ip_address?: string;
    created_at: string;
}

interface UserLoggerProps {
    userId?: string;
    limit?: number;
    showUsername?: boolean;
    showHeader?: boolean;
    height?: string;
    onLogClick?: (log: UserLog) => void;
    onCreateUser?: () => void;
}

const MotionBox = motion.create(Box);

const UserLogger: React.FC<UserLoggerProps> = ({
    userId,
    limit = 10,
    showUsername = true,
    showHeader = true,
    height = "400px",
    onLogClick,
    onCreateUser
}) => {
    const [logs, setLogs] = useState<UserLog[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Define custom colors using useColorModeValue for dark mode support
    const borderColor = useColorModeValue("gray.200", "gray.700");
    const hoverBg = useColorModeValue("gray.50", "gray.700");
    const textColor = useColorModeValue("gray.800", "gray.100");
    const cardBg = useColorModeValue("white", "gray.800");
    const textColorMuted = useColorModeValue("gray.600", "gray.400");
    const bgSubtle = useColorModeValue("gray.50", "gray.800");
    const errorText = useColorModeValue("red.500", "red.300");
    const buttonBg = useColorModeValue("blue.500", "blue.400");
    const buttonHoverBg = useColorModeValue("blue.600", "blue.500");

    // Handle create user click
    const handleCreateUserClick = () => {
        console.log("Create user button clicked");
        if (onCreateUser) {
            onCreateUser();
        }
    };

    // Fetch user logs
    const fetchUserLogs = async () => {
        try {
            setLoading(true);
            const params = new URLSearchParams({
                limit: limit.toString(),
            });

            if (userId) {
                params.append('id', userId);
            }

            const response = await fetch(`/api/user/get_user_logs?${params.toString()}`);

            if (!response.ok) {
                throw new Error(`Error: ${response.status}`);
            }

            const data = await response.json();
            setLogs(data.logs);
            setError(null);
        } catch (err) {
            toaster.create({
                title: "Error fetching user logs",
                description: "Failed to fetch user logs. Please try again later.",
                type: "error"
            })
            setError((err as Error).message);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchUserLogs();
        // Optional: Set up a refresh interval
        const intervalId = setInterval(fetchUserLogs, 60000); // Refresh every minute

        return () => clearInterval(intervalId);
    }, [userId, limit]);

    // Format date helper
    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleString();
    };

    // Get icon for action type
    const getActionIcon = (actionType: string) => {
        switch (actionType) {
            case 'login':
                return FaSignInAlt;
            case 'logout':
                return FaSignOutAlt;
            case 'create':
                return FaPlus;
            case 'update':
                return FaEdit;
            case 'delete':
                return FaTrash;
            default:
                return FaClock;
        }
    };

    // Get badge color for action type
    const getActionColor = (actionType: string) => {
        switch (actionType) {
            case 'login':
                return 'green';
            case 'logout':
                return 'orange';
            case 'create':
                return 'blue';
            case 'update':
                return 'purple';
            case 'delete':
                return 'red';
            default:
                return 'gray';
        }
    };

    // Animation variants
    const containerVariants = {
        hidden: { opacity: 0 },
        visible: {
            opacity: 1,
            transition: {
                duration: 0.3,
                when: "beforeChildren",
                staggerChildren: 0.05,
            },
        },
    };

    const itemVariants = {
        hidden: { opacity: 0, y: 10 },
        visible: { opacity: 1, y: 0, transition: { duration: 0.2 } },
    };

    return (
        <MotionBox
            initial="hidden"
            animate="visible"
            variants={containerVariants}
            height={height}
            overflow="auto"
            borderRadius="md"
            borderWidth="1px"
            borderColor={borderColor}
            bg={cardBg}
        >
            {showHeader && (
                <Flex
                    justify="space-between"
                    align="center"
                    p={4}
                    borderBottomWidth="1px"
                    borderColor={borderColor}
                    bg={bgSubtle}
                >
                    <Flex align="center" gap={2}>
                        <Text fontWeight="medium" color={textColor}>User Activity Log</Text>
                        <Badge
                            colorScheme="blue"
                            borderRadius="full"
                            px={2}
                        >
                            {logs.length} entries
                        </Badge>
                    </Flex>

                    <IconButton
                        aria-label="Sync User Logs"
                        size="sm"
                        colorScheme="blue"
                        variant="ghost"
                        loading={loading}
                        onClick={fetchUserLogs}
                        _hover={{ bg: "blue.50", color: "blue.600" }}
                    >
                        <Icon as={FiRefreshCw} />
                    </IconButton>
                </Flex>
            )}

            {loading ? (
                <Flex justify="center" align="center" height="200px">
                    <Spinner size="lg" color="blue.500" />
                </Flex>
            ) : error ? (
                <Flex justify="center" align="center" p={4}>
                    <Text color={errorText}>{error}</Text>
                </Flex>
            ) : logs.length === 0 ? (
                <Flex justify="center" align="center" height="200px" direction="column" gap={2}>
                    <Icon as={FaClock} fontSize="2xl" color={textColorMuted} />
                    <Text color={textColorMuted}>No activity logs found</Text>
                </Flex>
            ) : (
                <VStack gap={0} align="stretch">
                    {logs.map((log, index) => (
                        <MotionBox
                            key={log.id}
                            variants={itemVariants}
                            p={3}
                            borderBottomWidth={index < logs.length - 1 ? "1px" : "0"}
                            borderColor={borderColor}
                            _hover={{ bg: hoverBg, cursor: onLogClick ? "pointer" : "default" }}
                            onClick={() => onLogClick && onLogClick(log)}
                        >
                            <Flex gap={3} align="flex-start">
                                <Box
                                    p={2}
                                    borderRadius="md"
                                    bg={`${getActionColor(log.action_type)}.50`}
                                    color={`${getActionColor(log.action_type)}.500`}
                                >
                                    <Icon as={getActionIcon(log.action_type)} />
                                </Box>

                                <Box flex="1">
                                    <Flex justify="space-between" align="center" mb={1}>
                                        <Text fontWeight="medium" fontSize="sm" color={textColor}>
                                            {log.action}
                                        </Text>
                                        <Text fontSize="xs" color={textColorMuted}>
                                            {formatDate(log.created_at)}
                                        </Text>
                                    </Flex>

                                    {showUsername && (
                                        <Text fontSize="xs" color={textColorMuted} mb={1}>
                                            <Icon as={FaUser} fontSize="10px" mr={1} />
                                            {log.username}
                                        </Text>
                                    )}

                                    {log.details && (
                                        <Text fontSize="xs" color={textColorMuted}>
                                            {log.details}
                                        </Text>
                                    )}
                                </Box>
                            </Flex>
                        </MotionBox>
                    ))}
                </VStack>
            )}
        </MotionBox>
    );
};

export default UserLogger;