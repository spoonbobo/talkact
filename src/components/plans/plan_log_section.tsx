import { useEffect } from 'react';
import { Card, CardHeader, CardBody, Flex, Text, Stack, Box, Badge, Link } from "@chakra-ui/react";
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
            onLogClick(log);
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
                    ? "blue.400"
                    : plansColors.accentColor,
                shadow: isConfirmation
                    ? "0 4px 12px rgba(66, 153, 225, 0.15)"
                    : "0 2px 5px rgba(0, 0, 0, 0.05)"
            };
        }
    };

    // Define badge colors for different log types
    const getLogTypeBadgeColors = (type: string) => {
        switch (type) {
            case "ask_for_plan_approval":
                return {
                    bg: isDarkMode ? "blue.800" : "blue.50",
                    color: isDarkMode ? "blue.200" : "blue.700",
                    borderColor: isDarkMode ? "blue.700" : "blue.200"
                };
            case "plan_created":
                return {
                    bg: isDarkMode ? "green.800" : "green.50",
                    color: isDarkMode ? "green.200" : "green.700",
                    borderColor: isDarkMode ? "green.700" : "green.200"
                };
            case "plan_completed":
                return {
                    bg: isDarkMode ? "teal.800" : "teal.50",
                    color: isDarkMode ? "teal.200" : "teal.700",
                    borderColor: isDarkMode ? "teal.700" : "teal.200"
                };
            case "plan_failed":
                return {
                    bg: isDarkMode ? "red.800" : "red.50",
                    color: isDarkMode ? "red.200" : "red.700",
                    borderColor: isDarkMode ? "red.700" : "red.200"
                };
            case "task_completed":
                return {
                    bg: isDarkMode ? "purple.800" : "purple.50",
                    color: isDarkMode ? "purple.200" : "purple.700",
                    borderColor: isDarkMode ? "purple.700" : "purple.200"
                };
            case "task_failed":
                return {
                    bg: isDarkMode ? "orange.800" : "orange.50",
                    color: isDarkMode ? "orange.200" : "orange.700",
                    borderColor: isDarkMode ? "orange.700" : "orange.200"
                };
            default:
                return {
                    bg: isDarkMode ? "gray.700" : "gray.100",
                    color: isDarkMode ? "gray.300" : "gray.700",
                    borderColor: isDarkMode ? "gray.600" : "gray.200"
                };
        }
    };

    // Define skill badge colors
    const skillBadgeColors = {
        bg: isDarkMode ? "purple.800" : "purple.50",
        color: isDarkMode ? "purple.200" : "purple.700",
        borderColor: isDarkMode ? "purple.700" : "purple.200",
        hoverBg: isDarkMode ? "purple.700" : "purple.100",
    };

    // Define plan ID badge colors
    const planIdBadgeColors = {
        bg: isDarkMode ? "gray.700" : "gray.100",
        color: isDarkMode ? "blue.200" : "blue.600",
        borderColor: isDarkMode ? "gray.600" : "gray.300",
    };

    return (
        <div>
            <Text
                fontSize="sm"
                fontWeight="bold"
                color={plansColors.textColorHeading}
                mb={3}
                px={1}
            >
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

                            {/* Render skills if available */}
                            {latestLog.skills && latestLog.skills.length > 0 ? (
                                <Box mt={2}>
                                    <Text
                                        fontSize="xs"
                                        color={plansColors.textColorMuted}
                                        mb={1.5}
                                        fontWeight="medium"
                                    >
                                        {t("latest_skills")}:
                                    </Text>
                                    <Flex gap={1.5} flexWrap="wrap">
                                        {latestLog.skills.map((skill: any, index: number) => (
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
                                                {skill.name || skill.tool_name || t("unnamed_skill")}
                                            </Badge>
                                        ))}
                                    </Flex>
                                </Box>
                            ) : (
                                <Text
                                    fontSize="xs"
                                    color={plansColors.textColorMuted}
                                    fontStyle="italic"
                                >
                                    {t("no_skill_action")}
                                </Text>
                            )}

                            <Flex justify="flex-end" mt={2}>
                                <Text
                                    fontSize="xs"
                                    color={plansColors.textColorMuted}
                                    fontFamily="monospace"
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
