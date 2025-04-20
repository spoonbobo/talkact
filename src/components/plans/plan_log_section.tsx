import { useEffect, useState } from 'react';
import { Card, CardHeader, CardBody, Flex, Text, Stack, Box, Badge, Link, Spinner } from "@chakra-ui/react";
import NextLink from "next/link";
import { useParams } from "next/navigation";
import SkillInfo from './skill_info';
import { usePlansColors } from "@/utils/colors";
import { useColorMode } from "@/components/ui/color-mode";

interface PlanLogSectionProps {
    logs: Array<{
        id: string;
        created_at: Date | string;
        type: string;
        content: string;
        planName?: string;
        planShortId?: string;
        task_id?: string;
        plan_id?: string; // Full plan ID for navigation
        planNavId?: string;
        skills?: any[]; // Added skills field
    }>;
    colors: any;
    t: any;
    onLogClick?: (log: any) => void;
}

const getShortId = (uuid?: string) => uuid ? uuid.split('-')[0] : '';

const PlanLogSection = ({ logs, colors, t, onLogClick }: PlanLogSectionProps) => {
    const params = useParams();
    const locale = params.locale as string || 'en';
    const plansColors = usePlansColors();
    const { colorMode } = useColorMode();
    const isDarkMode = colorMode === "dark";
    const [tasksByLogId, setTasksByLogId] = useState<Record<string, any[]>>({});
    const [loadingTasks, setLoadingTasks] = useState<Record<string, boolean>>({});

    // Function to get formatted content for approval logs
    const getFormattedContent = (log: any) => {
        if (log.type === "ask_for_plan_approval") {
            try {
                // Replace single quotes with double quotes to make it valid JSON
                const jsonString = log.content.replace(/'/g, '"');
                const contentData = JSON.parse(jsonString);
                if (Array.isArray(contentData) && contentData.length > 0) {
                    const toolData = contentData[0];
                    if (toolData.tool_name === 'approve_plan') {
                        return t("plan_approval_request_message", {
                            planId: toolData.args?.plan_id?.value || "Unknown"
                        });
                    }
                    // Fallback to description if available
                    if (toolData.description) {
                        return toolData.description.trim();
                    }
                }
            } catch (error) {
                // If parsing fails, return the original content
                console.error("Error parsing content:", error);
            }
        }
        return log.content;
    };

    // Group logs by plan ID to reduce repetition
    const groupLogsByPlan = () => {
        const groupedLogs: Record<string, any[]> = {};

        logs.forEach(log => {
            const planId = log.planShortId || 'unknown';
            if (!groupedLogs[planId]) {
                groupedLogs[planId] = [];
            }
            groupedLogs[planId].push(log);
        });

        return groupedLogs;
    };

    // Fetch tasks for logs with task_ids
    useEffect(() => {
        const fetchTasks = async () => {
            // Add debugging to see what logs have task_ids
            console.log("All logs:", logs.map(log => ({
                id: log.id,
                task_id: log.task_id,
                plan_id: log.plan_id,
                type: log.type
            })));

            const logsWithTaskIds = logs.filter(log => log.task_id && !tasksByLogId[log.id]);
            console.log("Logs with task_ids:", logsWithTaskIds.length, logsWithTaskIds);

            for (const log of logsWithTaskIds) {
                if (log.task_id) {
                    setLoadingTasks(prev => ({ ...prev, [log.id]: true }));
                    try {
                        console.log(`Fetching task for log ${log.id} with task_id ${log.task_id}`);
                        const response = await fetch(`/api/plan/get_task?taskId=${log.task_id}`);
                        if (response.ok) {
                            const data = await response.json();
                            console.log(`Task data for log ${log.id}:`, data);
                            setTasksByLogId(prev => ({
                                ...prev,
                                [log.id]: Array.isArray(data) ? data : [data]
                            }));
                        } else {
                            console.error(`Failed to fetch task for log ${log.id}:`, response.status, response.statusText);
                        }
                    } catch (error) {
                        console.error(`Error fetching task for log ${log.id}:`, error);
                    } finally {
                        setLoadingTasks(prev => ({ ...prev, [log.id]: false }));
                    }
                }
            }

            // Also fetch tasks for logs with plan_ids but no task_ids
            const logsWithPlanIds = logs.filter(log =>
                log.plan_id &&
                !log.task_id &&
                !tasksByLogId[log.id] &&
                log.type === "ask_for_plan_approval"
            );

            for (const log of logsWithPlanIds) {
                if (log.plan_id) {
                    setLoadingTasks(prev => ({ ...prev, [log.id]: true }));
                    try {
                        const response = await fetch(`/api/plan/get_tasks?planId=${log.plan_id}`);
                        if (response.ok) {
                            const data = await response.json();
                            if (data && data.length > 0) {
                                setTasksByLogId(prev => ({
                                    ...prev,
                                    [log.id]: data
                                }));
                            }
                        }
                    } catch (error) {
                        console.error(`Error fetching tasks for log ${log.id}:`, error);
                    } finally {
                        setLoadingTasks(prev => ({ ...prev, [log.id]: false }));
                    }
                }
            }
        };

        fetchTasks();
    }, [logs]);

    // If logs array is empty, show a message
    if (!logs || logs.length === 0) {
        return (
            <div>
                <Text fontSize="sm" fontWeight="bold" color={plansColors.textColorHeading} mb={2}>
                    {t("plan_logs")}
                </Text>
                <Box
                    p={3}
                    borderRadius="md"
                    bg={isDarkMode ? "rgba(45, 55, 72, 0.3)" : "rgba(247, 250, 252, 0.8)"}
                    border="1px solid"
                    borderColor={isDarkMode ? "gray.700" : "gray.200"}
                >
                    <Text fontSize="xs" color={plansColors.textColorMuted} textAlign="center">
                        {t("no_logs_found")}
                    </Text>
                </Box>
            </div>
        );
    }

    // Function to handle log click
    const handleLogClick = (log: any) => {
        if (onLogClick) {
            // Enhance log with tasks if available
            const enhancedLog = {
                ...log,
                fetchedTasks: tasksByLogId[log.id] || []
            };
            onLogClick(enhancedLog);
        }
    };

    // Get unique plan IDs to show a more condensed view
    const groupedLogs = groupLogsByPlan();

    // Define more user-friendly colors with improved visual hierarchy
    const getCardColors = (isConfirmation: boolean, isLatest: boolean = false) => {
        if (isDarkMode) {
            return {
                bg: isConfirmation
                    ? "rgba(44, 82, 130, 0.3)"
                    : isLatest
                        ? "rgba(45, 55, 72, 0.8)"
                        : "rgba(45, 55, 72, 0.6)",
                border: isConfirmation
                    ? "blue.600"
                    : isLatest
                        ? "blue.700"
                        : "gray.600",
                hoverBg: isConfirmation
                    ? "rgba(44, 82, 130, 0.5)"
                    : "rgba(45, 55, 72, 0.9)",
                hoverBorder: isConfirmation
                    ? "blue.500"
                    : "blue.600",
                shadow: isConfirmation
                    ? "0 4px 12px rgba(66, 153, 225, 0.3)"
                    : "0 4px 6px rgba(0, 0, 0, 0.2)"
            };
        } else {
            return {
                bg: isConfirmation
                    ? "rgba(235, 248, 255, 0.8)"
                    : isLatest
                        ? "white"
                        : "rgba(250, 250, 250, 0.8)",
                border: isConfirmation
                    ? "blue.300"
                    : isLatest
                        ? "blue.200"
                        : plansColors.borderColor,
                hoverBg: isConfirmation
                    ? "rgba(226, 246, 254, 0.95)"
                    : "rgba(240, 247, 255, 0.8)",
                hoverBorder: isConfirmation
                    ? "blue.300"
                    : "blue.200",
                shadow: isConfirmation
                    ? "0 4px 12px rgba(66, 153, 225, 0.15)"
                    : "0 4px 6px rgba(0, 0, 0, 0.05)"
            };
        }
    };

    // Badge colors for different elements
    const planIdBadgeColors = isDarkMode
        ? { bg: "gray.800", color: "blue.200", borderColor: "gray.700" }
        : { bg: "blue.50", color: "blue.700", borderColor: "blue.100" };

    const skillBadgeColors = isDarkMode
        ? {
            bg: "gray.800",
            color: "green.200",
            borderColor: "gray.700",
            hoverBg: "gray.700"
        }
        : {
            bg: "green.50",
            color: "green.700",
            borderColor: "green.100",
            hoverBg: "green.100"
        };

    // Function to get badge colors for log types
    const getLogTypeBadgeColors = (type: string) => {
        if (type === "ask_for_plan_approval") {
            return isDarkMode
                ? { bg: "blue.900", color: "blue.200", borderColor: "blue.800" }
                : { bg: "blue.50", color: "blue.700", borderColor: "blue.100" };
        } else if (type === "plan_created") {
            return isDarkMode
                ? { bg: "green.900", color: "green.200", borderColor: "green.800" }
                : { bg: "green.50", color: "green.700", borderColor: "green.100" };
        } else if (type === "task_completed") {
            return isDarkMode
                ? { bg: "purple.900", color: "purple.200", borderColor: "purple.800" }
                : { bg: "purple.50", color: "purple.700", borderColor: "purple.100" };
        } else if (type === "plan_completed") {
            return isDarkMode
                ? { bg: "teal.900", color: "teal.200", borderColor: "teal.800" }
                : { bg: "teal.50", color: "teal.700", borderColor: "teal.100" };
        } else {
            return isDarkMode
                ? { bg: "gray.800", color: "gray.200", borderColor: "gray.700" }
                : { bg: "gray.100", color: "gray.700", borderColor: "gray.200" };
        }
    };

    return (
        <div>
            <Text fontSize="sm" fontWeight="bold" color={plansColors.textColorHeading} mb={2}>
                {t("plan_logs")}
            </Text>

            <Stack gap={3}>
                {Object.entries(groupedLogs).map(([planId, planLogs]) => {
                    // Sort logs by creation date
                    const sortedLogs = [...planLogs].sort((a, b) =>
                        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
                    );

                    // Get the most recent log for this plan
                    const latestLog = sortedLogs[0];
                    const isConfirmation = latestLog.type === "ask_for_plan_approval";
                    const pendingApprovals = sortedLogs.filter(log => log.type === "ask_for_plan_approval").length;

                    // Get colors for this card
                    const cardColors = getCardColors(isConfirmation, true);
                    const logTypeColors = getLogTypeBadgeColors(latestLog.type);

                    // Get tasks for this log if available
                    const logTasks = tasksByLogId[latestLog.id] || [];
                    const isLoadingLogTasks = loadingTasks[latestLog.id] || false;

                    return (
                        <Box
                            key={planId}
                            onClick={() => handleLogClick(latestLog)}
                            cursor="pointer"
                            borderRadius="md"
                            border="1px solid"
                            borderColor={cardColors.border}
                            bg={cardColors.bg}
                            _hover={{
                                boxShadow: cardColors.shadow,
                                borderColor: cardColors.hoverBorder,
                                bg: cardColors.hoverBg,
                                transform: "translateY(-1px)"
                            }}
                            transition="all 0.2s ease"
                            p={3}
                        >
                            <Flex align="center" justify="space-between" mb={2}>
                                <Flex align="center" gap={2}>
                                    <Badge
                                        bg={planIdBadgeColors.bg}
                                        color={planIdBadgeColors.color}
                                        fontSize="xs"
                                        px={1.5}
                                        py={0.5}
                                        borderRadius="md"
                                        fontFamily="monospace"
                                        fontWeight="bold"
                                        border="1px solid"
                                        borderColor={planIdBadgeColors.borderColor}
                                    >
                                        {planId}
                                    </Badge>

                                    {pendingApprovals > 0 && (
                                        <Badge
                                            bg={isDarkMode ? "blue.800" : "blue.50"}
                                            color={isDarkMode ? "blue.200" : "blue.600"}
                                            fontSize="xs"
                                            px={1.5}
                                            py={0.5}
                                            borderRadius="full"
                                            border="1px solid"
                                            borderColor={isDarkMode ? "blue.700" : "blue.200"}
                                        >
                                            {pendingApprovals} {t("pending")}
                                        </Badge>
                                    )}
                                </Flex>
                                <Badge
                                    bg={logTypeColors.bg}
                                    color={logTypeColors.color}
                                    fontSize="xs"
                                    px={2}
                                    py={0.5}
                                    borderRadius="md"
                                    textTransform="uppercase"
                                    fontWeight="bold"
                                    border="1px solid"
                                    borderColor={logTypeColors.borderColor}
                                >
                                    {isConfirmation ? t("needs_confirmation") : t(latestLog.type)}
                                </Badge>
                            </Flex>

                            {/* Show a summary of the plan's activity */}
                            <Text
                                fontSize="xs"
                                color={plansColors.textColor}
                                mb={2}
                                fontWeight="medium"
                            >
                                {t("total_logs")}: {planLogs.length}
                            </Text>

                            {/* Show tasks if available */}
                            {isLoadingLogTasks ? (
                                <Flex align="center" gap={2} mt={2} mb={1}>
                                    <Spinner size="xs" color={plansColors.accentColor} />
                                    <Text fontSize="xs" color={plansColors.textColorMuted}>
                                        {t("loading_tasks")}
                                    </Text>
                                </Flex>
                            ) : logTasks.length > 0 ? (
                                <Box mt={2}>
                                    <Text
                                        fontSize="xs"
                                        color={plansColors.textColorMuted}
                                        mb={1.5}
                                        fontWeight="medium"
                                    >
                                        {t("tasks")}:
                                    </Text>
                                    <Flex gap={1.5} flexWrap="wrap">
                                        {logTasks.map((task: any, index: number) => (
                                            <Badge
                                                key={index}
                                                bg={skillBadgeColors.bg}
                                                color={skillBadgeColors.color}
                                                fontSize="xs"
                                                px={1.5}
                                                py={0.5}
                                                borderRadius="md"
                                                border="1px solid"
                                                borderColor={skillBadgeColors.borderColor}
                                                _hover={{
                                                    bg: skillBadgeColors.hoverBg
                                                }}
                                            >
                                                {task.task_name || t("unnamed_task")}
                                            </Badge>
                                        ))}
                                    </Flex>
                                </Box>
                            ) : null}

                            <Flex justify="flex-end" mt={2}>
                                <Text
                                    fontSize="xs"
                                    color={plansColors.textColorMuted}
                                >
                                    {new Date(latestLog.created_at).toLocaleString()}
                                </Text>
                            </Flex>
                        </Box>
                    );
                })}
            </Stack>
        </div>
    );
};

export default PlanLogSection;
