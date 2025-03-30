"use client";

import { useState, useEffect, useRef } from "react";
import { Box, Text, Flex, Input, Button, Icon } from "@chakra-ui/react";
import { FaEdit, FaSave, FaTimes } from "react-icons/fa";
import { useTranslations } from "next-intl";
import { useColorModeValue } from "@/components/ui/color-mode";
import { ITask, MCPToolCallsProps } from "@/types/task";
import { toaster } from "@/components/ui/toaster";

export const MCPToolCalls = ({ selectedTask, setSelectedTask, fetchTasks }: MCPToolCallsProps) => {
    const t = useTranslations("Tasks");

    // Create a local copy of the tools_called for editing
    const [localToolCalls, setLocalToolCalls] = useState<any[]>([]);
    const [isEditing, setIsEditing] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const contentRef = useRef<HTMLDivElement>(null);

    // Use refs to store input values during editing without causing re-renders
    const inputRefs = useRef<{ [key: string]: HTMLInputElement | null }>({});

    // Dark mode adaptive colors
    const textColor = useColorModeValue("gray.600", "gray.400");
    const textColorStrong = useColorModeValue("gray.700", "gray.300");
    const borderColor = useColorModeValue("gray.200", "gray.700");
    const loggerBg = useColorModeValue("white", "gray.900");
    const loggerCodeBg = useColorModeValue("gray.50", "gray.800");
    const monospaceTextColor = useColorModeValue("gray.800", "gray.200");

    // Initialize local state when selectedTask changes
    useEffect(() => {
        if (selectedTask?.tools_called) {
            setLocalToolCalls(JSON.parse(JSON.stringify(selectedTask.tools_called)));
            setIsEditing(false);
        } else {
            setLocalToolCalls([]);
        }
    }, [selectedTask]);

    const collectFormValues = () => {
        if (!selectedTask) return null;

        // Create a deep copy of the current tool calls
        const updatedToolCalls = JSON.parse(JSON.stringify(localToolCalls));

        // Update with values from refs
        Object.entries(inputRefs.current).forEach(([refKey, inputElement]) => {
            if (!inputElement) return;

            // Parse the ref key format: "tool_{toolIndex}_arg_{argKey}"
            const parts = refKey.split('_');
            const toolIndex = parseInt(parts[1], 10);

            if (parts[2] === 'arg' && parts.length >= 4) {
                // Handle argument update
                const argKey = parts.slice(3).join('_'); // Rejoin in case the arg key itself contains underscores

                if (!updatedToolCalls[toolIndex].args) {
                    updatedToolCalls[toolIndex].args = {};
                }

                // Try to parse JSON if it looks like an object or array
                let processedValue = inputElement.value;
                if (typeof processedValue === 'string') {
                    if ((processedValue.startsWith('{') && processedValue.endsWith('}')) ||
                        (processedValue.startsWith('[') && processedValue.endsWith(']'))) {
                        try {
                            processedValue = JSON.parse(processedValue);
                        } catch (e) {
                            // If parsing fails, keep the original string value
                            processedValue = inputElement.value;
                        }
                    }
                }

                updatedToolCalls[toolIndex].args[argKey] = processedValue;
            }
        });

        return updatedToolCalls;
    };

    const handleSaveChanges = async () => {
        if (!selectedTask) return;

        const updatedToolCalls = collectFormValues();
        if (!updatedToolCalls) return;

        setIsSaving(true);
        try {
            // Update the selectedTask with the modified toolCalls immediately for UI feedback
            setSelectedTask({
                ...selectedTask,
                tools_called: JSON.parse(JSON.stringify(updatedToolCalls))
            });

            const response = await fetch(`/api/task/update_task`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    task_id: selectedTask.task_id,
                    tools_called: updatedToolCalls
                }),
            });

            if (!response.ok) {
                throw new Error('Failed to update task');
            }

            // Update local state with the new values
            setLocalToolCalls(updatedToolCalls);

            // Refresh tasks to get updated data
            fetchTasks();
            setIsEditing(false);
        } catch (error) {
            toaster.create({
                title: "Error updating task",
                description: "Failed to update task. Please try again later.",
                type: "error"
            })
        } finally {
            setIsSaving(false);
        }
    };


    if (!selectedTask || !localToolCalls || localToolCalls.length === 0) {
        return (
            <Text color={textColor}>{t("no_mcp_tool_calls")}</Text>
        );
    }

    return (
        <Box position="relative" height="100%" overflow="hidden">
            {/* Content container with its own scrolling */}
            <Box
                ref={contentRef}
                height="100%"
                overflow="auto"
                pr={0} /* Add right padding to avoid content being hidden under buttons */
            >
                {localToolCalls.map((tool, toolIndex) => (
                    <Box
                        key={toolIndex}
                        mb={4}
                        p={3}
                        borderWidth="1px"
                        borderRadius="md"
                        borderColor={borderColor}
                        bg={loggerBg}
                    >
                        {/* Tool name and server in a more compact layout */}
                        <Flex justifyContent="space-between" alignItems="center" mb={2}>
                            <Text fontSize="sm" fontWeight="semibold" color="blue.500">
                                {tool.tool_name}
                            </Text>
                            {tool.mcp_server && (
                                <Text fontSize="xs" color={textColor} fontStyle="italic">
                                    {tool.mcp_server}
                                </Text>
                            )}
                        </Flex>

                        {/* Description field - always non-editable */}
                        {tool.description && (
                            <Box mb={3}>
                                <Text fontSize="sm" color={textColor} pl={1}>
                                    {tool.description}
                                </Text>
                            </Box>
                        )}

                        {tool.args && Object.keys(tool.args).length > 0 ? (
                            <Box ml={2}>
                                {!isEditing && (
                                    <Text fontSize="xs" color={textColor} mb={1}>Arguments:</Text>
                                )}
                                {Object.entries(tool.args)
                                    .sort(([keyA], [keyB]) => keyA.localeCompare(keyB))
                                    .map(([key, value], argIndex) => (
                                        <Flex key={argIndex} justify="space-between" align="center" mb={2}>
                                            <Text fontSize="sm" color={textColorStrong} fontWeight="medium" width="30%">
                                                {key}:
                                            </Text>
                                            {isEditing ? (
                                                <Input
                                                    width="70%"
                                                    fontFamily="mono"
                                                    fontSize="xs"
                                                    defaultValue={typeof value === 'object' ? JSON.stringify(value) : String(value)}
                                                    ref={(el) => {
                                                        inputRefs.current[`tool_${toolIndex}_arg_${key}`] = el;
                                                    }}
                                                    size="sm"
                                                />
                                            ) : (
                                                <Box
                                                    width="70%"
                                                    fontFamily="mono"
                                                    fontSize="xs"
                                                    p={2}
                                                    borderWidth="1px"
                                                    borderRadius="md"
                                                    borderColor={borderColor}
                                                    bg={loggerCodeBg}
                                                    overflowX="auto"
                                                    color={monospaceTextColor}
                                                >
                                                    {typeof value === 'object' ? JSON.stringify(value, null, 2) : String(value)}
                                                </Box>
                                            )}
                                        </Flex>
                                    ))}
                            </Box>
                        ) : (
                            <Text fontSize="sm" color={textColor} fontStyle="italic">No arguments provided</Text>
                        )}
                    </Box>
                ))}
            </Box>

            {/* Floating buttons positioned in the top-right corner of the viewport */}
            <Box
                position="absolute"
                top="8px"
                right="8px"
                zIndex="10"
                display="flex"
                flexDirection="column"
                gap={2}
            >
                {!isEditing ? (
                    <Button
                        size="sm"
                        colorScheme="blue"
                        onClick={() => setIsEditing(true)}
                        borderRadius="full"
                        width="40px"
                        height="40px"
                        boxShadow="lg"
                        title={t("edit")}
                        opacity="0.8"
                        _hover={{ opacity: 1 }}
                    >
                        <Icon as={FaEdit} />
                    </Button>
                ) : (
                    <>
                        <Button
                            size="sm"
                            variant="solid"
                            colorScheme="green"
                            onClick={handleSaveChanges}
                            loading={isSaving}
                            borderRadius="full"
                            width="40px"
                            height="40px"
                            boxShadow="lg"
                            title={t("save")}
                            opacity="0.8"
                            _hover={{ opacity: 1 }}
                        >
                            <Icon as={FaSave} />
                        </Button>
                        <Button
                            size="sm"
                            variant="solid"
                            colorScheme="red"
                            onClick={() => {
                                setLocalToolCalls(JSON.parse(JSON.stringify(selectedTask.tools_called)));
                                setIsEditing(false);
                            }}
                            borderRadius="full"
                            width="40px"
                            height="40px"
                            boxShadow="lg"
                            title={t("cancel")}
                            opacity="0.8"
                            _hover={{ opacity: 1 }}
                        >
                            <Icon as={FaTimes} />
                        </Button>
                    </>
                )}
            </Box>
        </Box>
    );
};
