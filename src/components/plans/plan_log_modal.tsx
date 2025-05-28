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
    Spinner,
    IconButton,
    HStack,
    Heading,
    Skeleton,
} from '@chakra-ui/react';
import { useParams } from "next/navigation";
import NextLink from "next/link";
import SkillInfo from './skill_info';
import { toaster } from "@/components/ui/toaster"
import { FaTools } from "react-icons/fa";
import { useColorModeValue } from "@/components/ui/color-mode";
import { FiChevronUp, FiChevronDown } from "react-icons/fi";
import { usePlansColors } from "@/utils/colors";
import { PlanLog } from "@/types/plan";
import { useSelector } from 'react-redux';
import { RootState } from '@/store/store';


interface PlanLogModalProps {
    isOpen: boolean;
    onClose: () => void;
    onCloseComplete?: () => void;
    log: PlanLog | null;
    colors?: any;
    onApprove?: (log: PlanLog) => void;
    onDeny?: (log: PlanLog) => void;
    onSkillUpdated?: () => void;
    taskDetails?: any;
    isLoadingTask?: boolean;
    formattedContent?: string;
    planData?: any;
    isLoadingPlan?: boolean;
}

export default function PlanLogModal({
    isOpen,
    onClose,
    onCloseComplete,
    log,
    colors,
    onApprove,
    onDeny,
    onSkillUpdated,
    taskDetails,
    isLoadingTask = false,
    formattedContent,
    planData,
    isLoadingPlan = false
}: PlanLogModalProps) {
    const t = useTranslations("Plans");
    const params = useParams();
    const locale = params.locale as string || 'en';
    const currentTeam = useSelector((state: RootState) => state.user.currentTeam);

    // Use the plans colors hook for consistent styling
    const plansColors = usePlansColors();

    // Use the colors from props or fall back to the plans colors
    const textColorHeading = colors?.textColorHeading || plansColors.textColorHeading;
    const textColorStrong = colors?.textColorStrong || plansColors.textColorHeading;
    const textColor = colors?.textColor || plansColors.textColor;
    const textColorMuted = colors?.textColorMuted || plansColors.textColorMuted;
    const borderColor = colors?.borderColor || plansColors.borderColor;
    const accentColor = colors?.accentColor || plansColors.accentColor;
    const cardBg = colors?.cardBg || plansColors.cardBg;
    const inputBg = colors?.inputBg || plansColors.inputBg;

    // Move all color mode value hooks to the top level
    const approvalBoxBg = useColorModeValue("orange.50", "orange.900");
    const approvalBoxBorder = useColorModeValue("orange.200", "orange.700");
    const approvalTextColor = textColorHeading;
    const approvalMutedColor = textColor;
    const contentBoxBg = colors?.bgSubtle || plansColors.bgSubtle;
    const placeholderColor = textColorMuted;
    const taskDescriptionBg = plansColors.subtleSelectedItemBg;
    const buttonBgColor = plansColors.buttonBgColor;
    const buttonHoverBgColor = plansColors.buttonHoverBgColor;
    const selectedItemBg = plansColors.selectedItemBg;
    const focusRingColor = plansColors.focusRingColor;
    const codeBackgroundColor = useColorModeValue('gray.100', 'gray.700');

    // Add these new color values at the top level
    const jsonItemBg = useColorModeValue('gray.50', 'gray.700');

    // For gradient backgrounds in CSS
    const gradientStartColor = useColorModeValue('rgba(66, 153, 225, 0.1)', 'rgba(66, 153, 225, 0.05)');
    const inputPlaceholderColor = useColorModeValue("gray.500", "gray.400");

    const isConfirmation = log?.type === "approval_requested";

    // State hooks
    const [editingSkill, setEditingSkill] = useState<any>(null);
    const [skillName, setSkillName] = useState('');
    const [skillExplanation, setSkillExplanation] = useState('');
    const [toolParams, setToolParams] = useState<Record<string, any>>({});
    const [paramTypes, setParamTypes] = useState<Record<string, string>>({});
    const [isLoading, setIsLoading] = useState(false);
    const [errors, setErrors] = useState<{ skillName?: string; skillExplanation?: string }>({});
    const [fetchedSkills, setFetchedSkills] = useState<Record<string, any>>({});
    const [isLoadingSkillDetails, setIsLoadingSkillDetails] = useState(false);
    const [expandedSkills, setExpandedSkills] = useState<Set<string>>(new Set());
    const [editingMultipleSkills, setEditingMultipleSkills] = useState(false);
    const [currentSkillIndex, setCurrentSkillIndex] = useState(0);

    // Ref hooks
    const skillNameInputRef = useRef<HTMLInputElement>(null);

    // Effect hooks
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
                    if (toolData.name === 'approve_plan' && toolData.args?.plan_id?.value) {
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

    // Update the useEffect to better understand the structure
    useEffect(() => {
        if (isOpen && log) {
            console.log("Log data:", log);
            console.log("Task details:", taskDetails);
            if (taskDetails?.skills) {
                // Don't use Object.keys on an array, just log the array directly
                console.log("Task details skills array:", taskDetails.skills);
                console.log("Is skills an array?", Array.isArray(taskDetails.skills));
                console.log("Skills content:", taskDetails.skills);

                // Try to access the first skill ID directly
                if (Array.isArray(taskDetails.skills) && taskDetails.skills.length > 0) {
                    console.log("First skill ID:", taskDetails.skills[0]);
                }
            }
        }
    }, [isOpen, log, taskDetails]);

    // Add effect to fetch skill details when task details are available
    useEffect(() => {
        if (taskDetails?.skills && Array.isArray(taskDetails.skills) && taskDetails.skills.length > 0) {
            const fetchSkillDetails = async () => {
                setIsLoadingSkillDetails(true);
                const skillsData: Record<string, any> = {};

                for (const skillId of taskDetails.skills) {
                    try {
                        const response = await fetch(`/api/skill/get_skill?id=${skillId}`);
                        if (response.ok) {
                            const data = await response.json();
                            skillsData[skillId] = data.skill;
                        }
                    } catch (error) {
                        console.error(`Error fetching skill ${skillId}:`, error);
                    }
                }

                setFetchedSkills(skillsData);
                setIsLoadingSkillDetails(false);
            };

            fetchSkillDetails();
        }
    }, [taskDetails]);

    const getShortId = (id: string): string => {
        return id.length > 8 ? id.substring(0, 8) : id;
    };

    const handleCloseModal = () => {
        onClose();
    };

    const handleApprove = () => {
        console.log("Handling approve", log?.plan_id, onApprove);
        if (log?.plan_id && onApprove) {
            onApprove(log);
            onClose();
        }
    };

    const handleDeny = () => {
        if (log?.plan_id && onDeny) {
            onDeny(log);
            onClose();
        }
    };


    // Handle edit skill - update to properly handle skill array
    const handleEditSkill = (skill: any) => {
        console.log("Editing skill:", skill);

        // If skill is an array of skill IDs, we need to fetch all skills
        if (Array.isArray(skill) && skill.length > 0) {
            // We already have the skills in fetchedSkills, so we can use that
            if (Object.keys(fetchedSkills).length > 0) {
                // Get the first skill to initialize the form
                const firstSkillId = Object.keys(fetchedSkills)[0];
                const firstSkill = fetchedSkills[firstSkillId];

                // Initialize with the first skill, but mark that we're editing multiple
                initializeSkillForm(firstSkill, firstSkillId);

                // Set a flag or state to indicate we're editing multiple skills
                setEditingMultipleSkills(true);
            } else {
                // If fetchedSkills is empty, fetch the first skill
                const fetchSkillDetails = async () => {
                    try {
                        const response = await fetch(`/api/skill/get_skill?id=${skill[0]}`);
                        if (response.ok) {
                            const data = await response.json();
                            console.log("Fetched skill details:", data.skill);
                            initializeSkillForm(data.skill, skill[0]);
                        }
                    } catch (error) {
                        console.error("Error fetching skill details:", error);
                    }
                };

                fetchSkillDetails();
            }
            return;
        }

        // Otherwise, initialize with the provided skill object
        initializeSkillForm(skill);
    };

    // Helper to initialize the skill form
    const initializeSkillForm = (skill: any, skillId?: string) => {
        console.log("Initializing skill form with:", skill);

        if (skillId) {
            skill.id = skillId; // Ensure the ID is set
        }

        setEditingSkill(skill);

        // Initialize form values
        setSkillName(skill.name || skill.tool_name || '');
        setSkillExplanation(skill.description || '');

        // Initialize skill parameters with proper type detection for new format
        const newSkillParams: Record<string, any> = {};
        const newParamTypes: Record<string, string> = {};

        if (skill.args) {
            console.log("Skill args:", skill.args);

            Object.entries(skill.args).forEach(([key, value]) => {
                // Check if the value is in the new enhanced format with type information
                if (value && typeof value === 'object' && 'value' in value && 'type' in value) {
                    console.log(`Parameter ${key} has explicit type:`, value.type);
                    newSkillParams[key] = value.value;
                    newParamTypes[key] = value.type as string;
                } else {
                    // Handle the old format or direct values
                    newSkillParams[key] = value;

                    if (value === null) {
                        newParamTypes[key] = 'null';
                    } else if (Array.isArray(value)) {
                        newParamTypes[key] = 'array';
                    } else if (typeof value === 'object') {
                        newParamTypes[key] = 'object';
                    } else {
                        newParamTypes[key] = typeof value;
                    }

                    console.log(`Parameter ${key} inferred type:`, newParamTypes[key]);
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
        setEditingMultipleSkills(false);
        setCurrentSkillIndex(0);
    };

    const validateForm = () => {
        const newErrors: { skillName?: string; skillExplanation?: string } = {};

        if (!skillName) {
            newErrors.skillName = t('name_required');
        }

        if (!skillExplanation) {
            newErrors.skillExplanation = t('skill_explanation_required');
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSaveSkill = async () => {
        if (!validateForm()) {
            return;
        }

        setIsLoading(true);

        try {
            // Format the args back to the enhanced structure
            const enhancedArgs: Record<string, any> = {};

            Object.entries(toolParams).forEach(([key, value]) => {
                enhancedArgs[key] = {
                    value: value,
                    type: paramTypes[key] || 'unknown',
                    title: key,
                    description: ''
                };
            });

            const updatedSkill = {
                ...editingSkill,
                name: skillName,
                description: skillExplanation,
                args: enhancedArgs
            };

            console.log("Saving updated skill:", updatedSkill);

            // Make API call to update the skill
            const response = await fetch('/api/skill/update_skill', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    skillId: editingSkill.id,
                    skill: updatedSkill
                }),
            });

            if (!response.ok) {
                throw new Error(`Failed to update skill: ${response.statusText}`);
            }

            const result = await response.json();
            console.log("Skill update result:", result);

            // Update the local state with the updated skill
            if (taskDetails && taskDetails.skills) {
                const updatedSkills = { ...fetchedSkills };
                updatedSkills[editingSkill.id] = updatedSkill;
                setFetchedSkills(updatedSkills);
            }

            // If we're not editing multiple skills, reset editing state
            if (!editingMultipleSkills) {
                setEditingSkill(null);
                if (onSkillUpdated) {
                    onSkillUpdated();
                }
            }

            // Show success message


        } catch (error) {
            console.error("Error updating skill:", error);

        } finally {
            setIsLoading(false);
        }
    };

    // Function to save all skills and exit edit mode
    const handleSaveAllSkills = async () => {
        // First save the current skill
        await handleSaveSkill();

        // Then exit edit mode
        setEditingSkill(null);
        setEditingMultipleSkills(false);
        setCurrentSkillIndex(0);

        if (onSkillUpdated) {
            onSkillUpdated();
        }
    };

    // Handle parameter change
    const handleParamChange = (key: string, value: string) => {
        setToolParams(prev => ({
            ...prev,
            [key]: value
        }));
    };

    // Toggle skill expansion
    const toggleSkillExpansion = (skillId: string) => {
        setExpandedSkills(prev => {
            const newSet = new Set(prev);
            if (newSet.has(skillId)) {
                newSet.delete(skillId);
            } else {
                newSet.add(skillId);
            }
            return newSet;
        });
    };

    // Render the task details section with skills
    const renderTaskDetails = () => {
        if (!taskDetails) return null;

        // Ensure skills is properly handled as an array
        const skillsArray = taskDetails.skills ?
            (Array.isArray(taskDetails.skills) ? taskDetails.skills : []) : [];

        // Create a task object with the fetched skills for SkillInfo component
        const taskWithSkills = {
            ...taskDetails,
            skills: Object.values(fetchedSkills)
        };

        return (
            <Box>
                <Text fontWeight="semibold" color={textColorStrong} mb={1}>
                    {t("task_details")}
                </Text>
                <Box
                    p={3}
                    borderRadius="md"
                    bg={contentBoxBg}
                    border="1px"
                    borderColor={borderColor}
                >
                    <Stack gap={3}>
                        {taskDetails.task_name && (
                            <Text fontWeight="semibold" color={textColorStrong}>
                                {taskDetails.task_name}
                            </Text>
                        )}

                        {taskDetails.task_explanation && (
                            <Text
                                color={textColor}
                                whiteSpace="pre-wrap"
                                p={2}
                                bg={taskDescriptionBg}
                                borderRadius="md"
                            >
                                {taskDetails.task_explanation}
                            </Text>
                        )}

                        {/* Expected Result */}
                        {taskDetails.expected_result && (
                            <Box>
                                <Text fontSize="sm" fontWeight="semibold" color={textColorStrong}>
                                    {t("expected_result")}:
                                </Text>
                                <Text fontSize="sm" color={textColor}>
                                    {taskDetails.expected_result}
                                </Text>
                            </Box>
                        )}

                        {/* Skills Section */}
                        {skillsArray.length > 0 && (
                            <Box>
                                <Flex justify="space-between" align="center" mb={2}>
                                    <Text fontSize="sm" fontWeight="semibold" color={textColorStrong}>
                                        {t("skills")}:
                                    </Text>
                                    <Button
                                        size="xs"
                                        colorScheme="blue"
                                        onClick={() => handleEditSkill(skillsArray)}
                                    >
                                        {t("edit")}
                                    </Button>
                                </Flex>

                                {isLoadingSkillDetails ? (
                                    <Flex justify="center" py={4}>
                                        <Spinner size="md" color={accentColor} />
                                    </Flex>
                                ) : Object.keys(fetchedSkills).length > 0 ? (
                                    <SkillInfo
                                        task={taskWithSkills}
                                        colors={colors || {
                                            textColorHeading,
                                            textColorStrong,
                                            textColor,
                                            textColorMuted,
                                            borderColor,
                                            accentColor,
                                            cardBg,
                                            bgSubtle: contentBoxBg
                                        }}
                                        t={t}
                                        showDetails={true}
                                    />
                                ) : (
                                    <Text color={textColorMuted}>{t("no_skills_found")}</Text>
                                )}
                            </Box>
                        )}

                        {/* Task Status and Timestamps */}
                        <Flex direction="column" gap={1} fontSize="sm" color={textColorMuted}>
                            <Text>
                                {t("status")}: {taskDetails.status || t("not_started")}
                            </Text>
                            {taskDetails.created_at && (
                                <Text>
                                    {t("created")}: {new Date(taskDetails.created_at).toLocaleString()}
                                </Text>
                            )}
                            {taskDetails.completed_at && (
                                <Text>
                                    {t("completed")}: {new Date(taskDetails.completed_at).toLocaleString()}
                                </Text>
                            )}
                        </Flex>
                    </Stack>
                </Box>
            </Box>
        );
    };

    // Update the Plan Overview section to use the planOverview from the log if available
    const getPlanOverview = () => {
        // First try to use planOverview directly from the log
        if (log?.planOverview) {
            return log.planOverview;
        }

        // Fall back to planData if available
        if (planData?.plan_overview) {
            return planData.plan_overview;
        }

        if (log?.content) {
            return log.content;
        }

        return null;
    };

    // Function to navigate to the next skill when editing multiple skills
    const handleNextSkill = async () => {
        // First save the current skill
        await handleSaveSkill();

        // Then move to the next skill
        const skillIds = Object.keys(fetchedSkills);
        const nextIndex = (currentSkillIndex + 1) % skillIds.length;
        setCurrentSkillIndex(nextIndex);

        // Initialize the form with the next skill
        const nextSkillId = skillIds[nextIndex];
        const nextSkill = fetchedSkills[nextSkillId];
        initializeSkillForm(nextSkill, nextSkillId);
    };

    // Function to navigate to the previous skill when editing multiple skills
    const handlePrevSkill = async () => {
        // First save the current skill
        await handleSaveSkill();

        // Then move to the previous skill
        const skillIds = Object.keys(fetchedSkills);
        const prevIndex = (currentSkillIndex - 1 + skillIds.length) % skillIds.length;
        setCurrentSkillIndex(prevIndex);

        // Initialize the form with the previous skill
        const prevSkillId = skillIds[prevIndex];
        const prevSkill = fetchedSkills[prevSkillId];
        initializeSkillForm(prevSkill, prevSkillId);
    };

    // Add this helper function to detect and parse JSON content
    const tryParseJSON = (content: string) => {
        try {
            return JSON.parse(content);
        } catch (e) {
            return null;
        }
    };

    // Update the renderJsonContent function to use the pre-defined color values
    const renderJsonContent = (jsonData: any) => {
        if (!jsonData) return null;

        if (Array.isArray(jsonData)) {
            return (
                <Stack gap={3}>
                    {jsonData.map((item, index) => (
                        <Box
                            key={index}
                            p={3}
                            borderRadius="md"
                            bg={jsonItemBg} // Use the pre-defined color value
                            borderWidth="1px"
                            borderColor={borderColor}
                        >
                            {typeof item === 'object' ? renderJsonContent(item) : (
                                <Text color={textColor}>{String(item)}</Text>
                            )}
                        </Box>
                    ))}
                </Stack>
            );
        }

        return (
            <Stack gap={2}>
                {Object.entries(jsonData).map(([key, value]) => (
                    <Box key={key}>
                        <Text fontWeight="semibold" fontSize="sm" color={textColorStrong}>
                            {key}:
                        </Text>
                        {typeof value === 'object' ? (
                            <Box pl={4} borderLeftWidth="2px" borderColor={accentColor} mt={1}>
                                {renderJsonContent(value)}
                            </Box>
                        ) : (
                            <Text color={textColor} pl={4}>
                                {String(value)}
                            </Text>
                        )}
                    </Box>
                ))}
            </Stack>
        );
    };

    return (
        <Dialog.Root
            open={isOpen}
            onOpenChange={handleCloseModal}
            initialFocusEl={() => editingSkill ? skillNameInputRef.current : null}>
            <Portal>
                <Dialog.Backdrop />
                <Dialog.Positioner>
                    <Dialog.Content
                        maxWidth="800px"
                        width="90vw"
                        maxHeight="calc(100vh - 80px)"
                        overflow="hidden"
                        bg={cardBg}
                        borderColor={borderColor}
                        boxShadow={plansColors.cardShadow}
                    >
                        <Dialog.Header borderBottomColor={borderColor}>
                            <Dialog.Title color={textColorHeading}>
                                {editingSkill ? t("edit_skill") : (log?.planName || t("plan_log_details"))}
                            </Dialog.Title>
                            <Dialog.CloseTrigger />
                        </Dialog.Header>

                        <Dialog.Body overflowY="auto" maxHeight="calc(100vh - 200px)">
                            {isLoadingTask ? (
                                <Flex justify="center" align="center" py={8}>
                                    <Spinner size="lg" color={accentColor} />
                                </Flex>
                            ) : editingSkill ? (
                                <Stack gap={4}>
                                    {/* Add navigation controls when editing multiple skills */}
                                    {editingMultipleSkills && (
                                        <Flex justify="space-between" align="center" mb={2}>
                                            <Text color={textColorStrong} fontWeight="medium">
                                                {t("editing_skill")} {currentSkillIndex + 1} {t("of")} {Object.keys(fetchedSkills).length}
                                            </Text>
                                            <HStack gap={2}>
                                                <IconButton
                                                    aria-label={t("previous_skill")}
                                                    size="sm"
                                                    onClick={handlePrevSkill}
                                                    disabled={isLoading}
                                                >
                                                    <Icon as={FiChevronUp} />
                                                </IconButton>
                                                <IconButton
                                                    aria-label={t("next_skill")}
                                                    // icon={<FiChevronDown />}
                                                    size="sm"
                                                    onClick={handleNextSkill}
                                                    disabled={isLoading}
                                                >
                                                    <Icon as={FiChevronDown} />
                                                </IconButton>
                                            </HStack>
                                        </Flex>
                                    )}

                                    <Field.Root invalid={!!errors.skillName}>
                                        <Field.Label color={textColorStrong}>{t("name")}</Field.Label>
                                        <Input
                                            color={textColor}
                                            bg={inputBg}
                                            borderColor={plansColors.inputBorder}
                                            _focus={{ borderColor: plansColors.inputBorder, boxShadow: `0 0 0 1px ${focusRingColor}` }}
                                            ref={skillNameInputRef}
                                            type="text"
                                            value={skillName}
                                            onChange={(e) => setSkillName(e.target.value)}
                                            placeholder={t("enter_name")}
                                            required
                                            _placeholder={{ color: placeholderColor }}
                                        />
                                        {errors.skillName && <Field.ErrorText>{errors.skillName}</Field.ErrorText>}
                                    </Field.Root>

                                    <Field.Root invalid={!!errors.skillExplanation}>
                                        <Field.Label color={textColorStrong}>{t("skill_explanation")}</Field.Label>
                                        <Textarea
                                            color={textColor}
                                            bg={inputBg}
                                            borderColor={plansColors.inputBorder}
                                            _focus={{ borderColor: plansColors.inputBorder, boxShadow: `0 0 0 1px ${focusRingColor}` }}
                                            value={skillExplanation}
                                            onChange={(e) => setSkillExplanation(e.target.value)}
                                            placeholder={t("enter_skill_explanation")}
                                            required
                                            _placeholder={{ color: placeholderColor }}
                                            rows={4}
                                        />
                                        {errors.skillExplanation && <Field.ErrorText>{errors.skillExplanation}</Field.ErrorText>}
                                    </Field.Root>

                                    {editingSkill.args && Object.keys(editingSkill.args).length > 0 && (
                                        <Box mt={2}>
                                            <Text fontSize="sm" fontWeight="medium" color={textColorStrong} mb={2}>
                                                {t("parameters")}
                                            </Text>
                                            <Stack gap={2}>
                                                {Object.entries(editingSkill.args).map(([key, value]) => {
                                                    // Extract value and type if in augmented format
                                                    const isAugmented = value && typeof value === 'object' && 'value' in value && 'type' in value;
                                                    const displayValue = isAugmented ? value.value : value;
                                                    const paramType = isAugmented ? value.type as string : 'unknown';

                                                    // Check if this is an array type
                                                    const isArray = paramType === 'array';

                                                    // Check if this is the mcp_server parameter
                                                    const isMcpServer = key === 'mcp_server';

                                                    return (
                                                        <Field.Root key={key}>
                                                            <Flex justifyContent="space-between" alignItems="center" mb={1}>
                                                                <Field.Label fontSize="sm" color={textColorStrong}>
                                                                    {isMcpServer ? "skill (server)" : key}
                                                                </Field.Label>
                                                                <Badge size="sm" colorScheme="blue">{paramType}</Badge>
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
                                                                        bg={inputBg}
                                                                        borderColor={plansColors.inputBorder}
                                                                        _focus={{ borderColor: plansColors.inputBorder, boxShadow: `0 0 0 1px ${focusRingColor}` }}
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
                                                                    bg={inputBg}
                                                                    borderColor={plansColors.inputBorder}
                                                                    _focus={{ borderColor: plansColors.inputBorder, boxShadow: `0 0 0 1px ${focusRingColor}` }}
                                                                    _placeholder={{ color: inputPlaceholderColor }}
                                                                />
                                                            )}
                                                        </Field.Root>
                                                    );
                                                })}
                                            </Stack>
                                        </Box>
                                    )}
                                </Stack>
                            ) : (
                                log ? (
                                    <Stack gap={4}>
                                        {/* Log Header */}
                                        <Flex justify="space-between" align="center">
                                            <Badge
                                                colorScheme={log.type === 'approval_requested' ? 'orange' : 'blue'}
                                                px={2}
                                                py={1}
                                                borderRadius="md"
                                            >
                                                {log.type === 'approval_requested' ? t("approval_requested") : t(log.type || "log")}
                                            </Badge>
                                            {log.created_at && (
                                                <Text fontSize="sm" color={textColorMuted}>
                                                    {new Date(log.created_at).toLocaleString()}
                                                </Text>
                                            )}
                                        </Flex>

                                        {/* Plan Info with Link */}
                                        {log.planName && (
                                            <Box>
                                                <Text fontWeight="semibold" color={textColorStrong} mb={1}>
                                                    {t("plan")}
                                                </Text>
                                                <Box
                                                    p={3}
                                                    borderRadius="md"
                                                    bg={contentBoxBg}
                                                    border="1px"
                                                    borderColor={borderColor}
                                                >
                                                    <Flex justify="space-between" align="center">
                                                        <Text fontWeight="semibold" color={textColorStrong}>
                                                            {log.planName}
                                                        </Text>
                                                        <Flex gap={2} align="center">
                                                            {log.planShortId && (
                                                                <Badge
                                                                    size="sm"
                                                                    colorScheme="blue"
                                                                    variant="outline"
                                                                    fontFamily="monospace"
                                                                >
                                                                    {log.planShortId}
                                                                </Badge>
                                                            )}
                                                            {log.plan_id && (
                                                                <Link
                                                                    as={NextLink}
                                                                    href={`/${locale}/${currentTeam?.id}/plans/${log.plan_id}`}
                                                                    _hover={{ textDecoration: 'none' }}
                                                                >
                                                                    <Badge
                                                                        colorScheme="orange"
                                                                        fontSize="sm"
                                                                        cursor="pointer"
                                                                        _hover={{ bg: 'orange.200' }}
                                                                    >
                                                                        {t("open_plan")}
                                                                    </Badge>
                                                                </Link>
                                                            )}
                                                        </Flex>
                                                    </Flex>
                                                </Box>
                                            </Box>
                                        )}

                                        {/* Plan Overview */}
                                        <Box>
                                            <Text fontWeight="semibold" color={textColorStrong} mb={1}>
                                                {t("plan_overview")}
                                            </Text>
                                            <Box
                                                p={3}
                                                borderRadius="md"
                                                bg={contentBoxBg}
                                                border="1px"
                                                borderColor={borderColor}
                                                boxShadow="sm"
                                                transition="all 0.2s"
                                                _hover={{ boxShadow: "md" }}
                                            >
                                                {isLoadingPlan ? (
                                                    <Spinner size="sm" color={accentColor} />
                                                ) : getPlanOverview() ? (
                                                    <Text
                                                        color={textColor}
                                                        whiteSpace="pre-wrap"
                                                        css={{
                                                            lineHeight: "1.6",
                                                            fontSize: "0.95rem",
                                                            fontFamily: "system-ui, sans-serif",
                                                            '& strong, & b': { color: textColorStrong, fontWeight: "600" },
                                                            '& ul, & ol': { paddingLeft: '1.5rem', marginY: '0.5rem' },
                                                            '& li': { marginY: '0.25rem' },
                                                            '& code': {
                                                                bg: codeBackgroundColor,
                                                                px: 1,
                                                                py: 0.5,
                                                                borderRadius: 'sm',
                                                                fontSize: '0.9em',
                                                                fontFamily: 'monospace'
                                                            },
                                                            '& pre': {
                                                                bg: codeBackgroundColor,
                                                                p: 2,
                                                                borderRadius: 'md',
                                                                overflowX: 'auto',
                                                                my: 2
                                                            },
                                                            '& p': { marginY: '0.5rem' },
                                                            '& a': { color: accentColor, textDecoration: 'underline', _hover: { opacity: 0.8 } },
                                                            '& *:has(span[data-special="true"])': {
                                                                display: 'inline-block',
                                                                position: 'relative',
                                                                padding: '0.25rem 0.5rem',
                                                                margin: '0.25rem 0',
                                                                borderLeft: `3px solid ${accentColor}`,
                                                                background: `linear-gradient(to right, ${gradientStartColor}, transparent)`,
                                                                borderRadius: '0.25rem',
                                                                fontStyle: 'italic',
                                                                animation: 'pulse-glow 2s infinite',
                                                            },
                                                            '@keyframes pulse-glow': {
                                                                '0%': {
                                                                    boxShadow: '0 0 3px rgba(66, 153, 225, 0.2)',
                                                                    transform: 'scale(1)'
                                                                },
                                                                '50%': {
                                                                    boxShadow: '0 0 12px rgba(66, 153, 225, 0.6), 0 0 20px rgba(66, 153, 225, 0.3)',
                                                                    transform: 'scale(1.02)'
                                                                },
                                                                '100%': {
                                                                    boxShadow: '0 0 3px rgba(66, 153, 225, 0.2)',
                                                                    transform: 'scale(1)'
                                                                }
                                                            }
                                                        }}
                                                        dangerouslySetInnerHTML={{
                                                            __html: getPlanOverview()?.replace(
                                                                /\|Onvl([^|]*)\|/g,
                                                                '<span data-special="true" style="font-weight:bold;color:' + accentColor + ';background-color:rgba(66, 153, 225, 0.15);padding:3px 6px;border-radius:4px;border:1px solid ' + accentColor + ';">✨ $1 ✨</span>'
                                                            ) || ''
                                                        }}
                                                    />
                                                ) : (
                                                    <Text color={textColorMuted}>
                                                        {t("no_plan_overview_available")}
                                                    </Text>
                                                )}
                                            </Box>
                                        </Box>

                                        {/* Log Content */}
                                        {log.content && log.content !== getPlanOverview() && (
                                            <Box>
                                                <Text fontWeight="semibold" color={textColorStrong} mb={1}>
                                                    {t("log_content")}
                                                </Text>
                                                <Box
                                                    p={3}
                                                    borderRadius="md"
                                                    bg={contentBoxBg}
                                                    border="1px"
                                                    borderColor={borderColor}
                                                    boxShadow="sm"
                                                    transition="all 0.2s"
                                                    _hover={{ boxShadow: "md" }}
                                                >
                                                    {(() => {
                                                        // Try to parse as JSON first
                                                        const jsonData = tryParseJSON(log.content);

                                                        if (jsonData) {
                                                            // If it's valid JSON, render it in a structured way
                                                            return renderJsonContent(jsonData);
                                                        } else if (log.content) {
                                                            // If there's formatted content, use that
                                                            return (
                                                                <Text
                                                                    color={textColor}
                                                                    whiteSpace="pre-wrap"
                                                                    css={{
                                                                        lineHeight: "1.6",
                                                                        fontSize: "0.95rem",
                                                                        fontFamily: "system-ui, sans-serif",
                                                                        '& strong, & b': { color: textColorStrong, fontWeight: "600" },
                                                                        '& ul, & ol': { paddingLeft: '1.5rem', marginY: '0.5rem' },
                                                                        '& li': { marginY: '0.25rem' },
                                                                        '& code': {
                                                                            bg: codeBackgroundColor,
                                                                            px: 1,
                                                                            py: 0.5,
                                                                            borderRadius: 'sm',
                                                                            fontSize: '0.9em',
                                                                            fontFamily: 'monospace'
                                                                        },
                                                                        '& pre': {
                                                                            bg: codeBackgroundColor,
                                                                            p: 2,
                                                                            borderRadius: 'md',
                                                                            overflowX: 'auto',
                                                                            my: 2
                                                                        }
                                                                    }}
                                                                    dangerouslySetInnerHTML={{ __html: log.content }}
                                                                />
                                                            );
                                                        } else {
                                                            // Otherwise, just show the raw content
                                                            return (
                                                                <Text
                                                                    color={textColor}
                                                                    whiteSpace="pre-wrap"
                                                                    css={{
                                                                        lineHeight: "1.6",
                                                                        fontSize: "0.95rem",
                                                                        fontFamily: "system-ui, sans-serif",
                                                                        '& strong, & b': { color: textColorStrong, fontWeight: "600" },
                                                                        '& ul, & ol': { paddingLeft: '1.5rem', marginY: '0.5rem' },
                                                                        '& li': { marginY: '0.25rem' },
                                                                        '& code': {
                                                                            bg: codeBackgroundColor,
                                                                            px: 1,
                                                                            py: 0.5,
                                                                            borderRadius: 'sm',
                                                                            fontSize: '0.9em',
                                                                            fontFamily: 'monospace'
                                                                        },
                                                                        '& pre': {
                                                                            bg: codeBackgroundColor,
                                                                            p: 2,
                                                                            borderRadius: 'md',
                                                                            overflowX: 'auto',
                                                                            my: 2
                                                                        }
                                                                    }}
                                                                >
                                                                    {log.content}
                                                                </Text>
                                                            );
                                                        }
                                                    })()}
                                                </Box>
                                            </Box>
                                        )}

                                        {/* Add Separator before Task Details if both plan and task info exist */}
                                        {(log.planName || getPlanOverview()) && (log.task_id || taskDetails) && (
                                            <Separator my={4} borderColor={borderColor} />
                                        )}

                                        {/* Task ID if available */}
                                        {log.task_id && (
                                            <Box>
                                                <Text fontWeight="semibold" color={textColorStrong} mb={1}>
                                                    {t("task_id")}
                                                </Text>
                                                <Box
                                                    p={3}
                                                    borderRadius="md"
                                                    bg={contentBoxBg}
                                                    border="1px"
                                                    borderColor={borderColor}
                                                >
                                                    <Badge
                                                        size="sm"
                                                        colorScheme="purple"
                                                        variant="outline"
                                                        fontFamily="monospace"
                                                    >
                                                        {log.task_id}
                                                    </Badge>
                                                </Box>
                                            </Box>
                                        )}

                                        {/* Task Details Section */}
                                        {renderTaskDetails()}


                                    </Stack>
                                ) : (
                                    <Text color={textColorMuted}>{t("no_log_selected")}</Text>
                                )
                            )}
                        </Dialog.Body>

                        <Dialog.Footer borderTopColor={borderColor}>
                            {editingSkill ? (
                                <Stack direction="row" gap={4} width="100%">
                                    <Button
                                        onClick={handleCancelEdit}
                                        variant="outline"
                                        flex="1"
                                        borderColor={borderColor}
                                        color={textColor}
                                        _hover={{ bg: buttonHoverBgColor }}
                                    >
                                        {t("cancel")}
                                    </Button>
                                    {editingMultipleSkills ? (
                                        <>
                                            <Button
                                                onClick={handleNextSkill}
                                                colorScheme="blue"
                                                variant="outline"
                                                flex="1"
                                                borderColor={plansColors.blueBgColor}
                                                color={plansColors.blueBgColor}
                                                _hover={{ bg: buttonHoverBgColor }}
                                                loading={isLoading}
                                            >
                                                {t("save_and_next")}
                                            </Button>
                                            <Button
                                                onClick={handleSaveAllSkills}
                                                colorScheme="blue"
                                                flex="1"
                                                bg={plansColors.blueBgColor}
                                                _hover={{ bg: plansColors.blueHoverBgColor }}
                                                loading={isLoading}
                                            >
                                                {t("save_all")}
                                            </Button>
                                        </>
                                    ) : (
                                        <Button
                                            onClick={handleSaveSkill}
                                            colorScheme="blue"
                                            flex="1"
                                            loading={isLoading}
                                            bg={plansColors.blueBgColor}
                                            _hover={{ bg: plansColors.blueHoverBgColor }}
                                        >
                                            {t("save")}
                                        </Button>
                                    )}
                                </Stack>
                            ) : isConfirmation ? (
                                <Stack direction="row" gap={4} width="100%">
                                    <Button
                                        onClick={handleDeny}
                                        colorScheme="red"
                                        variant="outline"
                                        flex="1"
                                        borderColor={plansColors.redBgColor}
                                        color={plansColors.redBgColor}
                                        _hover={{ bg: buttonHoverBgColor }}
                                    >
                                        {t("deny")}
                                    </Button>
                                    <Button
                                        onClick={handleApprove}
                                        colorScheme="green"
                                        flex="1"
                                        bg={plansColors.greenBgColor}
                                        _hover={{ bg: plansColors.greenHoverBgColor }}
                                    >
                                        {t("approve")}
                                    </Button>
                                    <Button
                                        onClick={onClose}
                                        variant="ghost"
                                        ml={2}
                                        color={textColor}
                                        _hover={{ bg: buttonHoverBgColor }}
                                    >
                                        {t("close")}
                                    </Button>
                                </Stack>
                            ) : (
                                <Button
                                    onClick={onClose}
                                    colorScheme="blue"
                                    bg={plansColors.blueBgColor}
                                    _hover={{ bg: plansColors.blueHoverBgColor }}
                                >
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