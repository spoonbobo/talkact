"use client"

import {
    Box,
    Heading,
    Flex,
    Text,
    Grid,
    GridItem,
    HStack,
    Progress,
    Badge,
    Spinner,
    Icon,
    IconButton
} from '@chakra-ui/react';
import { useTranslations } from "next-intl";
import { IPlan, PlanStatus } from "@/types/plan";
import StatusBadge, { getStatusColorScheme } from "@/components/ui/StatusBadge";
import { useEffect, useState } from 'react';
import axios from 'axios';
import { FaCheck, FaStop, FaNetworkWired } from 'react-icons/fa';
import { FiRefreshCw } from 'react-icons/fi';
import { Tooltip } from "@/components/ui/tooltip";
import Link from 'next/link';

// Format date for display
const formatDate = (date: Date | null): string => {
    if (!date) return 'N/A';
    return new Date(date).toLocaleString(undefined, {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
};

interface PlanHeaderProps {
    plan: IPlan;
    colors: any;
    isLoading?: boolean;
    loadingTasks?: boolean;
}

export default function PlanHeader({ plan, colors, isLoading = false, loadingTasks = false }: PlanHeaderProps) {
    const t = useTranslations("Plans");
    const [roomName, setRoomName] = useState<string>("");
    const [assignerName, setAssignerName] = useState<string>("");
    const [assigneeName, setAssigneeName] = useState<string>("");
    const [isLoadingUsers, setIsLoadingUsers] = useState<boolean>(false);

    // Determine the n8n URL based on NODE_ENV
    const n8nUrl = process.env.NODE_ENV === 'development'
        ? 'http://n8n.onlysaid-dev.com'
        : 'https://n8n.onlysaid.com';

    useEffect(() => {
        if (plan?.room_id) {
            const fetchRoomName = async () => {
                try {
                    const response = await axios.post('/api/chat/get_room', {
                        roomId: plan.room_id
                    });

                    if (response.data && response.data.name) {
                        setRoomName(response.data.name);
                    }
                } catch (error) {
                    console.error('Error fetching room name:', error);
                    setRoomName("Unknown Room");
                }
            };

            fetchRoomName();
        }
    }, [plan]);

    // Fetch user names for assigner and assignee
    useEffect(() => {
        const fetchUserNames = async () => {
            setIsLoadingUsers(true);
            try {
                // Fetch assigner name
                if (plan.assigner && plan.assigner !== 'system') {
                    const assignerResponse = await axios.get(`/api/user/get_user_by_id?id=${plan.assigner}`);
                    if (assignerResponse.data.exists) {
                        setAssignerName(assignerResponse.data.user.name);
                    } else {
                        setAssignerName("Unknown User");
                    }
                } else {
                    setAssignerName(plan.assigner === 'system' ? 'System' : 'Unknown');
                }

                // Fetch assignee name
                if (plan.assignee) {
                    const assigneeResponse = await axios.get(`/api/user/get_user_by_id?id=${plan.assignee}`);
                    if (assigneeResponse.data.exists) {
                        setAssigneeName(assigneeResponse.data.user.name);
                    } else {
                        setAssigneeName("Unknown User");
                    }
                } else {
                    setAssigneeName("Unassigned");
                }
            } catch (error) {
                console.error('Error fetching user names:', error);
                if (!assignerName) setAssignerName("Error loading");
                if (!assigneeName) setAssigneeName("Error loading");
            } finally {
                setIsLoadingUsers(false);
            }
        };

        if (plan) {
            fetchUserNames();
        }
    }, [plan]);

    // Dummy handlers for the action buttons
    const handleApprove = async () => {
        console.log('Approve plan clicked');
    };

    const handleDeny = async () => {
        console.log('Deny plan clicked');
    };

    const handleRefresh = () => {
        console.log('Refresh clicked');
    };

    return (
        <Flex direction="column" width="100%">
            {/* Top section with title, status and progress */}
            <Flex justify="space-between" align="center" width="100%" mb={4}>
                <Box flex="1">
                    <Heading size="md" color={colors.textColorHeading}>{plan.plan_name}</Heading>
                </Box>

                <Flex align="center" gap={3}>
                    <Link href={n8nUrl} target="_blank" rel="noopener noreferrer">
                        <Badge
                            colorScheme="blue"
                            px={2}
                            py={1}
                            borderRadius="md"
                            display="flex"
                            alignItems="center"
                            cursor="pointer"
                        >
                            <Icon as={FaNetworkWired} mr={1} fontSize="xs" />
                            {t("edit_plan_in_graph")}
                        </Badge>
                    </Link>

                    <StatusBadge status={plan.status as PlanStatus} />
                    <HStack width="150px">
                        <Progress.Root
                            value={plan.progress}
                            size="sm"
                            colorScheme={getStatusColorScheme(plan.status as PlanStatus)}
                            borderRadius="full"
                        >
                            <Progress.Track>
                                <Progress.Range />
                            </Progress.Track>
                        </Progress.Root>
                        <Text fontSize="sm" fontWeight="bold" color={colors.textColor} minWidth="36px" textAlign="right">
                            {plan.progress}%
                        </Text>
                    </HStack>

                    {plan.room_id && (
                        <Badge colorScheme="purple" px={2} py={1} borderRadius="md">
                            {roomName || "Loading..."}
                        </Badge>
                    )}
                </Flex>
            </Flex>

            {/* Main content area with two columns */}
            <Flex width="100%" gap={6}>
                {/* Left column - Plan overview */}
                <Box flex="1" p={4} bg={`${colors.accentColor}05`} borderRadius="md">
                    <Text fontSize="xs" color={colors.textColorMuted} mb={1}>{t("plan_overview")}:</Text>
                    <Text fontSize="sm" color={colors.textColor}>{plan.plan_overview}</Text>
                </Box>

                {/* Right column - Time and user information */}
                <Flex direction="column" flex="1" gap={4}>
                    {/* Time information */}
                    <Flex gap={4} width="100%">
                        <Box flex="1" p={3} bg={`${colors.accentColor}10`} borderRadius="md">
                            <Text fontSize="xs" color={colors.textColorMuted}>{t("created")}:</Text>
                            <Text fontSize="md" fontWeight="bold" color={colors.textColor}>
                                {formatDate(plan.created_at)}
                            </Text>
                        </Box>

                        <Box flex="1" p={3} bg={`${colors.accentColor}10`} borderRadius="md">
                            <Text fontSize="xs" color={colors.textColorMuted}>{t("updated")}:</Text>
                            <Text fontSize="md" fontWeight="bold" color={colors.textColor}>
                                {formatDate(plan.updated_at)}
                            </Text>
                        </Box>
                    </Flex>

                    {/* User information */}
                    <Flex gap={4} width="100%">
                        <Box flex="1" p={3} borderWidth="1px" borderColor={`${colors.borderColor}`} borderRadius="md">
                            <Text fontSize="xs" color={colors.textColorMuted}>{t("assigner")}:</Text>
                            {isLoadingUsers ? (
                                <Flex align="center">
                                    <Spinner size="xs" mr={2} />
                                    <Text fontSize="sm" color={colors.textColor}>Loading...</Text>
                                </Flex>
                            ) : (
                                <Text fontSize="sm" fontWeight="medium" color={colors.textColor}>
                                    {assignerName || plan.assigner}
                                </Text>
                            )}
                        </Box>

                        <Box flex="1" p={3} borderWidth="1px" borderColor={`${colors.borderColor}`} borderRadius="md">
                            <Text fontSize="xs" color={colors.textColorMuted}>{t("assignee")}:</Text>
                            {isLoadingUsers ? (
                                <Flex align="center">
                                    <Spinner size="xs" mr={2} />
                                    <Text fontSize="sm" color={colors.textColor}>Loading...</Text>
                                </Flex>
                            ) : (
                                <Text fontSize="sm" fontWeight="medium" color={colors.textColor}>
                                    {assigneeName || plan.assignee}
                                </Text>
                            )}
                        </Box>
                    </Flex>
                </Flex>
            </Flex>
        </Flex>
    );
} 