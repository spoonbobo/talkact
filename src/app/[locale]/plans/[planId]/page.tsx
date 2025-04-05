"use client";

import { useTranslations } from "next-intl";
import { useSelector, useDispatch } from 'react-redux';
import { RootState, AppDispatch } from "@/store/store";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Box, Heading, Flex, Spinner, Badge, Text, VStack, Table, Center, Grid, GridItem, Icon, HStack, IconButton, Circle } from "@chakra-ui/react";
import { FaCheck, FaTools, FaStop } from "react-icons/fa";
import { Tooltip } from "@/components/ui/tooltip";
import { fetchTasks, selectPlan, approvePlan } from "@/store/features/planSlice";
import { usePlansColors } from "@/utils/colors";
import { IPlan, ITask } from "@/types/plan";
import { Progress } from "@chakra-ui/react";
import StatusBadge, { getStatusColorScheme } from "@/components/ui/StatusBadge";
import { FiRefreshCw, FiServer } from "react-icons/fi";
import { fetchPlans } from "@/store/features/planSlice";
import axios from "axios";
import { Code } from "@chakra-ui/react";

// Use typed dispatch
const useAppDispatch = () => useDispatch<AppDispatch>();

// Format date for display
const formatDate = (date: Date | null): string => {
    if (!date) return 'N/A';
    return new Date(date).toLocaleString(undefined, {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
};

export default function PlanDetailsPage() {
    const t = useTranslations("Plans");
    const params = useParams();
    const planId = params?.planId as string;
    const dispatch = useAppDispatch();
    const [isLoading, setIsLoading] = useState(false);

    const { plans, tasks, loading, error, currentTaskId } = useSelector(
        (state: RootState) => state.plan
    );

    const colors = usePlansColors();

    // Find the current plan
    const currentPlan = plans.find(plan => plan.id === planId) as IPlan | undefined;

    // Get the current task if currentTaskId is not null
    const currentTask = currentTaskId !== null ? tasks[currentTaskId] : null;

    const handlePlanApproval = async (plan: IPlan | undefined, task: ITask | null) => {
        console.log("handlePlanApproval", plan, task, !plan);
        if (!plan) return;
        const url = `/api/mcp/request_mcp`;

        // Create a deep copy of the plan
        const planCopy = JSON.parse(JSON.stringify(plan));

        // Log the original context structure
        console.log("Original context:", planCopy.context);

        // Create a new context object with all required fields
        const newContext = {
            plan: planCopy.context?.plan || {},
            plan_name: planCopy.plan_name,
            plan_overview: planCopy.plan_overview,
            query: planCopy.context?.query || [],
            conversations: planCopy.context?.conversations || []
        };

        // Replace the context with our new one
        planCopy.context = newContext;

        // Log the modified context to verify
        console.log("Modified context:", planCopy.context);

        const mcp_request = {
            task: task,
            plan: planCopy
        };

        // Log the full request payload
        console.log("Full request payload:", JSON.stringify(mcp_request, null, 2));

        try {
            const response = await axios.post(url, mcp_request);
            console.log("Success response:", response);
        } catch (error) {
            if (axios.isAxiosError(error) && error.response) {
                console.error('Error requesting MCP:', error.response.status, error.response.data);
                // console.error('Request data sent:', error.config.data);
                try {
                    // const sentData = JSON.parse(error.config.data);
                    // console.error('Parsed request data:', sentData);
                    // console.error('Context in sent data:', sentData.plan.context);
                } catch (parseError) {
                    console.error('Could not parse request data:', parseError);
                }
            } else {
                console.error('Error requesting MCP:', error);
            }
        }
    };

    // Fetch tasks on component mount
    useEffect(() => {
        if (planId) {
            dispatch(selectPlan(planId));
            setIsLoading(true);
            dispatch(fetchTasks(planId))
                .finally(() => setIsLoading(false));
        }
    }, [dispatch, planId]);

    if (!currentPlan) {
        return (
            <Center height="100%" p={8}>
                <Spinner size="lg" color={colors.accentColor} />
            </Center>
        );
    }

    return (
        <Box p={6} height="100%" position="relative">
            {/* Floating buttons at top right */}
            <HStack
                gap={2}
                position="absolute"
                top={6}
                right={6}
                zIndex={10}
                bg={colors.cardBg}
                p={2}
                borderRadius="md"
                boxShadow="sm"
            >
                <Tooltip content={t("approve_plan")}>
                    <IconButton
                        aria-label="approve"
                        size="sm"
                        colorScheme="green"
                        variant="ghost"
                        loading={isLoading || loading.tasks}
                        disabled={currentPlan.status === 'success' || currentPlan.status === 'terminated'}
                        onClick={async () => {
                            setIsLoading(true);
                            try {
                                // First update the plan status to running
                                const response = await fetch('/api/plan/update_plan', {
                                    method: 'PUT',
                                    headers: {
                                        'Content-Type': 'application/json',
                                    },
                                    body: JSON.stringify({
                                        plan_id: currentPlan.plan_id,
                                        status: 'running'
                                    }),
                                });

                                if (response.ok) {
                                    // Refresh plans to get updated status
                                    await dispatch(fetchPlans());
                                    // Then handle the MCP request
                                    await handlePlanApproval(currentPlan, currentTask as ITask | null);
                                } else {
                                    console.error('Failed to approve plan');
                                }
                            } catch (error) {
                                console.error('Error approving plan:', error);
                            } finally {
                                setIsLoading(false);
                            }
                        }}
                        _hover={{ bg: "green.50", color: colors.greenBgColor }}
                    >
                        <Icon as={FaCheck} color={colors.textColor} />
                    </IconButton>
                </Tooltip>
                <Tooltip content={t("deny_plan")}>
                    <IconButton
                        aria-label="deny"
                        size="sm"
                        colorScheme="red"
                        variant="ghost"
                        loading={isLoading || loading.tasks}
                        disabled={currentPlan.status === 'success' || currentPlan.status === 'terminated'}
                        onClick={async () => {
                            setIsLoading(true);
                            try {
                                const response = await fetch('/api/plan/update_plan', {
                                    method: 'PUT',
                                    headers: {
                                        'Content-Type': 'application/json',
                                    },
                                    body: JSON.stringify({
                                        plan_id: currentPlan.plan_id,
                                        status: 'terminated'
                                    }),
                                });

                                if (response.ok) {
                                    // Refresh both plans and tasks after successful update
                                    await dispatch(fetchPlans());
                                    await dispatch(fetchTasks(currentPlan.id));
                                } else {
                                    console.error('Failed to deny plan');
                                }
                            } catch (error) {
                                console.error('Error denying plan:', error);
                            } finally {
                                setIsLoading(false);
                            }
                        }}
                        _hover={{ bg: "red.50", color: colors.redBgColor }}
                    >
                        <Icon as={FaStop} color={colors.textColor} />
                    </IconButton>
                </Tooltip>
                <Tooltip content={t("refresh")}>
                    <IconButton
                        aria-label="synchronize"
                        size="sm"
                        colorScheme="blue"
                        variant="ghost"
                        loading={isLoading || loading.tasks}
                        onClick={() => {
                            setIsLoading(true);
                            // Refresh both plans and tasks
                            Promise.all([
                                dispatch(fetchPlans()),
                                dispatch(fetchTasks(planId))
                            ])
                                .finally(() => setIsLoading(false));
                        }}
                        _hover={{ bg: "blue.50", color: colors.blueBgColor }}
                    >
                        <Icon as={FiRefreshCw} color={colors.textColor} />
                    </IconButton>
                </Tooltip>
            </HStack>

            <Flex justify="space-between" mb={6}>
                <Box>
                    <Heading size="md" mb={2} color={colors.textColorHeading}>{currentPlan.plan_name}</Heading>
                    <Flex align="center" mb={2}>
                        <StatusBadge status={currentPlan.status} mr={3} />
                        <HStack width="200px" mr={2} flex="1">
                            <Progress.Root
                                value={currentPlan.progress}
                                size="sm"
                                colorScheme={getStatusColorScheme(currentPlan.status)}
                                borderRadius="full"
                            >
                                <Progress.Track>
                                    <Progress.Range />
                                </Progress.Track>
                            </Progress.Root>
                            <Text fontSize="sm" fontWeight="bold" color={colors.textColor}>
                                {currentPlan.progress}%
                            </Text>
                        </HStack>
                    </Flex>

                    <Box mb={3}>
                        <Text fontSize="xs" color={colors.textColorMuted}>{t("plan_overview")}:</Text>
                        <Text fontSize="sm" color={colors.textColor}>{currentPlan.plan_overview}</Text>
                    </Box>

                    <Grid templateColumns="repeat(2, 1fr)" gap={4} mt={4}>
                        <GridItem>
                            <Text fontSize="xs" color={colors.textColorMuted}>{t("assigner")}:</Text>
                            <Text fontSize="sm">{currentPlan.assigner}</Text>
                        </GridItem>
                        <GridItem>
                            <Text fontSize="xs" color={colors.textColorMuted}>{t("assignee")}:</Text>
                            <Text fontSize="sm">{currentPlan.assignee}</Text>
                        </GridItem>
                        <GridItem>
                            <Text fontSize="xs" color={colors.textColorMuted}>{t("created")}:</Text>
                            <Text fontSize="sm">{formatDate(currentPlan.created_at)}</Text>
                        </GridItem>
                        <GridItem>
                            <Text fontSize="xs" color={colors.textColorMuted}>{t("updated")}:</Text>
                            <Text fontSize="sm">{formatDate(currentPlan.updated_at)}</Text>
                        </GridItem>
                        {/* {currentPlan.completed_at && (
                            <GridItem colSpan={2}>
                                <Text fontSize="xs" color={colors.textColorMuted}>{t("completed")}:</Text>
                                <Text fontSize="sm">{formatDate(currentPlan.completed_at)}</Text>
                            </GridItem>
                        )} */}
                    </Grid>
                </Box>
            </Flex>

            <Box
                borderWidth="1px"
                borderRadius="md"
                borderColor={colors.borderColor}
                p={4}
                flex="1"
                overflowY="auto"
                height="calc(100% - 180px)"
                bg={colors.cardBg}
            >
                <Flex justify="space-between" align="center" mb={4}>
                    <Heading size="sm" color={colors.textColorHeading}>{t("tasks")}</Heading>
                    {currentTaskId !== null && (
                        <Badge colorScheme="blue">
                            {t("current_task")}: {currentTaskId + 1} / {tasks.length}
                        </Badge>
                    )}
                </Flex>

                {/* Plan status message */}
                {(currentPlan.status === 'success' || currentPlan.status === 'terminated') && (
                    <Box
                        mb={4}
                        p={3}
                        borderRadius="md"
                        bg={currentPlan.status === 'success' ? 'green.50' : 'red.50'}
                        color={currentPlan.status === 'success' ? 'green.700' : 'red.700'}
                    >
                        <Text fontWeight="medium">
                            {currentPlan.status === 'success'
                                ? t("plan_completed_successfully") || "This plan has been completed successfully."
                                : t("plan_terminated") || "This plan has been terminated."}
                        </Text>
                    </Box>
                )}

                {loading.tasks || isLoading ? (
                    <Center py={8}>
                        <Spinner size="md" color={colors.accentColor} mr={3} />
                        <Text color={colors.textColor}>{t("loading_tasks")}</Text>
                    </Center>
                ) : tasks.length > 0 ? (
                    <VStack align="stretch" gap={3}>
                        {tasks.map((task: any, index: number) => {
                            // Convert string dates to Date objects
                            const typedTask: ITask = {
                                ...task,
                                created_at: task.created_at ? new Date(task.created_at) : new Date(),
                                start_time: task.start_time ? new Date(task.start_time) : null,
                                completed_at: task.completed_at ? new Date(task.completed_at) : null
                            };

                            // Determine if this is the current task
                            const isCurrentTask = index === currentTaskId;

                            // Highlight as current if the plan is not pending or terminated
                            const shouldHighlightAsCurrent = isCurrentTask &&
                                currentPlan.status !== 'pending' &&
                                currentPlan.status !== 'terminated';

                            // If this is the current task and it's not started, show it as pending in the UI
                            // Only show as pending if the plan is approved (running) and not terminated
                            const displayStatus = (isCurrentTask &&
                                typedTask.status === 'not_started' &&
                                currentPlan.status === 'running')
                                ? 'pending'
                                : typedTask.status;

                            return (
                                <Box
                                    key={typedTask.id}
                                    p={4}
                                    borderWidth="1px"
                                    borderRadius="md"
                                    borderColor={shouldHighlightAsCurrent ? colors.accentColor : colors.borderColor}
                                    bg={shouldHighlightAsCurrent ? `${colors.accentColor}10` : colors.planItemBg}
                                    position="relative"
                                >
                                    {shouldHighlightAsCurrent && (
                                        <Circle
                                            size="10px"
                                            bg={colors.accentColor}
                                            position="absolute"
                                            left="-5px"
                                            top="50%"
                                            transform="translateY(-50%)"
                                        />
                                    )}

                                    <Flex justify="space-between" align="center" mb={2}>
                                        <Flex align="center">
                                            <Badge mr={2} colorScheme="purple">Step {typedTask.step_number}</Badge>
                                            <StatusBadge status={displayStatus} mr={2} />
                                            <Text fontWeight="bold" color={colors.textColorHeading}>{typedTask.task_name}</Text>
                                        </Flex>

                                        {/* Task action buttons - only show for pending tasks */}
                                        {typedTask.status === 'pending' && shouldHighlightAsCurrent && (
                                            <Flex>
                                                <Tooltip content={t("approve_task")}>
                                                    <IconButton
                                                        aria-label="approve task"
                                                        size="sm"
                                                        colorScheme="green"
                                                        variant="ghost"
                                                        onClick={() => {
                                                            // Dummy onClick handler for task approval
                                                            console.log('Approve task:', typedTask.task_id);
                                                        }}
                                                        _hover={{ bg: "green.50", color: colors.greenBgColor }}
                                                        mr={1}
                                                    >
                                                        <Icon as={FaCheck} color={colors.textColor} />
                                                    </IconButton>
                                                </Tooltip>
                                                <Tooltip content={t("deny_task")}>
                                                    <IconButton
                                                        aria-label="deny task"
                                                        size="sm"
                                                        colorScheme="red"
                                                        variant="ghost"
                                                        onClick={() => {
                                                            // Dummy onClick handler for task denial
                                                            console.log('Deny task:', typedTask.task_id);
                                                        }}
                                                        _hover={{ bg: "red.50", color: colors.redBgColor }}
                                                        mr={1}
                                                    >
                                                        <Icon as={FaStop} color={colors.textColor} />
                                                    </IconButton>
                                                </Tooltip>
                                                <Tooltip content={t("refresh_task")}>
                                                    <IconButton
                                                        aria-label="refresh task"
                                                        size="sm"
                                                        colorScheme="blue"
                                                        variant="ghost"
                                                        onClick={() => {
                                                            // Dummy onClick handler for task refresh
                                                            console.log('Refresh task:', typedTask.task_id);
                                                        }}
                                                        _hover={{ bg: "blue.50", color: colors.blueBgColor }}
                                                    >
                                                        <Icon as={FiRefreshCw} color={colors.textColor} />
                                                    </IconButton>
                                                </Tooltip>
                                            </Flex>
                                        )}
                                    </Flex>

                                    <Text fontSize="sm" mb={3} color={colors.textColor}>{typedTask.task_explanation}</Text>

                                    {typedTask.expected_result && (
                                        <Box mb={3}>
                                            <Text fontSize="xs" fontWeight="bold" color={colors.textColorMuted}>
                                                {t("expected_result")}:
                                            </Text>
                                            <Text fontSize="sm" color={colors.textColor}>{typedTask.expected_result}</Text>
                                        </Box>
                                    )}

                                    {/* Merged Server & Tool Information */}
                                    <Flex direction="column" gap={2} mt={3}>
                                        <Box>
                                            {typedTask.tool && (
                                                <Box>
                                                    <Flex align="center" mb={2}>
                                                        {typedTask.mcp_server && (
                                                            <Flex
                                                                align="center"
                                                                fontSize="xs"
                                                                color={colors.textColorMuted}
                                                                bg={`${colors.accentColor}10`}
                                                                p={2}
                                                                borderRadius="md"
                                                                width="fit-content"
                                                                mr={3}
                                                            >
                                                                <Icon as={FiServer} mr={1} />
                                                                {t("server")}: {typedTask.mcp_server}
                                                            </Flex>
                                                        )}
                                                    </Flex>

                                                    {Array.isArray(typedTask.tool) ? (
                                                        // Handle array of tool calls with improved styling
                                                        <VStack align="flex-start" gap={2}>
                                                            {typedTask.tool.map((toolCall, idx) => (
                                                                <Box
                                                                    key={idx}
                                                                    p={3}
                                                                    borderRadius="md"
                                                                    bg={`${colors.accentColor}10`}
                                                                    border="1px"
                                                                    borderColor={colors.borderColor}
                                                                    boxShadow="sm"
                                                                    width="100%"
                                                                >
                                                                    <Flex justifyContent="space-between" mb={2} alignItems="center">
                                                                        <HStack gap={2}>
                                                                            <Icon as={FaTools} color="blue.500" />
                                                                            <Text fontWeight="semibold" fontSize="sm" color={colors.textColorHeading}>
                                                                                {toolCall.tool_name || t("not_specified")}
                                                                            </Text>
                                                                        </HStack>
                                                                    </Flex>

                                                                    {toolCall.description && (
                                                                        <Text fontSize="xs" color={colors.textColor} mb={2}>
                                                                            {toolCall.description}
                                                                        </Text>
                                                                    )}

                                                                    {toolCall.args && Object.keys(toolCall.args).length > 0 && (
                                                                        <Box
                                                                            mt={2}
                                                                            p={2}
                                                                            bg={colors.bgSubtle}
                                                                            borderRadius="md"
                                                                            borderWidth="1px"
                                                                            borderColor={colors.borderColor}
                                                                        >
                                                                            <Text fontSize="xs" fontWeight="bold" color={colors.textColorMuted} mb={1}>
                                                                                {t("parameters")}:
                                                                            </Text>
                                                                            <Table.Root size="sm" variant="line" colorScheme="blue">
                                                                                <Table.Header bg={colors.bgSubtle} position="sticky" top={0} zIndex={1}>
                                                                                    <Table.Row>
                                                                                        <Table.ColumnHeader width="40%" fontWeight="semibold" fontSize="xs">{t("parameter")}</Table.ColumnHeader>
                                                                                        <Table.ColumnHeader width="60%" fontWeight="semibold" fontSize="xs">{t("value")}</Table.ColumnHeader>
                                                                                    </Table.Row>
                                                                                </Table.Header>
                                                                                <Table.Body>
                                                                                    {Object.entries(toolCall.args).map(([paramName, paramValue]) => (
                                                                                        <Table.Row key={paramName} _hover={{ bg: colors.cardBg }}>
                                                                                            <Table.Cell fontWeight="medium" fontSize="xs" color={colors.textColor}>{paramName}</Table.Cell>
                                                                                            <Table.Cell fontSize="xs" color={colors.textColor}>
                                                                                                <Code colorScheme="blue" px={1} py={0}>
                                                                                                    {typeof paramValue === 'object'
                                                                                                        ? JSON.stringify(paramValue)
                                                                                                        : String(paramValue)
                                                                                                    }
                                                                                                </Code>
                                                                                            </Table.Cell>
                                                                                        </Table.Row>
                                                                                    ))}
                                                                                </Table.Body>
                                                                            </Table.Root>
                                                                        </Box>
                                                                    )}
                                                                </Box>
                                                            ))}
                                                        </VStack>
                                                    ) : (
                                                        // Fallback for legacy single tool object format with improved styling
                                                        <Box
                                                            p={3}
                                                            borderRadius="md"
                                                            bg={`${colors.accentColor}10`}
                                                            border="1px"
                                                            borderColor={colors.borderColor}
                                                            boxShadow="sm"
                                                            width="100%"
                                                        >
                                                            <Flex justifyContent="space-between" mb={2} alignItems="center">
                                                                <HStack gap={2}>
                                                                    <Icon as={FaTools} color="blue.500" />
                                                                    <Text fontWeight="semibold" fontSize="sm" color={colors.textColorHeading}>
                                                                        {typedTask.tool.tool_name || t("not_specified")}
                                                                    </Text>
                                                                </HStack>
                                                            </Flex>

                                                            {typedTask.tool.description && (
                                                                <Text fontSize="xs" color={colors.textColor} mb={2}>
                                                                    {typedTask.tool.description}
                                                                </Text>
                                                            )}

                                                            {typedTask.tool.args && Object.keys(typedTask.tool.args).length > 0 && (
                                                                <Box
                                                                    mt={2}
                                                                    p={2}
                                                                    bg={colors.bgSubtle}
                                                                    borderRadius="md"
                                                                    borderWidth="1px"
                                                                    borderColor={colors.borderColor}
                                                                >
                                                                    <Text fontSize="xs" fontWeight="bold" color={colors.textColorMuted} mb={1}>
                                                                        {t("parameters")}:
                                                                    </Text>
                                                                    <Table.Root size="sm" variant="line" colorScheme="blue">
                                                                        <Table.Header bg={colors.bgSubtle} position="sticky" top={0} zIndex={1}>
                                                                            <Table.Row>
                                                                                <Table.ColumnHeader width="40%" fontWeight="semibold" fontSize="xs">{t("parameter")}</Table.ColumnHeader>
                                                                                <Table.ColumnHeader width="60%" fontWeight="semibold" fontSize="xs">{t("value")}</Table.ColumnHeader>
                                                                            </Table.Row>
                                                                        </Table.Header>
                                                                        <Table.Body>
                                                                            {Object.entries(typedTask.tool.args).map(([paramName, paramValue]) => (
                                                                                <Table.Row key={paramName} _hover={{ bg: colors.cardBg }}>
                                                                                    <Table.Cell fontWeight="medium" fontSize="xs" color={colors.textColor}>{paramName}</Table.Cell>
                                                                                    <Table.Cell fontSize="xs" color={colors.textColor}>
                                                                                        <Code colorScheme="blue" px={1} py={0}>
                                                                                            {typeof paramValue === 'object'
                                                                                                ? JSON.stringify(paramValue)
                                                                                                : String(paramValue)
                                                                                            }
                                                                                        </Code>
                                                                                    </Table.Cell>
                                                                                </Table.Row>
                                                                            ))}
                                                                        </Table.Body>
                                                                    </Table.Root>
                                                                </Box>
                                                            )}
                                                        </Box>
                                                    )}
                                                </Box>
                                            )}

                                            {/* Show server info alone if no tools */}
                                            {!typedTask.tool && typedTask.mcp_server && (
                                                <Flex
                                                    align="center"
                                                    fontSize="xs"
                                                    color={colors.textColorMuted}
                                                    bg={`${colors.accentColor}10`}
                                                    p={2}
                                                    borderRadius="md"
                                                    width="fit-content"
                                                >
                                                    <Icon as={FiServer} mr={1} />
                                                    {t("server")}: {typedTask.mcp_server}
                                                </Flex>
                                            )}
                                        </Box>
                                    </Flex>

                                    <Grid templateColumns="repeat(3, 1fr)" gap={2} mt={3} fontSize="xs" color={colors.textColorMuted}>
                                        <GridItem>
                                            <Text>{t("created")}: {formatDate(typedTask.created_at)}</Text>
                                        </GridItem>
                                        {typedTask.start_time && (
                                            <GridItem>
                                                <Text>{t("started")}: {formatDate(typedTask.start_time)}</Text>
                                            </GridItem>
                                        )}
                                        {typedTask.completed_at && (
                                            <GridItem>
                                                <Text>{t("completed")}: {formatDate(typedTask.completed_at)}</Text>
                                            </GridItem>
                                        )}
                                    </Grid>

                                    {typedTask.result && (
                                        <Box mt={3} p={3} bg={colors.bgSubtle} borderRadius="md">
                                            <Text fontSize="xs" fontWeight="bold" color={colors.textColorMuted} mb={1}>
                                                {t("result")}:
                                            </Text>
                                            <Text fontSize="sm" color={colors.textColor}>{typedTask.result}</Text>
                                        </Box>
                                    )}
                                </Box>
                            );
                        })}
                    </VStack>
                ) : (
                    <Center py={8}>
                        <Text color={colors.textColorMuted}>{t("no_tasks_found")}</Text>
                    </Center>
                )}
            </Box>
        </Box>
    );
} 