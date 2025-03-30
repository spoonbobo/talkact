"use client";

import { Box, Text, Flex, Icon } from "@chakra-ui/react";
import { FaSync } from "react-icons/fa";
import { useTranslations } from "next-intl";
import { useColorModeValue } from "@/components/ui/color-mode";
import { TaskStatusBadge } from "@/components/task";
import { ITask, TaskSidebarProps } from "@/types/task";

export const TaskSidebar = ({ selectedTask, approveOrDeny, fetchTasks }: TaskSidebarProps) => {
    const t = useTranslations("Tasks");

    // Dark mode adaptive colors
    const bgSubtle = useColorModeValue("bg.subtle", "gray.800");
    const textColor = useColorModeValue("gray.600", "gray.400");
    const textColorStrong = useColorModeValue("gray.700", "gray.300");
    const borderColor = useColorModeValue("gray.200", "gray.700");
    const approveButtonBg = useColorModeValue("green.50", "green.900");
    const approveButtonColor = useColorModeValue("green.600", "green.300");
    const approveButtonHoverBg = useColorModeValue("green.100", "green.800");
    const approveButtonActiveBg = useColorModeValue("green.200", "green.700");
    const denyButtonBg = useColorModeValue("red.50", "red.900");
    const denyButtonColor = useColorModeValue("red.600", "red.300");
    const denyButtonHoverBg = useColorModeValue("red.100", "red.800");
    const denyButtonActiveBg = useColorModeValue("red.200", "red.700");
    const refreshButtonBg = useColorModeValue("bg.subtle", "gray.700");
    const refreshButtonColor = useColorModeValue("gray.600", "gray.400");
    const refreshButtonHoverBg = useColorModeValue("gray.100", "gray.600");
    const refreshButtonActiveBg = useColorModeValue("gray.200", "gray.500");

    const formatTaskId = (taskId: string) => {
        if (!taskId) return "-";
        const parts = taskId.split("-");
        return parts.length > 0 ? parts[0] : taskId;
    };

    return (
        <Box
            width={{ base: "100%", md: "180px" }}
            bg={bgSubtle}
            p={4}
            borderRadius="md"
            height="100%"
            borderWidth="1px"
            borderColor={borderColor}
            display="flex"
            flexDirection="column"
            overflow="auto"
        >
            <Flex direction="column" gap={3}>
                <Flex justify="space-between" align="center">
                    <Text fontSize="xs" fontWeight="medium" color={textColor}>
                        {t("status")}
                    </Text>
                    <Flex align="center">
                        {selectedTask ? (
                            <TaskStatusBadge status={selectedTask.status} size="sm" />
                        ) : (
                            <Text fontSize="xs" color={textColor}>
                                {t("no_task_selected")}
                            </Text>
                        )}
                    </Flex>
                </Flex>

                <Box mb={2}>
                    <Text fontSize="xs" color={textColor}>
                        {t("task_id")}
                    </Text>
                    <Text fontSize="sm" fontWeight="medium" color={textColorStrong} overflow="hidden" textOverflow="ellipsis">
                        {selectedTask ? formatTaskId(selectedTask.task_id) : "-"}
                    </Text>
                </Box>

                <Flex direction="column" gap={2} mt={2}>
                    <Box
                        as="button"
                        py={2}
                        px={3}
                        borderRadius="md"
                        bg={approveButtonBg}
                        color={approveButtonColor}
                        fontWeight="medium"
                        fontSize="sm"
                        _hover={{ bg: approveButtonHoverBg }}
                        _active={{ bg: approveButtonActiveBg }}
                        _disabled={{ opacity: 0.5, cursor: "not-allowed" }}
                        // TODO:
                        // @ts-ignore
                        disabled={!selectedTask || selectedTask.status !== "pending"}
                        onClick={() => approveOrDeny('approve')}
                    >
                        {t("approve")}
                    </Box>

                    <Box
                        as="button"
                        py={2}
                        px={3}
                        borderRadius="md"
                        bg={denyButtonBg}
                        color={denyButtonColor}
                        fontWeight="medium"
                        fontSize="sm"
                        _hover={{ bg: denyButtonHoverBg }}
                        _active={{ bg: denyButtonActiveBg }}
                        _disabled={{ opacity: 0.5, cursor: "not-allowed" }}
                        // TODO:
                        // @ts-ignore
                        disabled={!selectedTask || selectedTask.status !== "pending"}
                        onClick={() => approveOrDeny('deny')}
                    >
                        {t("deny")}
                    </Box>

                    <Box
                        as="button"
                        py={2}
                        px={3}
                        borderRadius="md"
                        bg={refreshButtonBg}
                        color={refreshButtonColor}
                        fontWeight="medium"
                        fontSize="sm"
                        _hover={{ bg: refreshButtonHoverBg }}
                        _active={{ bg: refreshButtonActiveBg }}
                        _disabled={{ opacity: 0.5, cursor: "not-allowed" }}
                        onClick={fetchTasks}
                    >
                        <Flex align="center" justify="center">
                            <Icon as={FaSync} mr={2} />
                            {t("refresh")}
                        </Flex>
                    </Box>
                </Flex>
            </Flex>
        </Box>
    );
};

