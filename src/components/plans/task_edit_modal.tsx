"use client"

import { useState, useRef, useEffect } from 'react';
import {
    Button,
    Dialog,
    Field,
    Input,
    Portal,
    Stack,
    Textarea,
    Box,
    Select,
    Separator,
    Text,
    Flex,
    Icon,
    Badge,
} from '@chakra-ui/react';
import { toaster } from "@/components/ui/toaster"
import { useColorModeValue } from "@/components/ui/color-mode";
import { useTranslations } from "next-intl";
import { ITask } from "@/types/plan";
import { FiServer } from "react-icons/fi";
import { FaTools } from "react-icons/fa";

interface TaskEditModalProps {
    isOpen: boolean;
    onClose: () => void;
    task: ITask | null;
    onTaskUpdated?: () => void;
}

export function TaskEditModal({ isOpen, onClose, task, onTaskUpdated }: TaskEditModalProps) {
    const [taskName, setTaskName] = useState('');
    const [taskExplanation, setTaskExplanation] = useState('');
    const [expectedResult, setExpectedResult] = useState('');
    const [mcpServer, setMcpServer] = useState('');
    const [toolParams, setToolParams] = useState<Record<string, any>>({});
    const [paramTypes, setParamTypes] = useState<Record<string, string>>({});
    const [isLoading, setIsLoading] = useState(false);
    const [errors, setErrors] = useState<{ taskName?: string; taskExplanation?: string }>({});
    const taskNameInputRef = useRef<HTMLInputElement>(null);
    const t = useTranslations("Plans");

    // Add color mode values for text similar to tasks page
    const textColorHeading = useColorModeValue("gray.800", "gray.100");
    const textColorStrong = useColorModeValue("gray.700", "gray.300");
    const textColor = useColorModeValue("gray.600", "gray.400");
    const textColorMuted = useColorModeValue("gray.500", "gray.500");
    const borderColor = useColorModeValue("gray.200", "gray.700");
    const accentColor = useColorModeValue("blue.500", "blue.300");

    // Update form values when task changes or modal opens
    useEffect(() => {
        if (task && isOpen) {
            setTaskName(task.task_name || '');
            setTaskExplanation(task.task_explanation || '');
            setExpectedResult(task.expected_result || '');
            setMcpServer(task.mcp_server || '');

            // Initialize tool parameters
            if (task.tool) {
                const newToolParams: Record<string, any> = {};
                const newParamTypes: Record<string, string> = {};

                if (Array.isArray(task.tool) && task.tool.length > 0) {
                    // For now, we'll just handle the first tool's parameters
                    const firstTool = task.tool[0];
                    if (firstTool.args) {
                        Object.entries(firstTool.args).forEach(([key, value]) => {
                            // Check if the value is in the augmented format
                            if (value && typeof value === 'object' && 'value' in value && 'type' in value) {
                                newToolParams[key] = value.value;
                                newParamTypes[key] = value.type as string;
                            } else {
                                newToolParams[key] = value;
                                newParamTypes[key] = 'unknown';
                            }
                        });
                    }
                } else if (!Array.isArray(task.tool) && task.tool.args) {
                    Object.entries(task.tool.args).forEach(([key, value]) => {
                        // Check if the value is in the augmented format
                        if (value && typeof value === 'object' && 'value' in value && 'type' in value) {
                            newToolParams[key] = value.value;
                            newParamTypes[key] = value.type as string;
                        } else {
                            newToolParams[key] = value;
                            newParamTypes[key] = 'unknown';
                        }
                    });
                }

                setToolParams(newToolParams);
                setParamTypes(newParamTypes);
            } else {
                setToolParams({});
                setParamTypes({});
            }
        }
    }, [task, isOpen]);

    const validateForm = () => {
        const newErrors: { taskName?: string; taskExplanation?: string } = {};

        if (!taskName) {
            newErrors.taskName = 'Task name is required';
        }

        if (!taskExplanation) {
            newErrors.taskExplanation = 'Task explanation is required';
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSaveTask = async () => {
        if (!task) {
            console.error('Cannot save: task is null');
            toaster.create({
                title: "Error",
                description: "Cannot update task: no task data available",
                duration: 5000,
            });
            return;
        }

        setIsLoading(true);
        try {
            const taskData = {
                task_id: task.task_id,
                task_name: taskName,
                task_explanation: taskExplanation,
                expected_result: expectedResult || null,
                mcp_server: mcpServer || null,
                tool: prepareToolData(task.tool, toolParams),
            };
            console.log(taskData);

            const response = await fetch('/api/plan/update_task', {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(taskData),
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Failed to update task');
            }

            toaster.create({
                title: "Task updated",
                description: "The task has been updated successfully.",
                duration: 3000,
            });

            // Call the onTaskUpdated callback to refresh tasks
            if (onTaskUpdated) {
                onTaskUpdated();
            }

            onClose();
        } catch (error) {
            console.error('Error saving task:', error);
            toaster.create({
                title: "Error",
                description: error instanceof Error ? error.message : "Failed to update task",
                duration: 5000,
            });
        } finally {
            setIsLoading(false);
        }
    };

    const handleClose = () => {
        setTaskName('');
        setTaskExplanation('');
        setExpectedResult('');
        setMcpServer('');
        setToolParams({});
        setParamTypes({});
        setErrors({});
        onClose();
    };

    // Helper function to prepare tool data for submission
    const prepareToolData = (originalTool: any, updatedParams: Record<string, any>) => {
        if (!originalTool) return null;

        // Create augmented parameters with type information
        const augmentedParams: Record<string, any> = {};
        Object.entries(updatedParams).forEach(([key, value]) => {
            augmentedParams[key] = {
                value: value,
                type: paramTypes[key] || 'unknown'
            };
        });

        if (Array.isArray(originalTool)) {
            // For now, we only update the first tool's parameters
            if (originalTool.length === 0) return [];

            const updatedTools = [...originalTool];
            updatedTools[0] = {
                ...updatedTools[0],
                args: augmentedParams
            };
            return updatedTools;
        } else {
            // Single tool object
            return {
                ...originalTool,
                args: augmentedParams
            };
        }
    };

    // Handle parameter change
    const handleParamChange = (key: string, value: string) => {
        setToolParams(prev => ({
            ...prev,
            [key]: value
        }));
    };

    // Function to render editable tool information
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

                            {toolCall.args && Object.keys(toolCall.args).length > 0 && idx === 0 && (
                                <Box mt={2}>
                                    <Text fontSize="xs" fontWeight="bold" color={textColorMuted} mb={1}>
                                        {t("parameters")}:
                                    </Text>
                                    <Stack gap={2}>
                                        {Object.entries(toolCall.args).map(([key, value]) => {
                                            // Extract value and type if in augmented format
                                            const isAugmented = value && typeof value === 'object' && 'value' in value && 'type' in value;
                                            const displayValue = isAugmented ? value.value : value;
                                            const paramType = isAugmented ? value.type as string : 'unknown';

                                            // Check if this is an array type
                                            const isArray = paramType === 'array';

                                            return (
                                                <Field.Root key={key}>
                                                    <Flex justifyContent="space-between" alignItems="center" mb={1}>
                                                        <Field.Label fontSize="sm" color={textColorStrong}>{key}</Field.Label>
                                                        <Badge size="sm" colorScheme="blue">{paramType as string}</Badge>
                                                    </Flex>
                                                    {isArray ? (
                                                        <>
                                                            <Textarea
                                                                size="sm"
                                                                value={Array.isArray(toolParams[key])
                                                                    ? JSON.stringify(toolParams[key], null, 2)
                                                                    : toolParams[key] || '[]'}
                                                                onChange={(e) => {
                                                                    try {
                                                                        // Try to parse as JSON array
                                                                        const parsedValue = JSON.parse(e.target.value);
                                                                        handleParamChange(key, parsedValue);
                                                                    } catch (err) {
                                                                        // If not valid JSON, just store as string
                                                                        handleParamChange(key, e.target.value);
                                                                    }
                                                                }}
                                                                color={textColor}
                                                                placeholder='Enter array values as JSON: ["item1", "item2"]'
                                                                rows={3}
                                                            />
                                                            <Text fontSize="xs" color={textColorMuted} mt={1}>
                                                                {t("enter_array_as_json")}
                                                            </Text>
                                                        </>
                                                    ) : (
                                                        <Input
                                                            size="sm"
                                                            value={toolParams[key] || ''}
                                                            onChange={(e) => handleParamChange(key, e.target.value)}
                                                            color={textColor}
                                                        />
                                                    )}
                                                </Field.Root>
                                            );
                                        })}
                                    </Stack>
                                </Box>
                            )}

                            {idx > 0 && toolCall.args && Object.keys(toolCall.args).length > 0 && (
                                <Box mt={2}>
                                    <Text fontSize="xs" fontWeight="bold" color={textColorMuted} mb={1}>
                                        {t("args")} ({t("readonly")}):
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
                            <Stack gap={2}>
                                {Object.entries(task.tool.args).map(([key, value]) => {
                                    // Extract value and type if in augmented format
                                    const isAugmented = value && typeof value === 'object' && 'value' in value && 'type' in value;
                                    const displayValue = isAugmented ? value.value : value;
                                    const paramType = isAugmented ? value.type : 'unknown';

                                    return (
                                        <Field.Root key={key}>
                                            <Flex justifyContent="space-between" alignItems="center" mb={1}>
                                                <Field.Label fontSize="sm" color={textColorStrong}>{key}</Field.Label>
                                                <Badge size="sm" colorScheme="blue">{paramType as string}</Badge>
                                            </Flex>
                                            <Input
                                                size="sm"
                                                value={toolParams[key] || ''}
                                                onChange={(e) => handleParamChange(key, e.target.value)}
                                                color={textColor}
                                            />
                                        </Field.Root>
                                    );
                                })}
                            </Stack>
                        </Box>
                    )}
                </Box>
            );
        }
    };

    return (
        <Dialog.Root open={isOpen} onOpenChange={handleClose} initialFocusEl={() => taskNameInputRef.current}>
            <Portal>
                <Dialog.Backdrop />
                <Dialog.Positioner>
                    <Dialog.Content maxWidth="600px">
                        <Dialog.Header>
                            <Dialog.Title color={textColorHeading}>{t("edit_task")}</Dialog.Title>
                            <Dialog.CloseTrigger />
                        </Dialog.Header>

                        <Dialog.Body>
                            <Stack gap={4}>
                                <Field.Root invalid={!!errors.taskName}>
                                    <Field.Label color={textColorStrong}>{t("task_name")}</Field.Label>
                                    <Input
                                        color={textColor}
                                        ref={taskNameInputRef}
                                        type="text"
                                        value={taskName}
                                        onChange={(e) => setTaskName(e.target.value)}
                                        placeholder={t("enter_task_name")}
                                        required
                                        _placeholder={{ color: 'gray.400' }}
                                    />
                                    {errors.taskName && <Field.ErrorText>{errors.taskName}</Field.ErrorText>}
                                </Field.Root>

                                <Field.Root invalid={!!errors.taskExplanation}>
                                    <Field.Label color={textColorStrong}>{t("task_explanation")}</Field.Label>
                                    <Textarea
                                        color={textColor}
                                        value={taskExplanation}
                                        onChange={(e) => setTaskExplanation(e.target.value)}
                                        placeholder={t("enter_task_explanation")}
                                        required
                                        _placeholder={{ color: 'gray.400' }}
                                        rows={4}
                                    />
                                    {errors.taskExplanation && <Field.ErrorText>{errors.taskExplanation}</Field.ErrorText>}
                                </Field.Root>

                                <Field.Root>
                                    <Field.Label color={textColorStrong}>{t("expected_result")}</Field.Label>
                                    <Textarea
                                        color={textColor}
                                        value={expectedResult}
                                        onChange={(e) => setExpectedResult(e.target.value)}
                                        placeholder={t("enter_expected_result")}
                                        _placeholder={{ color: 'gray.400' }}
                                        rows={3}
                                    />
                                </Field.Root>

                                <Field.Root>
                                    <Field.Label color={textColorStrong}>{t("server")} ({t("readonly")})</Field.Label>
                                    <Input
                                        color={textColor}
                                        type="text"
                                        value={mcpServer}
                                        disabled={true}
                                        placeholder={t("not_specified")}
                                        _placeholder={{ color: 'gray.400' }}
                                    />
                                </Field.Root>

                                {task?.tool && (
                                    <>
                                        <Separator my={2} />
                                        <Text fontWeight="medium" color={textColorStrong}>{t("tools")}</Text>
                                        {renderToolInfo()}
                                        <Text fontSize="xs" color={textColorMuted} mt={1}>
                                            {Array.isArray(task.tool) && task.tool.length > 1
                                                ? t("only_first_tool_editable")
                                                : ''}
                                        </Text>
                                    </>
                                )}
                            </Stack>
                        </Dialog.Body>

                        <Dialog.Footer>
                            <Dialog.ActionTrigger asChild>
                                <Button variant="ghost" onClick={handleClose} color={textColor}>
                                    {t("cancel")}
                                </Button>
                            </Dialog.ActionTrigger>
                            <Button
                                colorScheme="blue"
                                onClick={handleSaveTask}
                                loading={isLoading}
                            >
                                {t("update_task")}
                            </Button>
                        </Dialog.Footer>
                    </Dialog.Content>
                </Dialog.Positioner>
            </Portal>
        </Dialog.Root>
    );
} 