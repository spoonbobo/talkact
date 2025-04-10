"use client"

import { useState, useEffect } from 'react';
import {
    Box,
    Flex,
    Text,
    Badge,
    HStack,
    Icon,
    IconButton,
    Circle,
    Grid,
    GridItem
} from '@chakra-ui/react';
import { FaCheck, FaEdit, FaBrain, FaMagic, FaFileAlt } from 'react-icons/fa';
import { FiRefreshCw } from 'react-icons/fi';
import { Tooltip } from "@/components/ui/tooltip";
import { useTranslations } from "next-intl";
import { ITask, IPlan } from "@/types/plan";
import StatusBadge from "@/components/ui/StatusBadge";
import TaskToolInfo from './TaskToolInfo'

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

interface TaskCardProps {
    task: ITask;
    index: number;
    currentTaskId: number | null;
    planStatus: string;
    plan: IPlan;
    colors: any;
    onEditTask: (task: ITask) => void;
    onMCPRequest: (task: ITask, plan: IPlan) => Promise<void>;
    onApproveTask: (task: ITask, plan: IPlan) => Promise<void>;
    onClick?: (task: ITask) => void;
}

export default function TaskCard({
    task,
    index,
    currentTaskId,
    planStatus,
    plan,
    colors,
    onEditTask,
    onMCPRequest,
    onApproveTask,
    onClick,
}: TaskCardProps) {
    const t = useTranslations("Plans");
    // Add loading states for the action buttons
    const [isApprovingTask, setIsApprovingTask] = useState(false);
    const [isRequestingMCP, setIsRequestingMCP] = useState(false);

    // Determine if this is the current task
    const isCurrentTask = index === currentTaskId;

    // Determine if result log should be enabled - now always true
    const isResultLogEnabled = true;

    // Highlight as current if the plan is not pending or terminated
    const shouldHighlightAsCurrent = isCurrentTask &&
        planStatus !== 'pending' &&
        planStatus !== 'terminated';

    // Add useEffect to reset loading state when task status changes
    useEffect(() => {
        // If we were approving and the task status has changed, reset the loading state
        if (isApprovingTask && task.status !== 'pending') {
            setIsApprovingTask(false);
        }
    }, [task.status, isApprovingTask]);

    return (
        <Box
            p={4}
            borderWidth="1px"
            borderRadius="md"
            borderColor={shouldHighlightAsCurrent ? colors.accentColor : colors.borderColor}
            bg={shouldHighlightAsCurrent ? `${colors.accentColor}10` : colors.planItemBg}
            position="relative"
            onClick={() => onClick && onClick(task)}
            cursor={onClick ? "pointer" : "default"}
        >
            {shouldHighlightAsCurrent && (
                <Circle
                    size="10px"
                    bg={colors.accentColor}
                    position="absolute"
                    left="-5px"
                    top="50%"
                    transform="translateY(-50%)"
                />
            )}

            <Flex justify="space-between" align="center" mb={2}>
                <Flex align="center">
                    <Badge mr={2} colorScheme="purple">Step {task.step_number}</Badge>
                    <StatusBadge status={task.status} mr={2} />
                    <Text fontWeight="bold" color={colors.textColorHeading}>{task.task_name}</Text>
                </Flex>

                {/* Task action buttons - only show for current tasks */}
                {shouldHighlightAsCurrent && (
                    <Flex>
                        <Tooltip content={t("edit_task")}>
                            <IconButton
                                aria-label="edit task"
                                size="sm"
                                colorScheme="yellow"
                                variant="ghost"
                                onClick={(e) => {
                                    e.stopPropagation(); // Stop event propagation
                                    onEditTask(task);
                                }}
                                _hover={{ bg: "yellow.50", color: colors.accentColor }}
                                mr={1}
                            >
                                <Icon as={FaEdit} color={colors.textColor} />
                            </IconButton>
                        </Tooltip>

                        {/* Show different button based on task status */}
                        {task.status === 'not_started' ? (
                            <Tooltip content={t("request_mcp") || "Request MCP"}>
                                <IconButton
                                    aria-label="request mcp"
                                    size="sm"
                                    colorScheme="blue"
                                    variant="ghost"
                                    loading={isRequestingMCP}
                                    onClick={async (e) => {
                                        e.stopPropagation(); // Stop event propagation
                                        if (onMCPRequest) {
                                            setIsRequestingMCP(true);
                                            try {
                                                await onMCPRequest(task, plan);
                                            } finally {
                                                setIsRequestingMCP(false);
                                            }
                                        } else {
                                            console.log('Request MCP for task:', task.task_id);
                                        }
                                    }}
                                    _hover={{ bg: "blue.50", color: colors.accentColor }}
                                    mr={1}
                                >
                                    <Icon as={FaMagic} color={colors.textColor} />
                                </IconButton>
                            </Tooltip>
                        ) : (
                            <Tooltip content={t("approve_task")}>
                                <IconButton
                                    aria-label="approve task"
                                    size="sm"
                                    colorScheme="green"
                                    variant="ghost"
                                    loading={isApprovingTask}
                                    onClick={async (e) => {
                                        e.stopPropagation(); // Stop event propagation
                                        if (onApproveTask) {
                                            setIsApprovingTask(true);
                                            try {
                                                await onApproveTask(task, plan);
                                            } catch (error) {
                                                // Only reset on error
                                                setIsApprovingTask(false);
                                                console.error('Error approving task:', error);
                                            }
                                        } else {
                                            console.log('Approve task:', task.task_id);
                                        }
                                    }}
                                    _hover={{ bg: "green.50", color: colors.accentColor }}
                                    mr={1}
                                >
                                    <Icon as={FaCheck} color={colors.textColor} />
                                </IconButton>
                            </Tooltip>
                        )}

                        <Tooltip content={t("refresh_task")}>
                            <IconButton
                                aria-label="refresh task"
                                size="sm"
                                colorScheme="blue"
                                variant="ghost"
                                onClick={(e) => {
                                    e.stopPropagation(); // Stop event propagation
                                    // Dummy onClick handler for task refresh
                                    console.log('Refresh task:', task.task_id);
                                }}
                                _hover={{ bg: "blue.50", color: colors.accentColor }}
                            >
                                <Icon as={FiRefreshCw} color={colors.textColor} />
                            </IconButton>
                        </Tooltip>
                    </Flex>
                )}
            </Flex>

            <Text fontSize="sm" mb={3} color={colors.textColor}>{task.task_explanation}</Text>

            {task.expected_result && (
                <Box mb={3}>
                    <Text fontSize="xs" fontWeight="bold" color={colors.textColorMuted}>
                        {t("expected_result")}:
                    </Text>
                    <Text fontSize="sm" color={colors.textColor}>{task.expected_result}</Text>
                </Box>
            )}

            {/* Tool Information */}
            <TaskToolInfo task={task} colors={colors} t={t} />

            <Grid templateColumns="repeat(3, 1fr)" gap={2} mt={3} fontSize="xs" color={colors.textColorMuted}>
                <GridItem>
                    <Text>{t("created")}: {formatDate(task.created_at)}</Text>
                </GridItem>
                {task.start_time && (
                    <GridItem>
                        <Text>{t("started")}: {formatDate(task.start_time)}</Text>
                    </GridItem>
                )}
                {task.completed_at && (
                    <GridItem>
                        <Text>{t("completed")}: {formatDate(task.completed_at)}</Text>
                    </GridItem>
                )}
            </Grid>

            {task.result && (
                <Box mt={3} p={3} bg={colors.bgSubtle} borderRadius="md">
                    <Text fontSize="xs" fontWeight="bold" color={colors.textColorMuted} mb={1}>
                        {t("result")}:
                    </Text>
                    <Text fontSize="sm" color={colors.textColor}>{task.result}</Text>
                </Box>
            )}
        </Box>
    );
} 