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
    Spinner
} from '@chakra-ui/react';
import { useTranslations } from "next-intl";
import { IPlan } from "@/types/plan";
import StatusBadge, { getStatusColorScheme } from "@/components/ui/StatusBadge";
import { useEffect, useState } from 'react';
import axios from 'axios';

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
}

export default function PlanHeader({ plan, colors }: PlanHeaderProps) {
    const t = useTranslations("Plans");
    const [roomName, setRoomName] = useState<string>("");
    const [assignerName, setAssignerName] = useState<string>("");
    const [assigneeName, setAssigneeName] = useState<string>("");
    const [isLoadingUsers, setIsLoadingUsers] = useState<boolean>(false);

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
                    console.log('Fetching assigner with ID:', plan.assigner);
                    const assignerResponse = await axios.get(`/api/user/get_user_by_id?user_id=${plan.assigner}`);
                    console.log('Assigner API response:', assignerResponse.data);
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
                    console.log('Fetching assignee with ID:', plan.assignee);
                    const assigneeResponse = await axios.get(`/api/user/get_user_by_id?user_id=${plan.assignee}`);
                    console.log('Assignee API response:', assigneeResponse.data);
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

    return (
        <Box>
            <Heading size="md" mb={2} color={colors.textColorHeading}>{plan.plan_name}</Heading>
            <Flex align="center" mb={2}>
                <StatusBadge status={plan.status} mr={3} />
                <HStack width="200px" mr={2} flex="1">
                    <Progress.Root
                        value={plan.progress}
                        size="sm"
                        colorScheme={getStatusColorScheme(plan.status)}
                        borderRadius="full"
                    >
                        <Progress.Track>
                            <Progress.Range />
                        </Progress.Track>
                    </Progress.Root>
                    <Text fontSize="sm" fontWeight="bold" color={colors.textColor}>
                        {plan.progress}%
                    </Text>
                </HStack>

                {plan.room_id && (
                    <Flex align="center">
                        <Text fontSize="xs" color={colors.textColorMuted} mr={1}>
                            {t("room")}:
                        </Text>
                        <Badge colorScheme="purple">
                            {roomName || "Loading..."}
                        </Badge>
                    </Flex>
                )}
            </Flex>

            <Box mb={3}>
                <Text fontSize="xs" color={colors.textColorMuted}>{t("plan_overview")}:</Text>
                <Text fontSize="sm" color={colors.textColor}>{plan.plan_overview}</Text>
            </Box>

            <Grid templateColumns="repeat(2, 1fr)" gap={4} mt={4}>
                <GridItem>
                    <Text fontSize="xs" color={colors.textColorMuted}>{t("assigner")}:</Text>
                    {isLoadingUsers ? (
                        <Flex align="center">
                            <Spinner size="xs" mr={2} />
                            <Text fontSize="sm" color={colors.textColor}>Loading...</Text>
                        </Flex>
                    ) : (
                        <Text fontSize="sm" color={colors.textColor}>
                            {assignerName || plan.assigner}
                        </Text>
                    )}
                </GridItem>
                <GridItem>
                    <Text fontSize="xs" color={colors.textColorMuted}>{t("assignee")}:</Text>
                    {isLoadingUsers ? (
                        <Flex align="center">
                            <Spinner size="xs" mr={2} />
                            <Text fontSize="sm" color={colors.textColor}>Loading...</Text>
                        </Flex>
                    ) : (
                        <Text fontSize="sm" color={colors.textColor}>
                            {assigneeName || plan.assignee}
                        </Text>
                    )}
                </GridItem>
                <GridItem>
                    <Text fontSize="xs" color={colors.textColorMuted}>{t("created")}:</Text>
                    <Text fontSize="sm" color={colors.textColor}>{formatDate(plan.created_at)}</Text>
                </GridItem>
                <GridItem>
                    <Text fontSize="xs" color={colors.textColorMuted}>{t("updated")}:</Text>
                    <Text fontSize="sm" color={colors.textColor}>{formatDate(plan.updated_at)}</Text>
                </GridItem>
            </Grid>
        </Box>
    );
} 