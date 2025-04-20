"use client"

import { useEffect, useState, useRef } from 'react';
import { useTranslations } from "next-intl";
import {
    Button,
    Dialog,
    Portal,
    Stack,
    Box,
    Text,
    Badge,
    Separator,
    Link,
    Field,
    Input,
    Textarea,
    Flex,
    Icon,
} from '@chakra-ui/react';
import { useParams } from "next/navigation";
import NextLink from "next/link";
import SkillInfo from './skill_info';
import { toaster } from "@/components/ui/toaster"
import { FaTools } from "react-icons/fa";
import { useColorModeValue } from "@/components/ui/color-mode";

interface PlanLog {
    id: string;
    created_at: Date | string;
    type: string;
    content: string;
    planName?: string;
    planShortId?: string;
    task_id?: string;
    plan_id?: string;
    planNavId?: string;
    skills?: any[];
}

interface PlanLogModalProps {
    isOpen: boolean;
    onClose: () => void;
    log: PlanLog | null;
    colors?: any;
    onApprove?: (planId: string) => void;
    onDeny?: (planId: string) => void;
    onSkillUpdated?: () => void;
}

export default function PlanLogModal({
    isOpen,
    onClose,
    log,
    colors,
    onApprove,
    onDeny,
    onSkillUpdated
}: PlanLogModalProps) {
    const t = useTranslations('Plans');
    const params = useParams();
    const locale = params.locale as string || 'en';
    const [editingSkill, setEditingSkill] = useState<any>(null);
    const [skillName, setSkillName] = useState('');
    const [skillExplanation, setSkillExplanation] = useState('');
    const [toolParams, setToolParams] = useState<Record<string, any>>({});
    const [paramTypes, setParamTypes] = useState<Record<string, string>>({});
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [tasks, setTasks] = useState<any[]>([]);
    const [isLoadingTasks, setIsLoadingTasks] = useState(false);

    const skillNameInputRef = useRef<HTMLInputElement>(null);

    // Color mode values
    const bgColor = useColorModeValue("white", "gray.800");
    const textColor = useColorModeValue("gray.700", "gray.200");
    const textColorStrong = useColorModeValue("gray.800", "white");
    const textColorMuted = useColorModeValue("gray.500", "gray.400");
    const borderColor = useColorModeValue("gray.200", "gray.700");
    const headerBg = useColorModeValue("gray.50", "gray.900");
    const inputBg = useColorModeValue("white", "gray.700");
    const inputBorder = useColorModeValue("gray.300", "gray.600");
    const inputPlaceholderColor = useColorModeValue("gray.400", "gray.500");
    const inputFocusBorderColor = useColorModeValue("blue.500", "blue.300");
    const contentBoxBg = useColorModeValue("gray.50", "gray.700");
    const contentBoxBorder = useColorModeValue("gray.200", "gray.600");
    const skillBoxBg = useColorModeValue("blue.50", "blue.900");
    const skillBoxBorder = useColorModeValue("blue.200", "blue.700");
    const editButtonBg = useColorModeValue("gray.100", "gray.700");
    const editButtonColor = useColorModeValue("gray.700", "gray.200");
    const editButtonHoverBg = useColorModeValue("gray.200", "gray.600");
    const approvalBg = useColorModeValue("green.50", "green.900");
    const approvalBorder = useColorModeValue("green.200", "green.700");
    const approvalTextColor = useColorModeValue("green.800", "green.200");
    const approvalMutedColor = useColorModeValue("green.600", "green.400");
    const approvalButtonBg = useColorModeValue("green.500", "green.600");
    const approvalButtonHoverBg = useColorModeValue("green.600", "green.500");
    const denyButtonBg = useColorModeValue("red.500", "red.600");
    const denyButtonHoverBg = useColorModeValue("red.600", "red.500");

    // Determine if this is a confirmation log
    const isConfirmation = log?.type === "ask_for_plan_approval";

    // Focus the skill name input when editing
    useEffect(() => {
        if (editingSkill && skillNameInputRef.current) {
            skillNameInputRef.current.focus();
        }
    }, [editingSkill]);

    // Fetch tasks when log changes and has a task_id
    useEffect(() => {
        if (log?.task_id) {
            fetchTaskById(log.task_id);
        } else if (log?.plan_id) {
            fetchTasksByPlanId(log.plan_id);
        }
    }, [log]);

    // Function to fetch a task by ID
    const fetchTaskById = async (taskId: string) => {
        setIsLoadingTasks(true);
        try {
            const response = await fetch(`/api/plan/get_task?taskId=${taskId}`);
            if (response.ok) {
                const data = await response.json();
                setTasks(Array.isArray(data) ? data : [data]);
            } else {
                console.error("Failed to fetch task:", await response.text());
                setTasks([]);
            }
        } catch (error) {
            console.error("Error fetching task:", error);
            setTasks([]);
        } finally {
            setIsLoadingTasks(false);
        }
    };

    // Function to fetch tasks by plan ID
    const fetchTasksByPlanId = async (planId: string) => {
        setIsLoadingTasks(true);
        try {
            const response = await fetch(`/api/plan/get_tasks?planId=${planId}`);
            if (response.ok) {
                const data = await response.json();
                setTasks(data);
            } else {
                console.error("Failed to fetch tasks:", await response.text());
                setTasks([]);
            }
        } catch (error) {
            console.error("Error fetching tasks:", error);
            setTasks([]);
        } finally {
            setIsLoadingTasks(false);
        }
    };

    // Format the content for display
    const getFormattedContent = () => {
        if (!log) return "";

        // For approval logs, try to parse and format the content
        if (log.type === "ask_for_plan_approval") {
            try {
                // Replace single quotes with double quotes to make it valid JSON
                const jsonString = log.content.replace(/'/g, '"').replace(/None/g, 'null');
                const contentData = JSON.parse(jsonString);
                if (Array.isArray(contentData) && contentData.length > 0) {
                    return JSON.stringify(contentData, null, 2);
                }
            } catch (error) {
                console.error("Error parsing content:", error);
            }
        }

        return log.content;
    };

    // Get plan details from the content
    const getPlanDetailsFromContent = () => {
        if (!log || !isConfirmation) return null;

        try {
            // Replace single quotes with double quotes and Python None with JSON null
            const jsonString = log.content
                .replace(/'/g, '"')
                .replace(/None/g, 'null');

            const contentData = JSON.parse(jsonString);
            if (Array.isArray(contentData) && contentData.length > 0) {
                const skillData = contentData[0];
                const skillName = skillData.skill_name || skillData.tool_name;
                if ((skillName === 'approve_plan') && skillData.args?.plan_id?.value) {
                    return {
                        planId: skillData.args.plan_id.value,
                        skillName: skillName,
                        server: skillData.mcp_server,
                        description: skillData.description?.trim() || t("no_description_available")
                    };
                }
            }
        } catch (error) {
            console.error("Error parsing plan details:", error);
        }

        return null;
    };

    const planDetails = getPlanDetailsFromContent();

    const handleEditSkill = (skill: any) => {
        setEditingSkill(skill);

        // Initialize form values
        setSkillName(skill.name || skill.skill_name || skill.tool_name || '');
        setSkillExplanation(skill.description || '');

        // Initialize skill parameters
        const newSkillParams: Record<string, any> = {};
        const newParamTypes: Record<string, string> = {};

        if (skill.args) {
            Object.entries(skill.args).forEach(([key, value]) => {
                // Check if the value is in the augmented format
                if (value && typeof value === 'object' && 'value' in value && 'type' in value) {
                    newSkillParams[key] = value.value;
                    newParamTypes[key] = value.type as string;
                } else {
                    newSkillParams[key] = value;
                    newParamTypes[key] = 'unknown';
                }
            });
        }

        setToolParams(newSkillParams);
        setParamTypes(newParamTypes);
    };

    const handleSaveSkill = async () => {
        // Validate form
        const newErrors: Record<string, string> = {};
        if (!skillName.trim()) {
            newErrors.skillName = t("skill_name_required");
        }
        if (!skillExplanation.trim()) {
            newErrors.skillExplanation = t("skill_explanation_required");
        }

        if (Object.keys(newErrors).length > 0) {
            setErrors(newErrors);
            return;
        }

        setIsSubmitting(true);

        try {
            // Create updated skill object
            const updatedSkill = {
                ...editingSkill,
                name: skillName.trim(),
                skill_name: skillName.trim(),
                tool_name: skillName.trim(),
                description: skillExplanation.trim(),
                args: {}
            };

            // Format parameters based on their types
            Object.entries(toolParams).forEach(([key, value]) => {
                const paramType = paramTypes[key] || 'unknown';

                // Format value based on type
                let formattedValue: any = value;
                if (paramType === 'number') {
                    formattedValue = Number(value);
                } else if (paramType === 'boolean') {
                    formattedValue = value === 'true' || value === true;
                } else if (paramType === 'object' || paramType === 'array') {
                    try {
                        formattedValue = JSON.parse(value);
                    } catch (e) {
                        formattedValue = value;
                    }
                }

                // Use the augmented format
                updatedSkill.args[key] = {
                    value: formattedValue,
                    type: paramType
                };
            });

            // Update the task with the new skill
            if (log?.task_id) {
                const response = await fetch(`/api/plan/update_task`, {
                    method: 'PUT',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        task_id: log.task_id,
                        skills: updatedSkill
                    }),
                });

                if (!response.ok) {
                    throw new Error(`Failed to update task: ${response.statusText}`);
                }

                // Show success message
                // toaster.toast({
                //     title: t("skill_updated"),
                //     description: t("skill_updated_description"),
                //     variant: "success",
                // });

                // Reset form and close edit mode
                setEditingSkill(null);
                setErrors({});

                // Refresh tasks
                if (log.task_id) {
                    fetchTaskById(log.task_id);
                } else if (log.plan_id) {
                    fetchTasksByPlanId(log.plan_id);
                }

                // Notify parent component
                if (onSkillUpdated) {
                    onSkillUpdated();
                }
            } else {
                throw new Error("No task ID available for update");
            }
        } catch (error) {
            console.error("Error updating skill:", error);
            // toaster.toast({
            //     title: t("error"),
            //     description: t("skill_update_error"),
            //     variant: "destructive",
            // });
        } finally {
            setIsSubmitting(false);
        }
    };

    // Handle parameter change
    const handleParamChange = (key: string, value: string) => {
        setToolParams(prev => ({
            ...prev,
            [key]: value
        }));
    };

    // Render the skill edit form
    const renderSkillEditForm = () => {
        if (!editingSkill) return null;

        return (
            <Stack gap={4}>
                <Field.Root invalid={!!errors.skillName}>
                    <Field.Label color={textColorStrong}>{t("skill_name")}</Field.Label>
                    <Input
                        color={textColor}
                        bg={inputBg}
                        ref={skillNameInputRef}
                        type="text"
                        value={skillName}
                        onChange={(e) => setSkillName(e.target.value)}
                        placeholder={t("enter_skill_name")}
                        required
                        _placeholder={{ color: inputPlaceholderColor }}
                        _focus={{ borderColor: inputFocusBorderColor }}
                    />
                    {errors.skillName && <Field.ErrorText>{errors.skillName}</Field.ErrorText>}
                </Field.Root>

                <Field.Root invalid={!!errors.skillExplanation}>
                    <Field.Label color={textColorStrong}>{t("skill_explanation")}</Field.Label>
                    <Textarea
                        color={textColor}
                        bg={inputBg}
                        value={skillExplanation}
                        onChange={(e) => setSkillExplanation(e.target.value)}
                        placeholder={t("enter_skill_explanation")}
                        required
                        _placeholder={{ color: inputPlaceholderColor }}
                        _focus={{ borderColor: inputFocusBorderColor }}
                        rows={4}
                    />
                    {errors.skillExplanation && <Field.ErrorText>{errors.skillExplanation}</Field.ErrorText>}
                </Field.Root>

                {editingSkill.args && Object.keys(editingSkill.args).length > 0 && (
                    <Box mt={2}>
                        <Text fontSize="xs" fontWeight="bold" color={textColorMuted} mb={1}>
                            {t("parameters")}:
                        </Text>
                        <Stack gap={2}>
                            {Object.entries(editingSkill.args).map(([key, value]) => {
                                // Determine if value is in the augmented format
                                const isAugmented = value && typeof value === 'object' && 'value' in value && 'type' in value;
                                const paramValue = isAugmented ? (value as any).value : value;
                                const paramType = isAugmented ? (value as any).type : 'unknown';

                                // Format the display value based on type
                                let displayValue = paramValue;
                                if (typeof paramValue === 'object') {
                                    displayValue = JSON.stringify(paramValue);
                                }

                                return (
                                    <Field.Root key={key}>
                                        <Field.Label color={textColorStrong} fontSize="xs">
                                            {key}
                                            {paramType !== 'unknown' && (
                                                <Badge ml={1} fontSize="2xs" colorScheme="blue">
                                                    {paramType}
                                                </Badge>
                                            )}
                                        </Field.Label>
                                        <Input
                                            color={textColor}
                                            bg={inputBg}
                                            size="sm"
                                            value={toolParams[key] !== undefined ? toolParams[key] : displayValue}
                                            onChange={(e) => handleParamChange(key, e.target.value)}
                                            _placeholder={{ color: inputPlaceholderColor }}
                                            _focus={{ borderColor: inputFocusBorderColor }}
                                        />
                                    </Field.Root>
                                );
                            })}
                        </Stack>
                    </Box>
                )}
            </Stack>
        );
    };

    return (
        <Dialog.Root open={isOpen} onOpenChange={onClose}>
            <Portal>
                <Dialog.Positioner>
                    <Dialog.Content
                        bg={bgColor}
                        borderColor={borderColor}
                        maxWidth="600px"
                        width="90%"
                    >
                        <Dialog.Header bg={headerBg} borderBottomWidth="1px" borderBottomColor={borderColor}>
                            <Dialog.Title color={textColorStrong}>
                                {editingSkill ? t("edit_skill") : t("log_details")}
                            </Dialog.Title>
                            <Dialog.CloseTrigger />
                        </Dialog.Header>

                        <Dialog.Body>
                            {editingSkill ? (
                                renderSkillEditForm()
                            ) : (
                                log ? (
                                    <Stack gap={4}>
                                        {/* Log Type */}
                                        <Box>
                                            <Text fontWeight="medium" color={textColorStrong} mb={1}>
                                                {t("log_type")}
                                            </Text>
                                            <Badge colorScheme={
                                                log.type === "plan_created" ? "green" :
                                                    log.type === "plan_completed" ? "blue" :
                                                        log.type === "plan_failed" ? "red" :
                                                            log.type === "ask_for_plan_approval" ? "yellow" :
                                                                "gray"
                                            }>
                                                {t(log.type)}
                                            </Badge>
                                        </Box>

                                        {/* Timestamp */}
                                        <Box>
                                            <Text fontWeight="medium" color={textColorStrong} mb={1}>
                                                {t("timestamp")}
                                            </Text>
                                            <Text fontSize="sm" color={textColor}>
                                                {new Date(log.created_at).toLocaleString(locale)}
                                            </Text>
                                        </Box>

                                        {/* Plan Approval Section */}
                                        {isConfirmation && planDetails && (
                                            <Box>
                                                <Text fontWeight="medium" color={textColorStrong} mb={2}>
                                                    {t("plan_approval")}
                                                </Text>
                                                <Box
                                                    p={4}
                                                    borderRadius="md"
                                                    bg={approvalBg}
                                                    border="1px"
                                                    borderColor={approvalBorder}
                                                >
                                                    <Stack gap={2}>
                                                        <Box>
                                                            <Text fontSize="xs" color={approvalMutedColor} fontWeight="medium">
                                                                {t("plan_id")}:
                                                            </Text>
                                                            <Text fontSize="sm" color={approvalTextColor} fontFamily="monospace">
                                                                {planDetails.planId}
                                                            </Text>
                                                        </Box>

                                                        {planDetails.server && (
                                                            <Box>
                                                                <Text fontSize="xs" color={approvalMutedColor} fontWeight="medium">
                                                                    {t("server")}:
                                                                </Text>
                                                                <Text fontSize="sm" color={approvalTextColor}>
                                                                    {planDetails.server}
                                                                </Text>
                                                            </Box>
                                                        )}

                                                        <Box>
                                                            <Text fontSize="xs" color={approvalMutedColor} fontWeight="medium">
                                                                {t("description")}:
                                                            </Text>
                                                            <Text fontSize="sm" color={approvalTextColor} whiteSpace="pre-wrap">
                                                                {planDetails.description}
                                                            </Text>
                                                        </Box>

                                                        <Text fontSize="sm" color={approvalTextColor} mt={2}>
                                                            {t("approve_plan_message")}
                                                        </Text>
                                                    </Stack>
                                                </Box>
                                            </Box>
                                        )}

                                        {/* Tasks Section */}
                                        {isLoadingTasks ? (
                                            <Box textAlign="center" py={4}>
                                                <Text fontSize="sm" color={textColorMuted}>{t("loading_tasks")}</Text>
                                            </Box>
                                        ) : tasks.length > 0 ? (
                                            <Box>
                                                <Text fontWeight="medium" color={textColorStrong} mb={2}>
                                                    {t("tasks")}
                                                </Text>
                                                <Box
                                                    p={4}
                                                    borderRadius="md"
                                                    bg={skillBoxBg}
                                                    border="1px"
                                                    borderColor={skillBoxBorder}
                                                >
                                                    <Stack gap={3}>
                                                        {tasks.map((task, index) => (
                                                            <Box key={index} position="relative">
                                                                <SkillInfo
                                                                    task={task}
                                                                    colors={colors}
                                                                    t={t}
                                                                    showDetails={true}
                                                                />
                                                                {task.skills && (
                                                                    <Button
                                                                        size="xs"
                                                                        position="absolute"
                                                                        top={2}
                                                                        right={2}
                                                                        onClick={() => handleEditSkill(task.skills)}
                                                                        bg={editButtonBg}
                                                                        color={editButtonColor}
                                                                        _hover={{ bg: editButtonHoverBg }}
                                                                    >
                                                                        {t("edit")}
                                                                    </Button>
                                                                )}
                                                            </Box>
                                                        ))}
                                                    </Stack>
                                                </Box>
                                            </Box>
                                        ) : null}

                                        {/* Content (only show if not a confirmation or if we couldn't parse details) */}
                                        {(!isConfirmation || !planDetails) && (
                                            <Box>
                                                <Text fontWeight="medium" color={textColorStrong} mb={2}>
                                                    {t("content")}
                                                </Text>
                                                <Box
                                                    p={4}
                                                    borderRadius="md"
                                                    bg={contentBoxBg}
                                                    border="1px"
                                                    borderColor={contentBoxBorder}
                                                >
                                                    <Text
                                                        color={textColor}
                                                        whiteSpace="pre-wrap"
                                                        fontSize="sm"
                                                    >
                                                        {getFormattedContent()}
                                                    </Text>
                                                </Box>
                                            </Box>
                                        )}

                                        {/* Related Task */}
                                        {log.task_id && (
                                            <Box>
                                                <Text fontWeight="medium" color={textColorStrong} mb={1}>
                                                    {t("related_task")}
                                                </Text>
                                                <Badge
                                                    colorScheme="purple"
                                                    fontSize="sm"
                                                    fontFamily="monospace"
                                                >
                                                    {log.task_id}
                                                </Badge>
                                            </Box>
                                        )}
                                    </Stack>
                                ) : (
                                    <Text color={textColorMuted}>{t("no_log_selected")}</Text>
                                )
                            )}
                        </Dialog.Body>

                        <Dialog.Footer borderTopWidth="1px" borderTopColor={borderColor}>
                            {editingSkill ? (
                                <Flex justify="space-between" width="100%">
                                    <Button
                                        variant="outline"
                                        onClick={() => {
                                            setEditingSkill(null);
                                            setErrors({});
                                        }}
                                    >
                                        {t("cancel")}
                                    </Button>
                                    <Button
                                        colorScheme="blue"
                                        onClick={handleSaveSkill}
                                        loading={isSubmitting}
                                    >
                                        {t("save_changes")}
                                    </Button>
                                </Flex>
                            ) : (
                                <Flex justify="space-between" width="100%">
                                    <Button variant="outline" onClick={onClose}>
                                        {t("close")}
                                    </Button>

                                    {isConfirmation && planDetails && onApprove && onDeny && (
                                        <Flex gap={2}>
                                            <Button
                                                colorScheme="red"
                                                bg={denyButtonBg}
                                                _hover={{ bg: denyButtonHoverBg }}
                                                onClick={() => onDeny(planDetails.planId)}
                                            >
                                                {t("deny")}
                                            </Button>
                                            <Button
                                                colorScheme="green"
                                                bg={approvalButtonBg}
                                                _hover={{ bg: approvalButtonHoverBg }}
                                                onClick={() => onApprove(planDetails.planId)}
                                            >
                                                {t("approve")}
                                            </Button>
                                        </Flex>
                                    )}
                                </Flex>
                            )}
                        </Dialog.Footer>
                    </Dialog.Content>
                </Dialog.Positioner>
            </Portal>
        </Dialog.Root>
    );
} 