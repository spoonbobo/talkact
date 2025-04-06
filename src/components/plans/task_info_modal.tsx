"use client"

import { useState, useRef, useEffect } from 'react';
import {
    Button,
    Dialog,
    Portal,
    Stack,
    Box,
    Text,
    Flex,
    Icon,
    Badge,
    Separator,
    Code,
} from '@chakra-ui/react';
import { useTranslations } from "next-intl";
import { ITask } from "@/types/plan";
import { FiServer } from "react-icons/fi";
import { FaTools } from "react-icons/fa";

interface TaskInfoModalProps {
    isOpen: boolean;
    onClose: () => void;
    task: ITask | null;
    colors?: any;
}

export function TaskInfoModal({ isOpen, onClose, task, colors }: TaskInfoModalProps) {
    const t = useTranslations("Plans");

    // Default colors if not provided
    const textColorHeading = colors?.textColorHeading || "gray.800";
    const textColorStrong = colors?.textColorStrong || "gray.700";
    const textColor = colors?.textColor || "gray.600";
    const textColorMuted = colors?.textColorMuted || "gray.500";
    const borderColor = colors?.borderColor || "gray.200";
    const accentColor = colors?.accentColor || "blue.500";

    // Function to render tool information
    const renderToolInfo = () => {
        if (!task || !task.tool) return null;

        if (Array.isArray(task.tool)) {
            return (
                <Stack gap={3} mt={2}>
                    {task.tool.map((toolCall, idx) => (
                        <Box
                            key={idx}
                            p={3}
                            borderRadius="md"
                            bg={`${accentColor}10`}
                            border="1px"
                            borderColor={borderColor}
                            boxShadow="sm"
                        >
                            <Flex justifyContent="space-between" mb={2} alignItems="center">
                                <Flex gap={2} alignItems="center">
                                    <Icon as={FaTools} color={accentColor} />
                                    <Text fontWeight="medium" color={textColorStrong}>
                                        {toolCall.name || 'Tool'}
                                    </Text>
                                </Flex>
                            </Flex>

                            {/* Add tool description */}
                            {toolCall.description && (
                                <Text fontSize="sm" color={textColor} mb={2}>
                                    {toolCall.description}
                                </Text>
                            )}

                            {toolCall.args && Object.keys(toolCall.args).length > 0 && (
                                <Box mt={2}>
                                    <Text fontSize="xs" fontWeight="bold" color={textColorMuted} mb={1}>
                                        {t("parameters")}:
                                    </Text>
                                    <Stack gap={1}>
                                        {Object.entries(toolCall.args).map(([key, value]) => {
                                            // Extract value and type if in augmented format
                                            const isAugmented = value && typeof value === 'object' && 'value' in value && 'type' in value;
                                            const displayValue = isAugmented ? value.value : value;
                                            const paramType = isAugmented ? value.type : 'unknown';

                                            return (
                                                <Flex key={key} fontSize="sm">
                                                    <Text fontWeight="medium" color={textColorStrong} mr={1}>
                                                        {key}:
                                                    </Text>
                                                    <Badge size="sm" colorScheme="blue" mr={1}>{paramType as string}</Badge>
                                                    <Text color={textColor}>
                                                        {typeof displayValue === 'string' ? displayValue : JSON.stringify(displayValue)}
                                                    </Text>
                                                </Flex>
                                            );
                                        })}
                                    </Stack>
                                </Box>
                            )}
                        </Box>
                    ))}
                </Stack>
            );
        } else {
            // Handle single tool object
            return (
                <Box
                    p={3}
                    borderRadius="md"
                    bg={`${accentColor}10`}
                    border="1px"
                    borderColor={borderColor}
                    boxShadow="sm"
                    mt={2}
                >
                    <Flex justifyContent="space-between" mb={2} alignItems="center">
                        <Flex gap={2} alignItems="center">
                            <Icon as={FaTools} color={accentColor} />
                            <Text fontWeight="medium" color={textColorStrong}>
                                {task.tool.tool_name || t("not_specified")}
                            </Text>
                        </Flex>
                    </Flex>

                    {/* Add tool description */}
                    {task.tool.description && (
                        <Text fontSize="sm" color={textColor} mb={2}>
                            {task.tool.description}
                        </Text>
                    )}

                    {task.tool.args && Object.keys(task.tool.args).length > 0 && (
                        <Box mt={2}>
                            <Text fontSize="xs" fontWeight="bold" color={textColorMuted} mb={1}>
                                {t("args")}:
                            </Text>
                            <Stack gap={1}>
                                {Object.entries(task.tool.args).map(([key, value]) => {
                                    // Extract value and type if in augmented format
                                    const isAugmented = value && typeof value === 'object' && 'value' in value && 'type' in value;
                                    const displayValue = isAugmented ? value.value : value;
                                    const paramType = isAugmented ? value.type : 'unknown';

                                    return (
                                        <Flex key={key} fontSize="sm">
                                            <Text fontWeight="medium" color={textColorStrong} mr={1}>
                                                {key}:
                                            </Text>
                                            <Badge size="sm" colorScheme="blue" mr={1}>{paramType as string}</Badge>
                                            <Text color={textColor}>
                                                {typeof displayValue === 'string' ? displayValue : JSON.stringify(displayValue)}
                                            </Text>
                                        </Flex>
                                    );
                                })}
                            </Stack>
                        </Box>
                    )}
                </Box>
            );
        }
    };

    // Function to render task status badge
    const getStatusBadge = (status: string) => {
        let colorScheme = "gray";

        switch (status) {
            case "completed":
                colorScheme = "green";
                break;
            case "in_progress":
                colorScheme = "blue";
                break;
            case "pending":
                colorScheme = "yellow";
                break;
            case "failed":
                colorScheme = "red";
                break;
        }

        return <Badge colorScheme={colorScheme}>{status}</Badge>;
    };

    // Function to render task logs
    const renderTaskLogs = () => {
        if (!task || !task.logs) return null;

        let logsContent;
        try {
            // If logs is a string, try to parse it as JSON
            const logsData = typeof task.logs === 'string'
                ? JSON.parse(task.logs)
                : task.logs;

            // Pretty print the JSON
            logsContent = JSON.stringify(logsData, null, 2);
        } catch (error) {
            // If parsing fails, display as is
            logsContent = typeof task.logs === 'string'
                ? task.logs
                : JSON.stringify(task.logs);
        }

        return (
            <Box mt={3}>
                <Text fontWeight="medium" color={textColorStrong} mb={2}>{t("logs")}</Text>
                <Code
                    display="block"
                    whiteSpace="pre"
                    overflowX="auto"
                    p={3}
                    borderRadius="md"
                    fontSize="sm"
                    bg={`${accentColor}05`}
                >
                    {logsContent}
                </Code>
            </Box>
        );
    };

    return (
        <Dialog.Root open={isOpen} onOpenChange={onClose}>
            <Portal>
                <Dialog.Backdrop />
                <Dialog.Positioner>
                    <Dialog.Content maxWidth="600px">
                        <Dialog.Header>
                            <Dialog.Title color={textColorHeading}>{task?.task_name || t("task_details")}</Dialog.Title>
                            <Dialog.CloseTrigger />
                        </Dialog.Header>

                        <Dialog.Body>
                            {task ? (
                                <Stack gap={4}>
                                    {/* Task Status */}
                                    {task.status && (
                                        <Box>
                                            <Text fontWeight="medium" color={textColorStrong} mb={1}>{t("status")}</Text>
                                            {getStatusBadge(task.status)}
                                        </Box>
                                    )}

                                    {/* Task Explanation */}
                                    <Box>
                                        <Text fontWeight="medium" color={textColorStrong} mb={1}>{t("task_explanation")}</Text>
                                        <Text color={textColor} whiteSpace="pre-wrap">{task.task_explanation}</Text>
                                    </Box>

                                    {/* Expected Result */}
                                    {task.expected_result && (
                                        <Box>
                                            <Text fontWeight="medium" color={textColorStrong} mb={1}>{t("expected_result")}</Text>
                                            <Text color={textColor} whiteSpace="pre-wrap">{task.expected_result}</Text>
                                        </Box>
                                    )}

                                    {/* Result */}
                                    {task.result && (
                                        <Box>
                                            <Text fontWeight="medium" color={textColorStrong} mb={1}>{t("result")}</Text>
                                            <Text color={textColor} whiteSpace="pre-wrap">{task.result}</Text>
                                        </Box>
                                    )}

                                    {/* MCP Server */}
                                    {task.mcp_server && (
                                        <Box>
                                            <Text fontWeight="medium" color={textColorStrong} mb={1}>{t("server")}</Text>
                                            <Flex alignItems="center" gap={2}>
                                                <Icon as={FiServer} color={accentColor} />
                                                <Text color={textColor}>{task.mcp_server}</Text>
                                            </Flex>
                                        </Box>
                                    )}

                                    {/* Tool Information */}
                                    {task.tool && (
                                        <>
                                            <Separator my={2} />
                                            <Text fontWeight="medium" color={textColorStrong}>{t("tools")}</Text>
                                            {renderToolInfo()}
                                        </>
                                    )}

                                    {/* Task Logs */}
                                    {task.logs && (
                                        <>
                                            <Separator my={2} />
                                            {renderTaskLogs()}
                                        </>
                                    )}
                                </Stack>
                            ) : (
                                <Text color={textColorMuted}>{t("no_task_selected")}</Text>
                            )}
                        </Dialog.Body>

                        <Dialog.Footer>
                            <Button onClick={onClose} colorScheme="blue">
                                {t("close")}
                            </Button>
                        </Dialog.Footer>
                    </Dialog.Content>
                </Dialog.Positioner>
            </Portal>
        </Dialog.Root>
    );
} 