"use client";

import { useTranslations } from "next-intl";
import { useSelector, useDispatch } from 'react-redux';
import { RootState, AppDispatch } from "@/store/store";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Box, Heading, Flex, Spinner, Badge, Text, VStack, Center, Button } from "@chakra-ui/react";
import { fetchTasks, selectPlan, updatePlanStatus, forceResetTasksLoading } from "@/store/features/planSlice";
import { usePlansColors } from "@/utils/colors";
import { IPlan, ITask } from "@/types/plan";
import { fetchPlans } from "@/store/features/planSlice";
import axios from "axios";
import { TaskEditModal } from "@/components/plans/task_edit_modal";
import PlanHeader from "@/components/plans/PlanHeader";
import TaskCard from "@/components/plans/TaskCard";
import { motion } from "framer-motion";
import { TaskInfoModal } from "@/components/plans/task_info_modal"
import { RepeatIcon } from "@chakra-ui/icons";

// Use typed dispatch
const useAppDispatch = () => useDispatch<AppDispatch>();

// Add container and item animation variants
const containerVariants = {
    hidden: { opacity: 0 },
    show: {
        opacity: 1,
        transition: {
            staggerChildren: 0.05,
            delayChildren: 0.1
        }
    }
};

const itemVariants = {
    hidden: { opacity: 0, y: 10 },
    show: {
        opacity: 1,
        y: 0,
        transition: {
            type: "spring",
            stiffness: 70,
            damping: 15
        }
    }
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

    // Convert currentTask dates if it exists
    const typedCurrentTask = currentTask ? {
        ...currentTask,
        created_at: currentTask.created_at ? new Date(currentTask.created_at) : new Date(),
        start_time: currentTask.start_time ? new Date(currentTask.start_time) : null,
        completed_at: currentTask.completed_at ? new Date(currentTask.completed_at) : null
    } as ITask : null;

    // Add these state variables for the task edit modal
    const [isTaskEditModalOpen, setIsTaskEditModalOpen] = useState(false);
    const [selectedTask, setSelectedTask] = useState<ITask | null>(null);

    // Add these state variables for task info modal
    const [isTaskInfoModalOpen, setIsTaskInfoModalOpen] = useState(false);
    const [taskInfoToShow, setTaskInfoToShow] = useState<ITask | null>(null);

    const handlePlanApproval = async (plan: IPlan | undefined, task: ITask | null) => {
    };

    // Fetch tasks on component mount
    useEffect(() => {
        if (planId) {
            dispatch(selectPlan(planId));
            dispatch(fetchTasks(planId));
        }
    }, [dispatch, planId]);

    // Handle task refresh after editing
    const handleTaskUpdated = () => {
        dispatch(fetchTasks(planId));
    };

    const handleEditTask = (task: ITask) => {
        setSelectedTask(task);
        setIsTaskEditModalOpen(true);
    };

    const handleApprovePlan = async () => {
        if (!currentPlan) return;
        setIsLoading(true);
        // Dispatch the thunk to update status and trigger the event listener
        dispatch(updatePlanStatus({ planId: currentPlan.id, status: 'running' }))
            .unwrap() // Use unwrap to catch potential errors from the thunk
            .catch((error) => {
                console.error('Error approving plan via thunk:', error);
                // Optionally show an error message to the user
            })
            .finally(() => {
                setIsLoading(false);
            });
    };

    const handleDenyPlan = async () => {
        if (!currentPlan) return;
        setIsLoading(true);
        // Dispatch the thunk to update status and trigger the event listener
        dispatch(updatePlanStatus({ planId: currentPlan.id, status: 'terminated' }))
            .unwrap() // Use unwrap to catch potential errors from the thunk
            .catch((error) => {
                console.error('Error denying plan via thunk:', error);
                // Optionally show an error message to the user
            })
            .finally(() => {
                setIsLoading(false);
            });
    };

    const handleRefresh = () => {
        console.log('[PlanDetailsPage] Manual refresh triggered');
        setIsLoading(true);
        // Refresh both plans and tasks
        Promise.all([
            dispatch(fetchPlans()),
            dispatch(fetchTasks(planId))
        ])
            .finally(() => {
                console.log('[PlanDetailsPage] Manual refresh finished');
                setIsLoading(false);
            });
    };

    const handleMCPRequest = async (task: ITask, plan: IPlan) => {
        console.log("handleMCPRequest", plan, task, !plan);
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

            // Consider if MCP request should also trigger the 'plan-update' event
            // For now, keep the direct fetch, but be aware it might overlap if
            // the backend also triggers an update event after MCP.
            await dispatch(fetchTasks(planId));
        } catch (error) {
            if (axios.isAxiosError(error) && error.response) {
                console.error('Error requesting MCP:', error.response.status, error.response.data);
            } else {
                console.error('Error requesting MCP:', error);
            }
        }
    };

    // Update handler to include plan
    const handleApproveTask = async (task: ITask, plan: IPlan) => {
        console.log("handlePlanApproval", plan, task, !plan);
        if (!plan) return;
        const url = `/api/mcp/execute_task`;

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
            // Add task refresh here if needed, or ensure backend triggers 'plan-update'
            // await dispatch(fetchTasks(planId));
        } catch (error) {
            if (axios.isAxiosError(error) && error.response) {
                console.error('Error requesting MCP:', error.response.status, error.response.data);
            } else {
                console.error('Error requesting MCP:', error);
            }
        }
    };

    const handleTaskClick = (task: ITask) => {
        setTaskInfoToShow(task);
        setIsTaskInfoModalOpen(true);
    };

    // Add a safety timeout to reset loading state if it gets stuck
    useEffect(() => {
        if (loading.tasks) {
            const timeoutId = setTimeout(() => {
                dispatch(forceResetTasksLoading());
            }, 5000); // 5 seconds timeout

            return () => clearTimeout(timeoutId);
        }
    }, [loading.tasks, dispatch]);

    // Add this useEffect to listen for plan updates
    useEffect(() => {
        const handlePlanUpdate = (event: CustomEvent) => {
            const { planId: updatedPlanId } = event.detail;
            if (updatedPlanId === planId) {
                // Fetch both plans (for status update) and tasks
                dispatch(fetchPlans());
                dispatch(fetchTasks(updatedPlanId));
            }
        };

        window.addEventListener('plan-update', handlePlanUpdate as EventListener);

        return () => {
            window.removeEventListener('plan-update', handlePlanUpdate as EventListener);
        };
    }, [dispatch, planId]);

    // Add this new function to handle plan reset
    const handleResetPlan = async () => {
        if (!currentPlan) return;

        setIsLoading(true);
        try {
            // Call the API to reset the plan
            const response = await axios.put('/api/plan/update_plan', {
                plan_id: currentPlan.plan_id,
                reset_plan: true
            });

            console.log('Plan reset response:', response.data);

            // Refresh the UI
            await Promise.all([
                dispatch(fetchPlans()),
                dispatch(fetchTasks(planId))
            ]);

        } catch (error) {
            console.error('Error resetting plan:', error);
        } finally {
            setIsLoading(false);
        }
    };

    if (!currentPlan) {
        return (
            <Center height="100%" p={8}>
                <Spinner size="lg" color={colors.accentColor} />
            </Center>
        );
    }

    return (
        <Box p={6} height="100%" position="relative">
            {/* Task Edit Modal */}
            <TaskEditModal
                isOpen={isTaskEditModalOpen}
                onClose={() => setIsTaskEditModalOpen(false)}
                task={selectedTask}
                onTaskUpdated={handleTaskUpdated}
            />

            {/* Task Info Modal */}
            <TaskInfoModal
                isOpen={isTaskInfoModalOpen}
                onClose={() => setIsTaskInfoModalOpen(false)}
                task={taskInfoToShow}
                colors={colors}
            />

            <Flex justify="space-between" mb={6} align="center">
                <PlanHeader plan={currentPlan} colors={colors} />

                {/* Reset Plan Button */}
                <Button
                    colorScheme="blue"
                    variant="outline"
                    onClick={handleResetPlan}
                    loading={isLoading}
                    loadingText="Resetting..."
                    size="sm"
                >
                    Reset Plan
                </Button>
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
                    <Heading size="sm" color={colors.textColorHeading}>{(t("tasks") as string) || "Tasks"}</Heading>
                    {currentTaskId !== null && (
                        <Badge colorScheme="blue">
                            {(t("current_task") as string) || "Current Task"}: {currentTaskId + 1} / {tasks.length}
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
                                ? (t("plan_completed_successfully") as string) || "This plan has been completed successfully."
                                : (t("plan_terminated") as string) || "This plan has been terminated."}
                        </Text>
                    </Box>
                )}

                {/* Log loading state outside of JSX */}
                {(() => {
                    console.log(`[PlanDetailsPage/Render] Checking loading.tasks (${loading.tasks}) before rendering task list.`);
                    return null;
                })()}

                {loading.tasks ? (
                    <Center py={8}>
                        {/* Log spinner rendering outside of JSX */}
                        {(() => {
                            console.log("[PlanDetailsPage/Render] Rendering loading spinner.");
                            return null;
                        })()}
                        <Spinner size="md" color={colors.accentColor} mr={3} />
                        <Text color={colors.textColor}>{(t("loading_tasks") as string) || "Loading tasks..."}</Text>
                    </Center>
                ) : tasks.length > 0 ? (
                    <motion.div
                        variants={containerVariants}
                        initial="hidden"
                        animate="show"
                    >
                        {/* Log task list rendering outside of JSX */}
                        {(() => {
                            console.log(`[PlanDetailsPage/Render] Rendering task list with ${tasks.length} tasks.`);
                            return null;
                        })()}
                        <VStack align="stretch" gap={3}>
                            {tasks.map((task: any, index: number) => {
                                // Convert string dates to Date objects
                                const typedTask: ITask = {
                                    ...task,
                                    created_at: task.created_at ? new Date(task.created_at) : new Date(),
                                    start_time: task.start_time ? new Date(task.start_time) : null,
                                    completed_at: task.completed_at ? new Date(task.completed_at) : null
                                };

                                return (
                                    <motion.div
                                        key={typedTask.id}
                                        variants={itemVariants}
                                        whileHover={{
                                            scale: 1.01,
                                            boxShadow: "0px 3px 8px rgba(0,0,0,0.05)",
                                            transition: { duration: 0.15 }
                                        }}
                                        whileTap={{
                                            scale: 0.99,
                                            transition: { duration: 0.1 }
                                        }}
                                    >
                                        <TaskCard
                                            task={typedTask}
                                            index={index}
                                            currentTaskId={currentTaskId}
                                            planStatus={currentPlan.status}
                                            plan={currentPlan}
                                            colors={colors}
                                            onEditTask={handleEditTask}
                                            onMCPRequest={handleMCPRequest}
                                            onApproveTask={handleApproveTask}
                                            onClick={() => handleTaskClick(typedTask)}
                                        />
                                    </motion.div>
                                );
                            })}
                        </VStack>
                    </motion.div>
                ) : (
                    <Center py={8}>
                        {(() => {
                            console.log("[PlanDetailsPage/Render] Rendering 'No tasks found'.");
                            return null;
                        })()}
                        <Text color={colors.textColorMuted}>{(t("no_tasks_found") as string) || "No tasks found"}</Text>
                    </Center>
                )}
            </Box>
        </Box>
    );
} 