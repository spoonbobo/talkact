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
    const t = useTranslations("Plans");
    const params = useParams();
    const locale = params.locale as string || 'en';

    // Enhanced colors with dark mode support - using more user-friendly colors
    // aligned with the Knowledge Base and Plans color schemes
    const textColorHeading = colors?.textColorHeading || useColorModeValue("gray.800", "gray.100");
    const textColorStrong = colors?.textColorStrong || useColorModeValue("gray.700", "gray.300");
    const textColor = colors?.textColor || useColorModeValue("gray.600", "gray.400");
    const textColorMuted = colors?.textColorMuted || useColorModeValue("gray.500", "gray.500");
    const borderColor = colors?.borderColor || useColorModeValue("gray.200", "gray.700");
    const accentColor = colors?.accentColor || "blue.500";
    const cardBg = colors?.cardBg || useColorModeValue("white", "gray.800");
    const inputBg = colors?.inputBg || useColorModeValue("white", "gray.700");

    // Approval section colors - warmer orange tones for approval actions
    const approvalBoxBg = useColorModeValue("orange.50", "rgba(251, 211, 141, 0.15)");
    const approvalBoxBorder = useColorModeValue("orange.200", "orange.700");
    const approvalTextColor = useColorModeValue("gray.800", "gray.100");
    const approvalMutedColor = useColorModeValue("gray.600", "gray.400");

    // Content box with subtle blue tint in light mode, darker gray in dark mode
    const contentBoxBg = useColorModeValue("rgba(235, 248, 255, 0.6)", "gray.750");
    const contentBoxBorder = useColorModeValue("blue.100", "gray.600");

    // Skill section colors
    const skillBoxBg = useColorModeValue("rgba(240, 247, 255, 0.8)", "rgba(45, 55, 72, 0.5)");
    const skillBoxBorder = useColorModeValue("blue.200", "blue.800");

    // Button colors
    const editButtonBg = useColorModeValue("blue.50", "blue.900");
    const editButtonColor = useColorModeValue("blue.600", "blue.300");
    const editButtonHoverBg = useColorModeValue("blue.100", "blue.800");

    // Form field focus colors
    const inputFocusBorderColor = useColorModeValue("blue.400", "blue.300");
    const inputPlaceholderColor = useColorModeValue("gray.400", "gray.500");

    const isConfirmation = log?.type === "ask_for_plan_approval";

    const [editingSkill, setEditingSkill] = useState<any>(null);
    const [skillName, setSkillName] = useState('');
    const [skillExplanation, setSkillExplanation] = useState('');
    const [toolParams, setToolParams] = useState<Record<string, any>>({});
    const [paramTypes, setParamTypes] = useState<Record<string, string>>({});
    const [isLoading, setIsLoading] = useState(false);
    const [errors, setErrors] = useState<{ skillName?: string; skillExplanation?: string }>({});
    const skillNameInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (isOpen && log) {
            console.log("Log type:", log.type);
            console.log("Is confirmation:", isConfirmation);
            console.log("Has plan_id:", !!log.plan_id);
        }
    }, [isOpen, log, isConfirmation]);

    // Parse the plan_id from the content if it's a confirmation log
    useEffect(() => {
        if (isOpen && log && isConfirmation && !log.plan_id) {
            try {
                // Try to parse the content as JSON
                const contentData = JSON.parse(log.content);
                if (Array.isArray(contentData) && contentData.length > 0) {
                    const toolData = contentData[0];
                    if (toolData.skill_name === 'approve_plan' && toolData.args?.plan_id?.value) {
                        // Set the plan_id from the parsed content
                        log.plan_id = toolData.args.plan_id.value;
                        console.log("Extracted plan_id:", log.plan_id);
                    }
                }
            } catch (error) {
                console.error("Error parsing log content:", error);
            }
        }
    }, [isOpen, log, isConfirmation]);

    const getLogTypeBadge = (type: string) => {
        let colorScheme = "blue";

        switch (type) {
            case "ask_for_plan_approval":
                colorScheme = "orange";
                break;
            case "plan_created":
                colorScheme = "green";
                break;
            case "plan_completed":
                colorScheme = "green";
                break;
            case "plan_failed":
                colorScheme = "red";
                break;
            case "task_completed":
                colorScheme = "teal";
                break;
            case "task_failed":
                colorScheme = "red";
                break;
            default:
                colorScheme = "blue";
        }

        return (
            <Badge
                colorScheme={colorScheme}
                fontSize="sm"
                px={2}
                py={0.5}
                borderRadius="md"
                textTransform="uppercase"
            >
                {t(type)}
            </Badge>
        );
    };

    const getShortId = (uuid?: string) => uuid ? uuid.split('-')[0] : '';

    const handleCloseModal = () => {
        onClose();
    };

    const handleApprove = () => {
        if (log?.plan_id && onApprove) {
            onApprove(log.plan_id);
            onClose();
        }
    };

    const handleDeny = () => {
        if (log?.plan_id && onDeny) {
            onDeny(log.plan_id);
            onClose();
        }
    };

    // Format the content for display
    const getFormattedContent = () => {
        if (!log) return "";

        if (isConfirmation) {
            try {
                // Replace single quotes with double quotes and Python None with JSON null
                const jsonString = log.content
                    .replace(/'/g, '"')
                    .replace(/None/g, 'null');

                const contentData = JSON.parse(jsonString);
                if (Array.isArray(contentData) && contentData.length > 0) {
                    const skillData = contentData[0];

                    // Create a user-friendly message
                    if (skillData.skill_name === 'approve_plan' || skillData.tool_name === 'approve_plan') {
                        // Return a more human-readable message
                        const planIdValue = skillData.args?.plan_id?.value || "Unknown";
                        const serverValue = skillData.mcp_server || "Unknown server";
                        return t("approval_needed_for_plan", {
                            planId: planIdValue,
                            server: serverValue
                        });
                    }

                    // Fallback to description if available
                    if (skillData.description) {
                        return skillData.description.trim();
                    }
                }
            } catch (error) {
                // If parsing fails, return the original content
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
        setSkillName(skill.name || skill.skill_name || '');
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

    const handleCancelEdit = () => {
        setEditingSkill(null);
        setSkillName('');
        setSkillExplanation('');
        setToolParams({});
        setParamTypes({});
        setErrors({});
    };

    const validateForm = () => {
        const newErrors: { skillName?: string; skillExplanation?: string } = {};

        if (!skillName) {
            newErrors.skillName = t('skill_name_required');
        }

        if (!skillExplanation) {
            newErrors.skillExplanation = t('skill_explanation_required');
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSaveSkill = async () => {
        if (!validateForm() || !editingSkill) {
            return;
        }

        setIsLoading(true);
        try {
            // Prepare augmented parameters with type information
            const augmentedParams: Record<string, any> = {};
            Object.entries(toolParams).forEach(([key, value]) => {
                augmentedParams[key] = {
                    value: value,
                    type: paramTypes[key] || 'unknown'
                };
            });

            const skillData = {
                skill_id: editingSkill.id || editingSkill.skill_id,
                plan_id: log?.plan_id || '',
                name: skillName,
                description: skillExplanation,
                args: augmentedParams,
                skill_name: editingSkill.skill_name || editingSkill.tool_name || editingSkill.name
            };
            console.log("Skill data to be sent:", skillData);

            const response = await fetch('/api/plan/update_skill', {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(skillData),
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || t('failed_to_update_skill'));
            }

            toaster.create({
                title: t("skill_updated"),
                description: t("skill_updated_successfully"),
                duration: 3000,
            });

            // Call the onSkillUpdated callback to refresh skills
            if (onSkillUpdated) {
                onSkillUpdated();
            }

            handleCancelEdit();
        } catch (error) {
            console.error('Error saving skill:', error);
            toaster.create({
                title: t("error"),
                description: error instanceof Error ? error.message : t("failed_to_update_skill"),
                duration: 5000,
            });
        } finally {
            setIsLoading(false);
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
                                // Extract value and type if in augmented format
                                const isAugmented = value && typeof value === 'object' && 'value' in value && 'type' in value;
                                const paramType = isAugmented ? value.type as string : 'unknown';

                                // Check if this is an array type
                                const isArray = paramType === 'array';

                                return (
                                    <Field.Root key={key}>
                                        <Flex justifyContent="space-between" alignItems="center" mb={1}>
                                            <Field.Label fontSize="sm" color={textColorStrong}>{key}</Field.Label>
                                            <Badge size="sm" colorScheme="blue">{paramType}</Badge>
                                        </Flex>
                                        {isArray ? (
                                            <>
                                                <Textarea
                                                    size="sm"
                                                    bg={inputBg}
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
                                                    placeholder={t('enter_array_as_json')}
                                                    _placeholder={{ color: inputPlaceholderColor }}
                                                    _focus={{ borderColor: inputFocusBorderColor }}
                                                    rows={3}
                                                />
                                                <Text fontSize="xs" color={textColorMuted} mt={1}>
                                                    {t("enter_array_as_json_example")}
                                                </Text>
                                            </>
                                        ) : (
                                            <Input
                                                size="sm"
                                                bg={inputBg}
                                                value={toolParams[key] || ''}
                                                onChange={(e) => handleParamChange(key, e.target.value)}
                                                color={textColor}
                                                _focus={{ borderColor: inputFocusBorderColor }}
                                            />
                                        )}
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
        <Dialog.Root open={isOpen} onOpenChange={handleCloseModal}>
            <Portal>
                <Dialog.Backdrop />
                <Dialog.Positioner>
                    <Dialog.Content
                        maxWidth="600px"
                        maxHeight="calc(100vh - 40px)"
                        overflow="hidden"
                        bg={cardBg}
                        borderColor={borderColor}
                        boxShadow="lg"
                    >
                        <Dialog.Header>
                            <Dialog.Title color={textColorHeading}>
                                {editingSkill ? t("edit_skill") : (log?.planName || t("plan_log_details"))}
                            </Dialog.Title>
                            <Dialog.CloseTrigger />
                        </Dialog.Header>

                        <Dialog.Body overflowY="auto" maxHeight="calc(100vh - 160px)">
                            {editingSkill ? (
                                renderSkillEditForm()
                            ) : (
                                log ? (
                                    <Stack gap={4}>
                                        {/* Log Type */}
                                        <Box>
                                            <Text fontWeight="medium" color={textColorStrong} mb={1}>
                                                {t("type")}
                                            </Text>
                                            {log.type && getLogTypeBadge(log.type)}
                                        </Box>

                                        {/* Plan ID with Link */}
                                        {log.planShortId && (
                                            <Box>
                                                <Text fontWeight="medium" color={textColorStrong} mb={1}>
                                                    {t("plan_id")}
                                                </Text>
                                                {(log.type === "plan_created" || log.type === "ask_for_plan_approval") && log.planNavId ? (
                                                    <Link
                                                        as={NextLink}
                                                        href={`/${locale}/plans/${log.planNavId}`}
                                                        _hover={{ textDecoration: 'none' }}
                                                    >
                                                        <Badge
                                                            colorScheme="blue"
                                                            fontSize="sm"
                                                            fontFamily="monospace"
                                                            cursor="pointer"
                                                            _hover={{ bg: 'blue.100', color: 'blue.700' }}
                                                        >
                                                            {log.planNavId} {log.type === "plan_created" ? `(${t("open_plan")})` : ''}
                                                        </Badge>
                                                    </Link>
                                                ) : (
                                                    <Badge
                                                        colorScheme="gray"
                                                        fontSize="sm"
                                                        fontFamily="monospace"
                                                    >
                                                        {log.planNavId}
                                                    </Badge>
                                                )}
                                            </Box>
                                        )}

                                        {/* Timestamp */}
                                        <Box>
                                            <Text fontWeight="medium" color={textColorStrong} mb={1}>
                                                {t("timestamp")}
                                            </Text>
                                            <Text color={textColor}>
                                                {new Date(log.created_at).toLocaleString()}
                                            </Text>
                                        </Box>

                                        <Separator my={2} />

                                        {/* Plan Approval Details */}
                                        {isConfirmation && planDetails && (
                                            <Box>
                                                <Text fontWeight="medium" color={textColorStrong} mb={1}>
                                                    {t("approval_request")}
                                                </Text>
                                                <Box
                                                    p={4}
                                                    borderRadius="md"
                                                    bg={approvalBoxBg}
                                                    border="1px"
                                                    borderColor={approvalBoxBorder}
                                                >
                                                    <Stack gap={3}>
                                                        <Text color={approvalTextColor} fontSize="sm" fontWeight="medium">
                                                            {t("plan_requires_approval")}
                                                        </Text>

                                                        <Box>
                                                            <Text fontSize="xs" color={approvalMutedColor} fontWeight="medium">
                                                                {t("plan_id")}:
                                                            </Text>
                                                            <Badge
                                                                colorScheme="orange"
                                                                fontSize="sm"
                                                                fontFamily="monospace"
                                                            >
                                                                {planDetails.planId}
                                                            </Badge>
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

                                        {/* Skills Section */}
                                        {log.skills && log.skills.length > 0 && (
                                            <Box>
                                                <Text fontWeight="medium" color={textColorStrong} mb={2}>
                                                    {t("skills")}
                                                </Text>
                                                <Box
                                                    p={4}
                                                    borderRadius="md"
                                                    bg={skillBoxBg}
                                                    border="1px"
                                                    borderColor={skillBoxBorder}
                                                >
                                                    <Stack gap={3}>
                                                        {log.skills.map((skill, index) => (
                                                            <Box key={index} position="relative">
                                                                <SkillInfo
                                                                    task={{
                                                                        skill: skill,
                                                                        plan_id: log.plan_id || '',
                                                                        task_name: '',
                                                                        status: '',
                                                                        step_number: 0
                                                                    }}
                                                                    colors={colors}
                                                                    t={t}
                                                                    showDetails={true}
                                                                />
                                                                <Button
                                                                    size="xs"
                                                                    position="absolute"
                                                                    top={2}
                                                                    right={2}
                                                                    onClick={() => handleEditSkill(skill)}
                                                                    bg={editButtonBg}
                                                                    color={editButtonColor}
                                                                    _hover={{ bg: editButtonHoverBg }}
                                                                >
                                                                    {t("edit")}
                                                                </Button>
                                                            </Box>
                                                        ))}
                                                    </Stack>
                                                </Box>
                                            </Box>
                                        )}

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

                        <Dialog.Footer>
                            {editingSkill ? (
                                <Stack direction="row" gap={4} width="100%">
                                    <Button
                                        onClick={handleCancelEdit}
                                        variant="outline"
                                        flex="1"
                                    >
                                        {t("cancel")}
                                    </Button>
                                    <Button
                                        onClick={handleSaveSkill}
                                        colorScheme="blue"
                                        flex="1"
                                        loading={isLoading}
                                    >
                                        {t("save")}
                                    </Button>
                                </Stack>
                            ) : isConfirmation ? (
                                <Stack direction="row" gap={4} width="100%">
                                    <Button
                                        onClick={handleDeny}
                                        colorScheme="red"
                                        variant="outline"
                                        flex="1"
                                    >
                                        {t("deny")}
                                    </Button>
                                    <Button
                                        onClick={handleApprove}
                                        colorScheme="green"
                                        flex="1"
                                    >
                                        {t("approve")}
                                    </Button>
                                </Stack>
                            ) : (
                                <Button onClick={onClose} colorScheme="blue">
                                    {t("close")}
                                </Button>
                            )}
                        </Dialog.Footer>
                    </Dialog.Content>
                </Dialog.Positioner>
            </Portal>
        </Dialog.Root>
    );
} 