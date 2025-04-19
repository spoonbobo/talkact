"use client";

import { useTranslations } from "next-intl";
import { useSelector, useDispatch } from 'react-redux';
import { RootState, AppDispatch } from "@/store/store";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Box, Flex, ButtonGroup, Button, Center, Spinner, Text, Icon, Heading } from "@chakra-ui/react";
import { fetchTasks, selectPlan, forceResetTasksLoading, updateViewMode } from "@/store/features/planSlice";
import { usePlansColors } from "@/utils/colors";
import PlanHeader from "@/components/plans/PlanHeader";
import TaskKanban from "@/components/plans/task_kanban";
import PlanCalendar from "@/components/plans/plan_calendar";
import { CalendarIcon, ViewIcon } from "@chakra-ui/icons";
import { FaTasks } from "react-icons/fa";

// Use typed dispatch
const useAppDispatch = () => useDispatch<AppDispatch>();

export default function PlanDetailsPage() {
    const t = useTranslations("Plans");
    const params = useParams();
    const planId = params?.planId as string;
    const dispatch = useAppDispatch();

    const { plans, tasks, layout, loading } = useSelector(
        (state: RootState) => state.plan
    );

    const colors = usePlansColors();

    // Local state for view mode to ensure immediate UI updates
    const [viewMode, setViewMode] = useState<'kanban' | 'calendar'>(layout.viewMode);

    // Find the current plan
    const currentPlan = plans.find(plan => plan.id === planId || plan.plan_id === planId);

    // Fetch tasks on component mount
    useEffect(() => {
        if (planId) {
            dispatch(selectPlan(planId));
            dispatch(fetchTasks(planId));
            dispatch(forceResetTasksLoading()); // Force reset loading immediately
        }
    }, [dispatch, planId]);

    // Update local view mode when Redux state changes
    useEffect(() => {
        setViewMode(layout.viewMode);
    }, [layout.viewMode]);

    // Handle view mode change
    const handleViewModeChange = (mode: 'kanban' | 'calendar') => {
        setViewMode(mode); // Update local state immediately
        dispatch(updateViewMode(mode)); // Update Redux state
    };

    // Ensure the plan has all required fields before passing it to components
    const validPlan = currentPlan ? {
        ...currentPlan,
        created_at: typeof currentPlan.created_at === 'string'
            ? new Date(currentPlan.created_at)
            : currentPlan.created_at || new Date(),
        updated_at: typeof currentPlan.updated_at === 'string'
            ? new Date(currentPlan.updated_at)
            : currentPlan.updated_at || new Date(),
        completed_at: currentPlan.completed_at
            ? (typeof currentPlan.completed_at === 'string'
                ? new Date(currentPlan.completed_at)
                : currentPlan.completed_at)
            : null
    } : {
        id: planId,
        plan_id: planId,
        created_at: new Date(),
        updated_at: new Date(),
        completed_at: null,
        plan_name: "Plan",
        plan_overview: "",
        status: "pending",
        progress: 0,
        room_id: "",
        assigner: "",
        assignee: "",
        reviewer: null,
        logs: [],
        context: []
    };

    // Format tasks with proper date objects
    const formattedTasks = tasks.map((task: any) => ({
        ...task,
        created_at: task.created_at ? new Date(task.created_at) : new Date(),
        start_time: task.start_time ? new Date(task.start_time) : null,
        completed_at: task.completed_at ? new Date(task.completed_at) : null
    }));

    // Show loading state if tasks are still loading
    if (loading.tasks) {
        return (
            <Center height="100%">
                <Spinner size="xl" color={colors.accentColor} />
            </Center>
        );
    }

    return (
        <Box p={6} height="100%" position="relative" display="flex" flexDirection="column">
            {/* Header Section */}
            <Flex
                justify="space-between"
                mb={4}
                align="center"
                borderBottom={`1px solid ${colors.borderColor}`}
                pb={3}
                flexShrink={0}
            >
                <Flex align="center" flex="1">
                    <PlanHeader
                        plan={validPlan}
                        colors={colors}
                    />
                </Flex>
            </Flex>

            {/* View Container */}
            <Box
                borderWidth="1px"
                borderRadius="lg"
                borderColor={colors.borderColor}
                p={3}
                flex="1"
                display="flex"
                flexDirection="column"
                overflow="hidden"
                bg={colors.cardBg}
                boxShadow="sm"
                css={{
                    '.taskKanbanHeader, .planCalendarHeader': {
                        display: 'none !important'
                    },
                    '.viewToggleButtons': {
                        display: 'none !important'
                    },
                    // Add styling for selected tasks in calendar view
                    '.fc-event.selected-task': {
                        borderWidth: '2px',
                        boxShadow: '0 0 0 1px rgba(66, 153, 225, 0.5)',
                        transform: 'scale(1.02)',
                        transition: 'all 0.2s ease-in-out'
                    },
                    // Improve task popup/tooltip styling
                    '.fc-popover': {
                        borderRadius: '8px',
                        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
                        border: `1px solid ${colors.borderColor}`,
                        padding: '4px',
                        maxWidth: '300px',
                        zIndex: 1000
                    },
                    // Ensure calendar events have proper spacing and alignment
                    '.fc-event-main': {
                        padding: '2px 4px',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis'
                    }
                }}
            >
                <Box flex="1" width="100%" display="flex">
                    {layout.viewMode === 'kanban' ? (
                        <Box height="100%" width="100%" display="flex" flexDirection="column">
                            {formattedTasks.length > 0 ? (
                                <TaskKanban
                                    key={`kanban-${formattedTasks.length}-${planId}`}
                                    plans={[validPlan]}
                                    currentPlanId={planId}
                                    viewMode={layout.viewMode}
                                    onViewModeChange={() => { }}
                                    tasks={formattedTasks}
                                    hideViewToggle={true}
                                    className="taskKanban"
                                />
                            ) : (
                                <Flex
                                    height="100%"
                                    width="100%"
                                    flexDirection="column"
                                    justifyContent="center"
                                    alignItems="center"
                                    p={8}
                                >
                                    <Box
                                        textAlign="center"
                                        maxWidth="400px"
                                        p={6}
                                        borderRadius="md"
                                        bg={colors.cardBg}
                                        boxShadow="sm"
                                    >
                                        <Icon as={FaTasks} boxSize={12} color={colors.textColorMuted} mb={4} />
                                        <Heading size="md" color={colors.textColorHeading} mb={2}>
                                            {t("no_tasks_available")}
                                        </Heading>
                                        <Text color={colors.textColorMuted} textAlign="center">
                                            {t("no_tasks_for_plan")}
                                        </Text>
                                    </Box>
                                </Flex>
                            )}
                        </Box>
                    ) : (
                        <PlanCalendar
                            key={`calendar-${formattedTasks.length}-${planId}`}
                            plans={plans.map(plan => ({
                                ...plan,
                                created_at: typeof plan.created_at === 'string'
                                    ? new Date(plan.created_at)
                                    : plan.created_at || new Date(),
                                updated_at: typeof plan.updated_at === 'string'
                                    ? new Date(plan.updated_at)
                                    : plan.updated_at || new Date(),
                                completed_at: plan.completed_at
                                    ? (typeof plan.completed_at === 'string'
                                        ? new Date(plan.completed_at)
                                        : plan.completed_at)
                                    : null
                            }))}
                            currentPlanId={planId}
                            viewMode={layout.viewMode}
                            onViewModeChange={handleViewModeChange}
                        />
                    )}
                </Box>
            </Box>
        </Box>
    );
} 