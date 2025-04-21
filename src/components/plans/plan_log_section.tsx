import { useEffect, useState } from 'react';
import { Card, CardHeader, CardBody, Flex, Text, Stack, Box, Badge, Link, Spinner } from "@chakra-ui/react";
import NextLink from "next/link";
import { useParams } from "next/navigation";
import SkillInfo from './skill_info';
import { usePlansColors } from "@/utils/colors";
import { useColorMode } from "@/components/ui/color-mode";

interface PlanLogSectionProps {
    planId?: string; // Add planId prop to fetch logs for a specific plan
    logs?: Array<any>; // Use any type to handle unusual log structure
    colors: any;
    t: any;
    onLogClick?: (log: any) => void;
    groupByPlan?: boolean; // New prop to control grouping behavior
    getFormattedContent?: (log: any) => string; // Add this prop
}

// Safely get a short ID from a UUID
const getShortId = (uuid?: string) => {
    if (!uuid) return 'unknown';
    try {
        return uuid.split('-')[0] || 'unknown';
    } catch (e) {
        console.error("Error getting short ID:", e, uuid);
        return 'unknown';
    }
};

// Helper function to normalize log data
const normalizeLogData = (log: any) => {
    // If log is null or undefined, return a placeholder
    if (!log) {
        return {
            id: 'unknown',
            created_at: new Date(),
            type: 'unknown',
            content: 'Unknown content',
            planName: 'Unknown plan',
            planShortId: '',
            plan_id: '',
            planNavId: '',
            tasks: []
        };
    }

    // Check if log is already a proper object with an id field
    if (typeof log === 'object' && log !== null && log.id) {
        // Make sure planName, planShortId, and planNavId are set
        return {
            ...log,
            planName: log.planName || 'Unknown plan',
            planShortId: log.planShortId || (log.plan_id ? getShortId(log.plan_id) : ''),
            planNavId: log.planNavId || log.plan_id || '',
            tasks: log.tasks || []
        };
    }

    // Check if log is an array-like object with numeric indices (UUID characters)
    if (typeof log === 'object' && log !== null) {
        // If it has planNavId or planName, it's likely our unusual format
        if (log.planNavId || log.planName) {
            // Try to extract the actual log ID if it's spread across numeric indices
            let logId = '';
            for (let i = 0; i < 36; i++) {
                if (log[i] !== undefined) {
                    logId += log[i];
                }
            }

            return {
                id: logId || log.id || 'unknown',
                created_at: log.created_at || new Date(),
                type: log.type || 'unknown',
                content: log.content || log.planName || 'Unknown content',
                planName: log.planName || 'Unknown plan',
                planShortId: log.planShortId || '',
                plan_id: log.plan_id || log.planNavId || '',
                planNavId: log.planNavId || log.plan_id || '',
                tasks: log.tasks || log.fetchedTasks || []
            };
        }
    }

    // If it's some other format, try to make a reasonable log object
    return {
        id: log.id || 'unknown',
        created_at: log.created_at || new Date(),
        type: log.type || 'unknown',
        content: log.content || 'Unknown content',
        planName: log.planName || 'Unknown plan',
        planShortId: log.planShortId || '',
        plan_id: log.plan_id || '',
        planNavId: log.planNavId || '',
        tasks: log.tasks || []
    };
};

const PlanLogSection = ({
    planId,
    logs: initialLogs,
    colors,
    t,
    onLogClick,
    groupByPlan = true, // Default to grouped view
    getFormattedContent: customGetFormattedContent // Add this parameter
}: PlanLogSectionProps) => {
    const params = useParams();
    const locale = params.locale as string || 'en';
    const plansColors = usePlansColors();
    const { colorMode } = useColorMode();
    const isDarkMode = colorMode === "dark";
    const [logs, setLogs] = useState(initialLogs?.map(normalizeLogData) || []);
    const [isLoadingLogs, setIsLoadingLogs] = useState(false);
    const [tasksByLogId, setTasksByLogId] = useState<Record<string, any[]>>({});
    const [loadingTasks, setLoadingTasks] = useState<Record<string, boolean>>({});

    // Update logs when initialLogs changes
    useEffect(() => {
        if (initialLogs && initialLogs.length > 0) {
            // console.log("Initial logs provided:", initialLogs);
            try {
                const normalized = initialLogs.map(normalizeLogData);
                // console.log("Normalized logs:", normalized);
                setLogs(normalized);
            } catch (error) {
                console.error("Error normalizing logs:", error, initialLogs);
                setLogs([]);
            }
        } else {
            console.log("No initial logs provided or empty array");
            setLogs([]);
        }
    }, [initialLogs]);

    // Fetch logs when planId changes
    useEffect(() => {
        if (planId) {
            console.log("Fetching logs for planId:", planId);
            fetchPlanLogs(planId);
        } else {
            console.log("No planId provided, using initialLogs");
        }
    }, [planId]);

    // Function to fetch logs for a plan
    const fetchPlanLogs = async (planId: string) => {
        setIsLoadingLogs(true);
        try {
            console.log(`Fetching logs for plan ${planId}`);
            const response = await fetch(`/api/plan/get_plan_log?planId=${planId}`);
            if (response.ok) {
                const data = await response.json();
                console.log(`Logs data for plan ${planId}:`, data);
                const normalizedLogs = Array.isArray(data)
                    ? data.map(normalizeLogData)
                    : [normalizeLogData(data)];
                setLogs(normalizedLogs);
            } else {
                console.error(`Failed to fetch logs for plan ${planId}:`, response.status, response.statusText);
                setLogs([]);
            }
        } catch (error) {
            console.error(`Error fetching logs for plan ${planId}:`, error);
            setLogs([]);
        } finally {
            setIsLoadingLogs(false);
        }
    };

    // Function to get formatted content for approval logs
    const getFormattedContent = (log: any) => {
        // Use custom formatter if provided
        if (customGetFormattedContent) {
            return customGetFormattedContent(log);
        }

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
        return log.content || 'No content';
    };

    // Group logs by plan
    const groupLogsByPlan = () => {
        const groupedLogs: Record<string, any[]> = {};

        logs.forEach(log => {
            if (!log) return; // Skip null or undefined logs

            // Safely determine the plan ID to use as a key
            let planId = 'unknown';

            if (log.planShortId && typeof log.planShortId === 'string' && log.planShortId.length > 0) {
                planId = log.planShortId;
            } else if (log.plan_id && typeof log.plan_id === 'string') {
                planId = getShortId(log.plan_id);
            } else if (log.planNavId && typeof log.planNavId === 'string') {
                planId = getShortId(log.planNavId);
            }

            if (!groupedLogs[planId]) {
                groupedLogs[planId] = [];
            }
            groupedLogs[planId].push(log);
        });

        return groupedLogs;
    };

    // Handle log click
    const handleLogClick = (log: any) => {
        console.log("Log clicked:", log);
        if (onLogClick) {
            onLogClick(log);
        }
    };

    // Get card colors based on log type
    const getCardColors = (isConfirmation: boolean, isActive: boolean, logType?: string) => {
        if (logType === 'plan_terminated') {
            return {
                bg: isDarkMode ? 'orange.900' : 'rgba(255, 237, 213, 0.5)',
                border: isDarkMode ? 'orange.700' : 'rgba(237, 137, 54, 0.2)',
                hoverBg: isDarkMode ? 'orange.800' : 'rgba(255, 237, 213, 0.8)',
                hoverBorder: isDarkMode ? 'orange.600' : 'rgba(237, 137, 54, 0.3)',
                shadow: isDarkMode ? '0 2px 8px rgba(237, 137, 54, 0.2)' : '0 2px 8px rgba(237, 137, 54, 0.05)'
            };
        }

        if (isConfirmation) {
            return {
                bg: isDarkMode ? 'yellow.900' : 'rgba(255, 249, 219, 0.5)',
                border: isDarkMode ? 'yellow.700' : 'rgba(237, 212, 0, 0.2)',
                hoverBg: isDarkMode ? 'yellow.800' : 'rgba(255, 249, 219, 0.8)',
                hoverBorder: isDarkMode ? 'yellow.600' : 'rgba(237, 212, 0, 0.3)',
                shadow: isDarkMode ? '0 2px 8px rgba(255, 204, 0, 0.2)' : '0 2px 8px rgba(255, 204, 0, 0.05)'
            };
        }

        if (isActive) {
            return {
                bg: isDarkMode ? 'blue.900' : 'rgba(240, 245, 255, 0.5)',
                border: isDarkMode ? 'blue.700' : 'rgba(66, 153, 225, 0.15)',
                hoverBg: isDarkMode ? 'blue.800' : 'rgba(240, 245, 255, 0.8)',
                hoverBorder: isDarkMode ? 'blue.600' : 'rgba(66, 153, 225, 0.25)',
                shadow: isDarkMode ? '0 2px 8px rgba(66, 153, 225, 0.2)' : '0 2px 8px rgba(66, 153, 225, 0.05)'
            };
        }

        return {
            bg: isDarkMode ? 'gray.800' : 'white',
            border: isDarkMode ? 'gray.700' : 'rgba(0, 0, 0, 0.1)',
            hoverBg: isDarkMode ? 'gray.750' : 'rgba(249, 250, 251, 0.8)',
            hoverBorder: isDarkMode ? 'gray.600' : 'rgba(0, 0, 0, 0.15)',
            shadow: isDarkMode ? '0 2px 8px rgba(0, 0, 0, 0.2)' : '0 2px 8px rgba(0, 0, 0, 0.03)'
        };
    };

    // Get badge colors for log type
    const getLogTypeBadgeColors = (type: string) => {
        switch (type) {
            case 'approval_requested':
            case 'ask_for_plan_approval':
                return {
                    bg: isDarkMode ? 'yellow.900' : 'rgba(255, 249, 219, 0.7)',
                    color: isDarkMode ? 'yellow.200' : 'rgba(180, 142, 0, 0.9)',
                    borderColor: isDarkMode ? 'yellow.700' : 'rgba(237, 212, 0, 0.2)'
                };
            case 'plan_created':
                return {
                    bg: isDarkMode ? 'green.900' : 'rgba(235, 251, 238, 0.7)',
                    color: isDarkMode ? 'green.200' : 'rgba(39, 134, 39, 0.9)',
                    borderColor: isDarkMode ? 'green.700' : 'rgba(72, 187, 120, 0.2)'
                };
            case 'plan_terminated':
                return {
                    bg: isDarkMode ? 'orange.900' : 'rgba(255, 237, 213, 0.7)',
                    color: isDarkMode ? 'orange.200' : 'rgba(221, 107, 32, 0.9)',
                    borderColor: isDarkMode ? 'orange.700' : 'rgba(237, 137, 54, 0.2)'
                };
            case 'performing_skill':
                return {
                    bg: isDarkMode ? 'purple.900' : 'rgba(245, 240, 255, 0.7)',
                    color: isDarkMode ? 'purple.200' : 'rgba(128, 90, 213, 0.9)',
                    borderColor: isDarkMode ? 'purple.700' : 'rgba(159, 122, 234, 0.2)'
                };
            case 'skill_executed':
                return {
                    bg: isDarkMode ? 'blue.900' : 'rgba(235, 248, 255, 0.7)',
                    color: isDarkMode ? 'blue.200' : 'rgba(49, 130, 206, 0.9)',
                    borderColor: isDarkMode ? 'blue.700' : 'rgba(66, 153, 225, 0.2)'
                };
            case 'plan_completed':
                return {
                    bg: isDarkMode ? 'green.900' : 'rgba(235, 251, 238, 0.7)',
                    color: isDarkMode ? 'green.200' : 'rgba(39, 134, 39, 0.9)',
                    borderColor: isDarkMode ? 'green.700' : 'rgba(72, 187, 120, 0.2)'
                };
            default:
                return {
                    bg: isDarkMode ? 'gray.800' : 'rgba(245, 245, 245, 0.7)',
                    color: isDarkMode ? 'gray.300' : 'rgba(74, 85, 104, 0.9)',
                    borderColor: isDarkMode ? 'gray.700' : 'rgba(160, 174, 192, 0.2)'
                };
        }
    };

    // Get badge colors for plan ID
    const planIdBadgeColors = {
        bg: isDarkMode ? 'gray.800' : 'rgba(245, 245, 245, 0.7)',
        color: isDarkMode ? 'gray.300' : 'rgba(74, 85, 104, 0.9)',
        borderColor: isDarkMode ? 'gray.700' : 'rgba(160, 174, 192, 0.2)'
    };

    // Get badge colors for skills
    const skillBadgeColors = {
        bg: isDarkMode ? 'purple.900' : 'rgba(245, 240, 255, 0.7)',
        color: isDarkMode ? 'purple.200' : 'rgba(128, 90, 213, 0.9)',
        borderColor: isDarkMode ? 'purple.700' : 'rgba(159, 122, 234, 0.2)',
        hoverBg: isDarkMode ? 'purple.800' : 'rgba(245, 240, 255, 0.9)'
    };

    // Get display text for log type
    const getLogTypeDisplay = (type: string) => {
        if (!type) return 'Unknown';

        try {
            // Try to use translation if available
            if (t) {
                return t(`log_type_${type}`, { defaultValue: type });
            }
            return type;
        } catch (error) {
            console.error("Error getting log type display:", error);
            return type;
        }
    };

    // Get short ID for task
    const getTaskShortId = (taskId?: string) => {
        if (!taskId) return '';
        try {
            return taskId.split('-')[0] || '';
        } catch (e) {
            console.error("Error getting task short ID:", e, taskId);
            return '';
        }
    };

    // Group logs by plan
    const groupedLogs = groupLogsByPlan();

    // Sort logs by creation date for ungrouped view, prioritizing approval requests
    const sortedLogs = [...logs].sort((a, b) => {
        // Prioritize approval requests
        if (a.type === "approval_requested" || a.type === "ask_for_plan_approval") {
            if (b.type === "approval_requested" || b.type === "ask_for_plan_approval") {
                // If both are approval requests, sort by date
                const dateA = a.created_at ? new Date(a.created_at).getTime() : 0;
                const dateB = b.created_at ? new Date(b.created_at).getTime() : 0;
                return dateB - dateA;
            }
            return -1; // a is approval request, b is not, so a comes first
        }
        if (b.type === "approval_requested" || b.type === "ask_for_plan_approval") {
            return 1; // b is approval request, a is not, so b comes first
        }

        // Otherwise sort by date
        const dateA = a.created_at ? new Date(a.created_at).getTime() : 0;
        const dateB = b.created_at ? new Date(b.created_at).getTime() : 0;
        return dateB - dateA;
    });

    return (
        <div>
            {isLoadingLogs ? (
                <Flex justify="center" align="center" py={4}>
                    <Spinner size="md" color={plansColors.accentColor} mr={2} />
                    <Text color={plansColors.textColor}>
                        {t ? t("loading_logs") : "Loading logs..."}
                    </Text>
                </Flex>
            ) : logs.length === 0 ? (
                <Text fontSize="sm" color={plansColors.textColorMuted} textAlign="center" py={4}>
                    {t ? t("no_logs_found") : "No logs found"}
                </Text>
            ) : (
                <>
                    <Text fontSize="sm" fontWeight="bold" color={plansColors.textColorHeading} mb={2}>
                        {t ? t("plan_logs") : "Plan Logs"}
                    </Text>

                    <Stack gap={3}>
                        {groupByPlan ? (
                            // Grouped view - group logs by plan
                            Object.entries(groupedLogs).map(([planId, planLogs]) => {
                                // Sort logs by type (prioritizing approval requests) and then by creation date
                                const sortedPlanLogs = [...planLogs].sort((a, b) => {
                                    // Prioritize approval requests
                                    if (a.type === "approval_requested" || a.type === "ask_for_plan_approval") {
                                        if (b.type === "approval_requested" || b.type === "ask_for_plan_approval") {
                                            // If both are approval requests, sort by date
                                            const dateA = a.created_at ? new Date(a.created_at).getTime() : 0;
                                            const dateB = b.created_at ? new Date(b.created_at).getTime() : 0;
                                            return dateB - dateA;
                                        }
                                        return -1; // a is approval request, b is not, so a comes first
                                    }
                                    if (b.type === "approval_requested" || b.type === "ask_for_plan_approval") {
                                        return 1; // b is approval request, a is not, so b comes first
                                    }

                                    // Otherwise sort by date
                                    const dateA = a.created_at ? new Date(a.created_at).getTime() : 0;
                                    const dateB = b.created_at ? new Date(b.created_at).getTime() : 0;
                                    return dateB - dateA;
                                });

                                // Get the most recent log for this plan (which might be an approval request due to sorting)
                                const latestLog = sortedPlanLogs[0];
                                const isConfirmation = latestLog.type === "ask_for_plan_approval" || latestLog.type === "approval_requested";
                                const pendingApprovals = sortedPlanLogs.filter(log =>
                                    log.type === "ask_for_plan_approval" || log.type === "approval_requested"
                                ).length;

                                // Get colors for this card
                                const cardColors = getCardColors(isConfirmation, true, latestLog.type);
                                const logTypeColors = getLogTypeBadgeColors(latestLog.type || "unknown");

                                // Get tasks for this log if available
                                const logTasks = latestLog.tasks || tasksByLogId[latestLog.id] || [];
                                const isLoadingLogTasks = loadingTasks[latestLog.id] || false;

                                return (
                                    <Box
                                        key={planId}
                                        onClick={() => handleLogClick(latestLog)}
                                        cursor="pointer"
                                        borderRadius="md"
                                        border="1px solid"
                                        borderColor={cardColors.border}
                                        bg={isDarkMode ? 'gray.850' : 'rgba(252, 252, 252, 0.8)'}
                                        _hover={{
                                            boxShadow: cardColors.shadow,
                                            borderColor: cardColors.hoverBorder,
                                            bg: cardColors.hoverBg,
                                            transform: "translateY(-1px)"
                                        }}
                                        transition="all 0.2s ease"
                                        p={2}
                                    >
                                        <Flex align="center" justify="space-between" mb={1.5}>
                                            <Flex align="center" gap={2}>
                                                <Text
                                                    fontSize="xs"
                                                    fontFamily="monospace"
                                                    fontWeight="bold"
                                                    color={planIdBadgeColors.color}
                                                    textTransform="uppercase"
                                                >
                                                    {planId}
                                                </Text>

                                                {pendingApprovals > 0 && (
                                                    <Badge
                                                        bg={isDarkMode ? "blue.800" : "rgba(235, 248, 255, 0.7)"}
                                                        color={isDarkMode ? "blue.200" : "rgba(49, 130, 206, 0.9)"}
                                                        fontSize="xs"
                                                        px={1.5}
                                                        py={0.5}
                                                        borderRadius="full"
                                                        border="1px solid"
                                                        borderColor={isDarkMode ? "blue.700" : "rgba(66, 153, 225, 0.2)"}
                                                    >
                                                        {pendingApprovals} {t ? t("pending") : "pending"}
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
                                                {getLogTypeDisplay(latestLog.type || "unknown")}
                                            </Badge>
                                        </Flex>

                                        {/* Show plan name if available */}
                                        {latestLog.planName && (
                                            <Text
                                                fontSize="sm"
                                                fontWeight="medium"
                                                color={plansColors.textColor}
                                                mb={1.5}
                                            >
                                                {latestLog.planName}
                                            </Text>
                                        )}

                                        {/* Show a summary of the plan's activity */}
                                        <Text
                                            fontSize="xs"
                                            color={plansColors.textColor}
                                            mb={1.5}
                                            fontWeight="medium"
                                        >
                                            {t ? t("total_logs") : "Total logs"}: {planLogs.length}
                                        </Text>

                                        {/* Show tasks if available */}
                                        {isLoadingLogTasks ? (
                                            <Flex align="center" gap={2} mt={1.5} mb={1}>
                                                <Spinner size="xs" color={plansColors.accentColor} />
                                                <Text fontSize="xs" color={plansColors.textColorMuted}>
                                                    {t ? t("loading_tasks") : "Loading tasks..."}
                                                </Text>
                                            </Flex>
                                        ) : logTasks.length > 0 ? (
                                            <Box mt={1.5}>
                                                <Text
                                                    fontSize="xs"
                                                    color={plansColors.textColorMuted}
                                                    mb={1}
                                                    fontWeight="medium"
                                                >
                                                    {t ? t("tasks") : "Tasks"}:
                                                </Text>
                                                <Flex gap={1.5} flexWrap="wrap">
                                                    {logTasks.map((task: any, index: number) => {
                                                        const taskShortId = getTaskShortId(task.id);
                                                        return (
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
                                                                {task.task_name || (t ? t("unnamed_task") : "Unnamed task")}
                                                                {taskShortId && (
                                                                    <Text as="span" ml={1} fontFamily="monospace" textTransform="uppercase">
                                                                        ({taskShortId})
                                                                    </Text>
                                                                )}
                                                            </Badge>
                                                        );
                                                    })}
                                                </Flex>
                                            </Box>
                                        ) : null}

                                        <Flex justify="flex-end" mt={1.5}>
                                            <Text
                                                fontSize="xs"
                                                color={plansColors.textColorMuted}
                                            >
                                                {latestLog.created_at ? new Date(latestLog.created_at).toLocaleString() : "Unknown date"}
                                            </Text>
                                        </Flex>
                                    </Box>
                                );
                            })
                        ) : (
                            // Ungrouped view - show individual logs
                            sortedLogs.map((log) => {
                                const isConfirmation = log.type === "ask_for_plan_approval";
                                const cardColors = getCardColors(isConfirmation, false, log.type);
                                const logTypeColors = getLogTypeBadgeColors(log.type || "unknown");
                                const logTasks = log.tasks || tasksByLogId[log.id] || [];
                                const isLoadingLogTasks = loadingTasks[log.id] || false;
                                const planId = log.planShortId || getShortId(log.plan_id || log.planNavId);

                                return (
                                    <Box
                                        key={log.id}
                                        onClick={() => handleLogClick(log)}
                                        cursor="pointer"
                                        borderRadius="md"
                                        border="1px solid"
                                        borderColor={cardColors.border}
                                        bg={isDarkMode ? 'gray.850' : 'rgba(252, 252, 252, 0.8)'}
                                        _hover={{
                                            boxShadow: cardColors.shadow,
                                            borderColor: cardColors.hoverBorder,
                                            bg: cardColors.hoverBg,
                                            transform: "translateY(-1px)"
                                        }}
                                        transition="all 0.2s ease"
                                        p={2}
                                    >
                                        <Flex align="center" justify="space-between" mb={1.5}>
                                            <Flex align="center" gap={2}>
                                                <Text
                                                    fontSize="xs"
                                                    fontFamily="monospace"
                                                    fontWeight="bold"
                                                    color={planIdBadgeColors.color}
                                                    textTransform="uppercase"
                                                >
                                                    {planId}
                                                </Text>
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
                                                {getLogTypeDisplay(log.type || "unknown")}
                                            </Badge>
                                        </Flex>

                                        {/* Show plan name if available */}
                                        {log.planName && (
                                            <Text
                                                fontSize="sm"
                                                fontWeight="medium"
                                                color={plansColors.textColor}
                                                mb={1.5}
                                            >
                                                {log.planName}
                                            </Text>
                                        )}

                                        {/* Show log content */}
                                        <Text
                                            fontSize="xs"
                                            color={plansColors.textColor}
                                            mb={1.5}
                                            lineHeight="1.4"
                                        >
                                            {getFormattedContent(log)}
                                        </Text>

                                        {/* Show tasks if available */}
                                        {isLoadingLogTasks ? (
                                            <Flex align="center" gap={2} mt={1.5} mb={1}>
                                                <Spinner size="xs" color={plansColors.accentColor} />
                                                <Text fontSize="xs" color={plansColors.textColorMuted}>
                                                    {t ? t("loading_tasks") : "Loading tasks..."}
                                                </Text>
                                            </Flex>
                                        ) : logTasks.length > 0 ? (
                                            <Box mt={1.5}>
                                                <Text
                                                    fontSize="xs"
                                                    color={plansColors.textColorMuted}
                                                    mb={1}
                                                    fontWeight="medium"
                                                >
                                                    {t ? t("tasks") : "Tasks"}:
                                                </Text>
                                                <Flex gap={1.5} flexWrap="wrap">
                                                    {logTasks.map((task: any, index: number) => {
                                                        const taskShortId = getTaskShortId(task.id);
                                                        return (
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
                                                                {task.task_name || (t ? t("unnamed_task") : "Unnamed task")}
                                                                {taskShortId && (
                                                                    <Text as="span" ml={1} fontFamily="monospace" textTransform="uppercase">
                                                                        ({taskShortId})
                                                                    </Text>
                                                                )}
                                                            </Badge>
                                                        );
                                                    })}
                                                </Flex>
                                            </Box>
                                        ) : null}

                                        <Flex justify="flex-end" mt={1.5}>
                                            <Text
                                                fontSize="xs"
                                                color={plansColors.textColorMuted}
                                            >
                                                {log.created_at ? new Date(log.created_at).toLocaleString() : "Unknown date"}
                                            </Text>
                                        </Flex>
                                    </Box>
                                );
                            })
                        )}
                    </Stack>
                </>
            )}
        </div>
    );
};

export default PlanLogSection;