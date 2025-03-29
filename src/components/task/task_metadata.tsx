"use client";

import { Box, Text, Flex } from "@chakra-ui/react";
import { useTranslations } from "next-intl";
import { useColorModeValue } from "@/components/ui/color-mode";
import { ITask } from "@/types/task";

interface TaskMetadataProps {
    selectedTask: ITask | null;
}

const TaskMetadata = ({ selectedTask }: TaskMetadataProps) => {
    const t = useTranslations("Tasks");

    // Dark mode adaptive colors
    const textColor = useColorModeValue("gray.600", "gray.400");
    const textColorStrong = useColorModeValue("gray.700", "gray.300");

    const formatDate = (dateString: string) => {
        if (!dateString) return "N/A";
        return new Date(dateString).toLocaleString();
    };

    return (
        <Box width="100%" height="100%" overflow="hidden">
            <Flex
                direction={{ base: "column", md: "row" }}
                width="100%"
                height="100%"
                gap={4}
            >
                {/* Summarization column */}
                <Box
                    flex="1"
                    overflow="hidden"
                    minWidth="0"
                    height="100%"
                    display="flex"
                    flexDirection="column"
                >
                    <Text fontSize={{ base: "sm", md: "md" }} color={textColor} mb={1}>
                        {t("summarization")}
                    </Text>
                    <Box
                        flex="1"
                        overflow="auto"
                        p={2}
                        bg={useColorModeValue("gray.50", "gray.800")}
                        borderRadius="md"
                    >
                        <Text
                            fontSize={{ base: "sm", md: "md" }}
                            fontWeight="medium"
                            whiteSpace="pre-wrap"
                            color={textColorStrong}
                        >
                            {selectedTask ? selectedTask.task_summarization : t("no_task_selected")}
                        </Text>
                    </Box>
                </Box>

                {/* Timestamps column */}
                <Box
                    width={{ base: "100%", md: "250px" }}
                    flexShrink={0}
                    height={{ base: "auto", md: "100%" }}
                    bg={useColorModeValue("gray.50", "gray.800")}
                    p={3}
                    borderRadius="md"
                >
                    <Box mb={4}>
                        <Text fontSize="xs" color={textColor} fontWeight="medium">
                            {t("created")}
                        </Text>
                        <Text fontSize="sm" color={textColorStrong} lineClamp={1}>
                            {selectedTask ? formatDate(selectedTask.created_at) : "N/A"}
                        </Text>
                    </Box>
                    <Box mb={4}>
                        <Text fontSize="xs" color={textColor} fontWeight="medium">
                            {t("started")}
                        </Text>
                        <Text fontSize="sm" color={textColorStrong} lineClamp={1}>
                            {selectedTask && selectedTask.start_time ? formatDate(selectedTask.start_time) : "N/A"}
                        </Text>
                    </Box>
                    <Box>
                        <Text fontSize="xs" color={textColor} fontWeight="medium">
                            {t("completed")}
                        </Text>
                        <Text fontSize="sm" color={textColorStrong} lineClamp={1}>
                            {selectedTask && selectedTask.end_time ? formatDate(selectedTask.end_time) : "N/A"}
                        </Text>
                    </Box>
                </Box>
            </Flex>
        </Box>
    );
};

export default TaskMetadata; 