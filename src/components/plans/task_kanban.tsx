"use client";

import { useTranslations } from "next-intl";
import { useDispatch } from 'react-redux';
import { Box, Text, VStack, Flex, Badge, useToken, Button, Icon } from "@chakra-ui/react";
import { usePlansColors } from "@/utils/colors";
import Link from "next/link";
import { IPlan, PlanStatus, TaskStatus, ITask } from "@/types/plan";
import StatusBadge, { getStatusColorScheme } from "@/components/ui/StatusBadge";
import { updatePlanStatus, updatePlanOrders, updateTaskStatus } from "@/store/features/planSlice";
import { AppDispatch } from "@/store/store";
import { useEffect, useState, useRef, useMemo, useCallback } from "react";
import {
    DndContext,
    DragOverlay,
    closestCorners,
    KeyboardSensor,
    PointerSensor,
    TouchSensor,
    useSensor,
    useSensors,
    DragStartEvent,
    DragEndEvent,
    DragOverEvent,
    UniqueIdentifier,
    MeasuringStrategy,
    pointerWithin,
    rectIntersection,
    useDroppable
} from '@dnd-kit/core';
import {
    SortableContext,
    sortableKeyboardCoordinates,
    verticalListSortingStrategy,
    useSortable,
    arrayMove
} from '@dnd-kit/sortable';
import { restrictToWindowEdges } from '@dnd-kit/modifiers';
import { CSS } from '@dnd-kit/utilities';
import { toaster } from "@/components/ui/toaster";
import { FaTasks } from "react-icons/fa";
import { TaskInfoModal } from "@/components/plans/task_info_modal";

// Format date for display
const formatDate = (date: Date | null): string => {
    if (!date) return 'N/A';
    return new Date(date).toLocaleString(undefined, {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
};

interface TaskKanbanProps {
    plans: any[];
    currentPlanId?: string;
    viewMode: 'kanban' | 'calendar';
    onViewModeChange: (mode: 'kanban' | 'calendar') => void;
    tasks?: ITask[];
    hideViewToggle?: boolean;
    className?: string;
    onTaskClick?: (task: ITask) => void;
    isAIManaged?: boolean | undefined;
}

// Draggable task item component
const SortableTaskItem = ({ task, isSelected, colors, onClick }: { task: ITask, isSelected: boolean, colors: any, onClick?: (task: ITask) => void }) => {
    const t = useTranslations("Plans");
    const [isDragging, setIsDragging] = useState(false);
    const [mouseDownTime, setMouseDownTime] = useState<number | null>(null);
    const [mouseDownPos, setMouseDownPos] = useState<{ x: number, y: number } | null>(null);

    const { attributes, listeners, setNodeRef, transform, transition, isDragging: dndIsDragging } = useSortable({
        id: task.id || task.task_id || `task-${Date.now()}`,
        data: {
            type: 'task',
            task
        }
    });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: dndIsDragging ? 0.5 : 1,
    };

    // Track when mouse is pressed down
    const handleMouseDown = (e: React.MouseEvent) => {
        setMouseDownTime(Date.now());
        setMouseDownPos({ x: e.clientX, y: e.clientY });
    };

    // Track when mouse is released
    const handleMouseUp = (e: React.MouseEvent) => {
        // If we have a mousedown time and position
        if (mouseDownTime && mouseDownPos) {
            const mouseUpTime = Date.now();
            const timeDiff = mouseUpTime - mouseDownTime;

            // Calculate distance moved
            const distX = Math.abs(e.clientX - mouseDownPos.x);
            const distY = Math.abs(e.clientY - mouseDownPos.y);
            const totalDist = Math.sqrt(distX * distX + distY * distY);

            // If mouse was down for less than 200ms and moved less than 5px, consider it a click
            if (timeDiff < 200 && totalDist < 5 && !dndIsDragging && onClick) {
                console.log("Click detected on task:", task.task_name);
                onClick(task);
            }
        }

        // Reset state
        setMouseDownTime(null);
        setMouseDownPos(null);
    };

    // Update local dragging state when dnd-kit's dragging state changes
    useEffect(() => {
        setIsDragging(dndIsDragging);
    }, [dndIsDragging]);

    return (
        <Box
            ref={setNodeRef}
            {...attributes}
            {...listeners}
            p={3}
            borderWidth="1px"
            borderRadius="md"
            borderColor={isSelected ? colors.selectedBorder : colors.borderColor}
            bg={isSelected ? colors.subtleSelectedItemBg : colors.planItemBg}
            boxShadow={dndIsDragging ? "lg" : isSelected ? colors.selectedCardShadow : "sm"}
            cursor={onClick ? "pointer" : "grab"}
            onMouseDown={handleMouseDown}
            onMouseUp={handleMouseUp}
            _hover={{
                boxShadow: isSelected ? colors.selectedCardShadow : colors.cardShadow,
                borderColor: colors.selectedBorderColor,
                bg: isSelected ? colors.subtleSelectedItemBg : colors.planItemHoverBg
            }}
            transition="all 0.2s"
            style={style}
            data-task-id={task.id || task.task_id}
            data-task-status={task.status}
            aria-roledescription="draggable item"
            aria-label={`${task.task_name}, status: ${t(task.status)}`}
        >
            <Flex justify="space-between" align="center" mb={1}>
                <Text fontWeight="bold" fontSize="sm" lineClamp={1} color={colors.textColorHeading}>
                    {task.task_name.substring(0, 30)}
                    {task.task_name.length > 30 ? '...' : ''}
                </Text>
            </Flex>
            <Text fontSize="xs" color={colors.textColorMuted} lineClamp={2} mb={2}>
                {task.task_explanation ? task.task_explanation.substring(0, 60) : ''}
                {task.task_explanation && task.task_explanation.length > 60 ? '...' : ''}
            </Text>
            <Flex justify="space-between" align="center">
                <Text fontSize="xs" color={colors.textColorMuted}>
                    {t("step")}: {task.step_number || 0}
                </Text>
                <Text fontSize="xs" color={colors.textColorMuted}>
                    {formatDate(task.start_time as Date | null)}
                </Text>
            </Flex>
        </Box>
    );
};

// Draggable plan item component (fallback when no tasks are available)
const SortablePlanItem = ({ plan, isSelected, colors }: { plan: IPlan, isSelected: boolean, colors: any }) => {
    const t = useTranslations("Plans");
    const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
        id: plan.id || plan.plan_id,
        data: {
            type: 'plan',
            plan
        }
    });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.5 : 1,
    };

    return (
        <Link href={`/plans/${plan.id || plan.plan_id}`} style={{ textDecoration: 'none' }}>
            <Box
                ref={setNodeRef}
                {...attributes}
                {...listeners}
                p={3}
                borderWidth="1px"
                borderRadius="md"
                borderColor={isSelected ? colors.selectedBorder : colors.borderColor}
                bg={isSelected ? colors.subtleSelectedItemBg : colors.planItemBg}
                boxShadow={isDragging ? "lg" : isSelected ? colors.selectedCardShadow : "sm"}
                cursor="grab"
                _hover={{
                    boxShadow: isSelected ? colors.selectedCardShadow : colors.cardShadow,
                    borderColor: colors.selectedBorderColor,
                    bg: isSelected ? colors.subtleSelectedItemBg : colors.planItemHoverBg
                }}
                transition="all 0.2s"
                style={style}
                data-plan-id={plan.id || plan.plan_id}
                data-plan-status={plan.status}
                aria-roledescription="draggable item"
                aria-label={`${plan.plan_name}, status: ${t(plan.status)}`}
            >
                <Flex justify="space-between" align="center" mb={1}>
                    <Text fontWeight="bold" fontSize="sm" lineClamp={1} color={colors.textColorHeading}>
                        {plan.plan_name.substring(0, 30)}
                        {plan.plan_name.length > 30 ? '...' : ''}
                    </Text>
                </Flex>
                <Flex justify="space-between" align="center">
                    <Text fontSize="xs" color={colors.textColorMuted}>
                        {t("progress")}: {plan.progress}%
                    </Text>
                    <Text fontSize="xs" color={colors.textColorMuted}>
                        {formatDate(plan.updated_at)}
                    </Text>
                </Flex>
            </Box>
        </Link>
    );
};

// Status column component
const StatusColumn = ({
    status,
    items,
    currentPlanId,
    colors,
    itemType,
    onTaskClick
}: {
    status: TaskStatus,
    items: (IPlan | ITask)[],
    currentPlanId?: string,
    colors: any,
    itemType: 'plan' | 'task',
    onTaskClick?: (task: ITask) => void
}) => {
    const t = useTranslations("Plans");
    const { setNodeRef: setDroppableNodeRef, isOver } = useDroppable({
        id: `column-${status}`,
        data: {
            type: 'column',
            status: status,
        }
    });

    console.log(`StatusColumn ${status}: onTaskClick prop received:`, !!onTaskClick);

    useEffect(() => {
        if (isOver) {
            console.log(`Column ${status} isOver: true`);
        }
    }, [isOver, status]);

    const columnBg = isOver ? (colors.dropTargetBg || 'blue.50') : colors.cardBg;
    const columnBorderColor = isOver ? (colors.dropTargetBorder || 'blue.300') : colors.borderColor;

    return (
        <Box
            ref={setDroppableNodeRef}
            key={status}
            flex="1"
            minWidth="250px"
            maxWidth="300px"
            borderWidth="2px"
            borderRadius="md"
            borderColor={columnBorderColor}
            bg={columnBg}
            height="100%"
            display="flex"
            flexDirection="column"
            boxShadow={colors.cardShadow}
            overflow="visible"
            _hover={{
                borderColor: isOver ? columnBorderColor : colors.borderColorSubtle,
                boxShadow: colors.selectedCardShadow
            }}
            transition="background-color 0.2s ease, border-color 0.2s ease"
            id={`status-column-${status}`}
            data-status={status}
            className={`status-column ${isOver ? 'drop-target-active' : ''}`}
            role="region"
            aria-label={`${t(status)} column`}
            m={1}
        >
            <Flex
                p={3}
                borderBottomWidth="1px"
                borderColor={colors.borderColor}
                bg={colors.bgSubtle}
                borderTopRadius="md"
                align="center"
                justify="space-between"
                style={{ pointerEvents: 'none' }}
            >
                <Flex align="center" gap={2}>
                    <Box
                        w={3}
                        h={3}
                        borderRadius="full"
                        bg={colors[`status${status.charAt(0).toUpperCase() + status.slice(1)}` as keyof typeof colors] ||
                            `${getStatusColorScheme(status)}.500`}
                    />
                    <Text
                        fontWeight="bold"
                        fontSize="md"
                        color={colors.textColorHeading}
                    >
                        {t(status)}
                    </Text>
                </Flex>
                <Badge
                    borderRadius="full"
                    px={2.5}
                    py={0.5}
                    fontSize="xs"
                    colorScheme={getStatusColorScheme(status)}
                    bg={colors.cardBg}
                    color={colors.textColorHeading}
                >
                    {items.length}
                </Badge>
            </Flex>

            <Box
                id={`sortable-area-${status}`}
                data-status={status}
                bg={columnBg}
                borderBottomRadius="md"
                minHeight="100px"
                p={2}
                flex="1"
                overflowY="auto"
                maxHeight="calc(100% - 60px)"
                css={{
                    '&::-webkit-scrollbar': { width: '8px' },
                    '&::-webkit-scrollbar-track': { background: colors.bgSubtle },
                    '&::-webkit-scrollbar-thumb': { background: colors.borderColor, borderRadius: '4px' },
                    '&::-webkit-scrollbar-thumb:hover': { background: colors.textColorMuted }
                }}
            >
                <SortableContext
                    items={items.map(item => {
                        if (itemType === 'task') {
                            const taskId = (item as ITask).id || (item as ITask).task_id || `task-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
                            return taskId;
                        } else {
                            const planId = (item as IPlan).id || (item as IPlan).plan_id || `plan-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
                            return planId;
                        }
                    })}
                    strategy={verticalListSortingStrategy}
                    id={`sortable-context-${status}`}
                >
                    <VStack align="stretch" gap={2}>
                        {items.length === 0 ? (
                            <Flex
                                height="100px"
                                align="center"
                                justify="center"
                                borderWidth="1px"
                                borderStyle="dashed"
                                borderRadius="md"
                                borderColor={colors.borderColorSubtle}
                                p={4}
                                textAlign="center"
                                style={{ pointerEvents: 'none' }}
                            >
                                <Text
                                    fontSize="sm"
                                    color={colors.textColorMuted}
                                    fontStyle="italic"
                                >
                                    {itemType === 'task'
                                        ? t("drop_tasks_here", { status: t(status) })
                                        : t("drop_plans_here", { status: t(status) })
                                    }
                                </Text>
                            </Flex>
                        ) : (
                            itemType === 'task'
                                ? items.map((item) => {
                                    const task = item as ITask;
                                    console.log(`Rendering task ${task.task_id || task.id} in column ${status}, passing onTaskClick:`, !!onTaskClick);
                                    return (
                                        <SortableTaskItem
                                            key={task.id || task.task_id}
                                            task={task}
                                            isSelected={false}
                                            colors={colors}
                                            onClick={onTaskClick}
                                        />
                                    );
                                })
                                : items.map((item) => {
                                    const plan = item as IPlan;
                                    return (
                                        <SortablePlanItem
                                            key={plan.id || plan.plan_id}
                                            plan={plan}
                                            isSelected={currentPlanId === (plan.id || plan.plan_id)}
                                            colors={colors}
                                        />
                                    );
                                })
                        )}
                    </VStack>
                </SortableContext>
            </Box>
        </Box>
    );
};

// Custom hook for drag and drop logic
const useDragAndDrop = (items: (IPlan | ITask)[], itemType: 'plan' | 'task', dispatch: any) => {
    const t = useTranslations("Plans");
    const [activeItem, setActiveItem] = useState<IPlan | ITask | null>(null);
    const [activeId, setActiveId] = useState<UniqueIdentifier | null>(null);

    // Configure sensors for drag and drop
    const sensors = useSensors(
        useSensor(PointerSensor, {
            activationConstraint: {
                distance: 8,
            },
        }),
        useSensor(KeyboardSensor, {
            coordinateGetter: sortableKeyboardCoordinates,
        }),
        useSensor(TouchSensor, {
            activationConstraint: {
                delay: 250,
                tolerance: 5,
            },
        })
    );

    // Handle drag start
    const handleDragStart = useCallback((event: DragStartEvent) => {
        const { active } = event;
        const activeData = active.data.current;

        if (!activeData) return;

        setActiveId(active.id);

        if (activeData.type === itemType) {
            setActiveItem(activeData[itemType]);
            document.body.classList.add('dragging');
        }
    }, [itemType]);

    // Handle drag over
    const handleDragOver = useCallback((event: DragOverEvent) => {
        // No implementation needed for now
    }, []);

    // Handle drag end
    const handleDragEnd = useCallback((event: DragEndEvent) => {
        const { active, over } = event;

        if (!over) {
            setActiveItem(null);
            setActiveId(null);
            document.body.classList.remove('dragging');
            return;
        }

        const activeData = active.data.current;
        const overData = over.data.current;

        if (!activeData || !overData) {
            setActiveItem(null);
            setActiveId(null);
            document.body.classList.remove('dragging');
            return;
        }

        // Get the original status and target status
        let originalStatus: TaskStatus | null = null;
        let targetStatus: TaskStatus | null = null;

        if (activeData.type === itemType) {
            originalStatus = activeData[itemType].status;
        }

        if (overData.type === 'column') {
            targetStatus = overData.status;
        } else if (overData.type === itemType) {
            targetStatus = overData[itemType].status;
        }

        // If we have both statuses and they're different, update the status
        if (targetStatus && originalStatus !== targetStatus) {
            try {
                const itemId = itemType === 'task' ?
                    (activeData[itemType].id || activeData[itemType].task_id) :
                    (activeData[itemType].id || activeData[itemType].plan_id);

                if (itemType === 'task') {
                    dispatch(updateTaskStatus({ taskId: itemId, status: targetStatus }));
                    toaster.success({
                        title: t("task_status_updated"),
                        description: `${t("task")} "${activeData[itemType].task_name}" ${t("moved_to")} ${t(targetStatus)}`
                    });
                } else {
                    // Convert TaskStatus to PlanStatus before dispatching
                    const planStatus = targetStatus === 'denied' ? 'failure' : targetStatus as PlanStatus;
                    dispatch(updatePlanStatus({ planId: itemId, status: planStatus }));
                    toaster.success({
                        title: t("plan_status_updated"),
                        description: `${t("plan")} "${activeData[itemType].plan_name}" ${t("moved_to")} ${t(targetStatus)}`
                    });
                }
            } catch (error) {
                console.error(`[TaskKanban/handleDragEnd] Error in dispatch:`, error);
                toaster.error({
                    title: t("status_update_failed"),
                    description: t("unexpected_error_occurred")
                });
            }
        } else if (targetStatus && originalStatus === targetStatus) {
            console.log(`[TaskKanban/handleDragEnd] ${itemType} dropped in the same column (${targetStatus}), no status change needed.`);
            // Handle reordering logic here if needed
        } else {
            console.log("[TaskKanban/handleDragEnd] Drop target status was invalid, could not be determined, or status did not change.");
        }

        // Reset states
        setActiveItem(null);
        setActiveId(null);
        document.body.classList.remove('dragging');
    }, [dispatch, itemType, t]);

    // Handle drag cancel
    const handleDragCancel = useCallback(() => {
        setActiveItem(null);
        setActiveId(null);
        document.body.classList.remove('dragging');
    }, []);

    return {
        activeItem,
        sensors,
        handleDragStart,
        handleDragOver,
        handleDragEnd,
        handleDragCancel
    };
};

const TaskKanban = ({
    plans,
    currentPlanId,
    viewMode,
    onViewModeChange,
    tasks = [],
    hideViewToggle = false,
    className = "",
    onTaskClick,
    isAIManaged = true
}: TaskKanbanProps) => {
    const t = useTranslations("Plans");
    const colors = usePlansColors();
    const dispatch = useDispatch<AppDispatch>();
    const [blue100] = useToken('colors', ['blue.100']);

    // Add state for the task info modal
    const [selectedTask, setSelectedTask] = useState<ITask | null>(null);
    const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);

    console.log("TaskKanban: onTaskClick prop received:", !!onTaskClick);

    // Create a default task click handler that will be used if none is provided
    const handleTaskClick = useCallback((task: ITask) => {
        console.log("Task clicked:", task);
        // If an external handler is provided, use it
        if (onTaskClick) {
            onTaskClick(task);
            return;
        }

        // Otherwise, show the task info modal
        setSelectedTask(task);
        setIsTaskModalOpen(true);
    }, [onTaskClick]);

    // Handle closing the task modal
    const handleCloseTaskModal = useCallback(() => {
        setIsTaskModalOpen(false);
    }, []);

    // Determine if we should show tasks or plans
    const showTasks = tasks && tasks.length > 0;
    const itemType = showTasks ? 'task' : 'plan';

    // Check if a plan is selected when in task mode
    const noPlanSelected = showTasks && !currentPlanId;

    // Convert string dates to Date objects
    const typedPlans: IPlan[] = useMemo(() => plans.map((plan: any) => ({
        ...plan,
        created_at: plan.created_at ? new Date(plan.created_at) : new Date(),
        updated_at: plan.updated_at ? new Date(plan.updated_at) : new Date(),
        completed_at: plan.completed_at ? new Date(plan.completed_at) : null
    })), [plans]);

    const typedTasks: ITask[] = useMemo(() => tasks.map((task: any) => ({
        ...task,
        created_at: task.created_at ? new Date(task.created_at) : new Date(),
        start_time: task.start_time ? new Date(task.start_time) : null,
        completed_at: task.completed_at ? new Date(task.completed_at) : null
    })), [tasks]);

    // Group items by status for kanban view
    const itemsByStatus = useMemo(() => {
        const grouped: Record<TaskStatus, (IPlan | ITask)[]> = {
            not_started: [],
            pending: [],
            running: [],
            success: [],
            failure: [],
            denied: [],
        };

        if (showTasks) {
            typedTasks.forEach(task => {
                if (grouped[task.status as TaskStatus]) {
                    grouped[task.status as TaskStatus].push(task);
                } else {
                    // If status doesn't match exactly, try to map it to a valid status
                    const mappedStatus = task.status === 'completed' ? 'success' :
                        task.status === 'in_progress' ? 'running' :
                            task.status === 'failed' ? 'failure' : 'pending';
                    grouped[mappedStatus as TaskStatus].push({ ...task, status: mappedStatus as TaskStatus });
                }
            });
        } else {
            typedPlans.forEach(plan => {
                if (grouped[plan.status as TaskStatus]) {
                    grouped[plan.status as TaskStatus].push(plan);
                } else {
                    // If status doesn't match exactly, try to map it to a valid status
                    const mappedStatus = plan.status === 'completed' ? 'success' :
                        plan.status === 'in_progress' ? 'running' :
                            plan.status === 'failed' ? 'failure' : 'pending';
                    grouped[mappedStatus as TaskStatus].push({ ...plan, status: mappedStatus as TaskStatus });
                }
            });
        }

        // Sort items within each status group
        Object.values(grouped).forEach(group => {
            group.sort((a, b) => {
                if (showTasks) {
                    // Sort tasks by step number
                    return ((a as ITask).step_number || 0) - ((b as ITask).step_number || 0);
                } else {
                    // Sort plans by updated_at
                    return new Date(b.updated_at || new Date()).getTime() - new Date(a.updated_at || new Date()).getTime();
                }
            });
        });

        return grouped;
    }, [typedPlans, typedTasks, showTasks]);

    // Use our custom hook for drag and drop logic
    const {
        activeItem,
        sensors,
        handleDragStart,
        handleDragOver,
        handleDragEnd,
        handleDragCancel
    } = useDragAndDrop(showTasks ? typedTasks : typedPlans, itemType, dispatch);

    // Add useEffect to disable parent scrolling during component lifecycle
    useEffect(() => {
        // Find all parent scrollable elements and disable their scrolling
        const disableParentScrolling = () => {
            let parent = document.querySelector('.kanban-container')?.parentElement;
            while (parent && parent !== document.body) {
                const overflow = window.getComputedStyle(parent).overflow;
                if (overflow === 'auto' || overflow === 'scroll') {
                    parent.dataset.originalOverflow = overflow;
                    parent.style.overflow = 'hidden';
                }
                parent = parent.parentElement;
            }
        };

        // Re-enable parent scrolling
        const enableParentScrolling = () => {
            let parent = document.querySelector('.kanban-container')?.parentElement;
            while (parent && parent !== document.body) {
                if (parent.dataset.originalOverflow) {
                    parent.style.overflow = parent.dataset.originalOverflow;
                    delete parent.dataset.originalOverflow;
                }
                parent = parent.parentElement;
            }
        };

        disableParentScrolling();
        return enableParentScrolling;
    }, []);

    // Create a DragOverlay content component
    const DragOverlayContent = ({ item }: { item: IPlan | ITask }) => {
        if (itemType === 'task') {
            return (
                <Box
                    p={3}
                    borderRadius="md"
                    borderWidth="1px"
                    borderColor={colors.selectedBorder}
                    bg={colors.subtleSelectedItemBg}
                    boxShadow="lg"
                    width="250px"
                    opacity={0.9}
                >
                    <Text fontWeight="bold" fontSize="sm" mb={1} color={colors.textColorHeading}>
                        {(item as ITask).task_name}
                    </Text>
                    <Text fontSize="xs" color={colors.textColorMuted} lineClamp={2} mb={2}>
                        {(item as ITask).task_explanation ? (item as ITask).task_explanation!.substring(0, 60) : ''}
                        {(item as ITask).task_explanation && (item as ITask).task_explanation!.length > 60 ? '...' : ''}
                    </Text>
                    <Flex justify="space-between" fontSize="xs" color={colors.textColorMuted}>
                        <Text>
                            {t("step")}: {(item as ITask).step_number || 0}
                        </Text>
                        <Badge colorScheme={getStatusColorScheme((item as ITask).status as TaskStatus)}>
                            {t((item as ITask).status)}
                        </Badge>
                    </Flex>
                </Box>
            );
        } else {
            return (
                <Box
                    p={3}
                    borderRadius="md"
                    borderWidth="1px"
                    borderColor={colors.selectedBorder}
                    bg={colors.subtleSelectedItemBg}
                    boxShadow="lg"
                    width="250px"
                    opacity={0.9}
                >
                    <Text fontWeight="bold" fontSize="sm" mb={1} color={colors.textColorHeading}>
                        {(item as IPlan).plan_name}
                    </Text>
                    <Flex justify="space-between" fontSize="xs" color={colors.textColorMuted}>
                        <Text>
                            {t("progress")}: {(item as IPlan).progress}%
                        </Text>
                        <Badge colorScheme={getStatusColorScheme((item as IPlan).status as PlanStatus)}>
                            {t((item as IPlan).status)}
                        </Badge>
                    </Flex>
                </Box>
            );
        }
    };

    return (
        <>
            {isAIManaged && (
                <Box
                    p={4}
                    mb={4}
                    borderRadius="md"
                    bg={`${colors.accentColor}15`}
                    borderWidth="1px"
                    borderColor={colors.accentColor}
                >
                    <Text color={colors.textColorHeading} fontWeight="medium">
                        {t("drag_and_drop_disabled_message")}
                    </Text>
                </Box>
            )}

            <DndContext
                sensors={sensors}
                collisionDetection={rectIntersection}
                onDragStart={isAIManaged ? undefined : handleDragStart}
                onDragOver={isAIManaged ? undefined : handleDragOver}
                onDragEnd={isAIManaged ? undefined : handleDragEnd}
                onDragCancel={isAIManaged ? undefined : handleDragCancel}
                measuring={{
                    droppable: {
                        strategy: MeasuringStrategy.Always
                    }
                }}
                modifiers={[restrictToWindowEdges]}
            >
                <Flex
                    className={`kanban-outer-container ${className}`}
                    direction="column"
                    width="100%"
                    height="100%"
                    position="relative"
                    overflow="hidden"
                >
                    {!hideViewToggle && (
                        <Flex justify="flex-end" mb={2} className="view-toggle-buttons">
                            <Button
                                size="sm"
                                variant={viewMode === 'kanban' ? 'solid' : 'outline'}
                                colorScheme={viewMode === 'kanban' ? 'green' : 'gray'}
                                onClick={() => onViewModeChange('kanban')}
                                mr={2}
                            >
                                {t("kanban_view")}
                            </Button>
                            <Button
                                size="sm"
                                variant={viewMode === 'calendar' ? 'solid' : 'outline'}
                                colorScheme={viewMode === 'calendar' ? 'blue' : 'gray'}
                                onClick={() => onViewModeChange('calendar')}
                            >
                                {t("calendar_view")}
                            </Button>
                        </Flex>
                    )}

                    {noPlanSelected ? (
                        <Flex
                            justify="center"
                            align="center"
                            height="calc(100% - 10px)"
                            width="100%"
                            bg={colors.timelineBg}
                            borderRadius="md"
                            p={4}
                            direction="column"
                        >
                            <Icon as={FaTasks} boxSize={12} color={colors.textColorMuted} mb={4} />
                            <Text color={colors.textColorMuted} fontSize="lg" fontWeight="medium">
                                {t("select_plan_to_view_tasks")}
                            </Text>
                            <Text color={colors.textColorMuted} fontSize="sm" mt={2} textAlign="center" maxW="400px">
                                {t("no_plan_selected_message")}
                            </Text>
                        </Flex>
                    ) : (
                        <Flex
                            className="kanban-scroll-container"
                            direction="row"
                            gap={2}
                            width="100%"
                            overflowX="auto"
                            overflowY="hidden"
                            pb={4}
                            height="calc(100% - 10px)"
                            maxHeight="calc(100vh - 220px)"
                            bg={colors.timelineBg}
                            p={2}
                            borderRadius="md"
                            alignItems="stretch"
                        >
                            {(Object.keys(itemsByStatus) as TaskStatus[]).map((status) => (
                                <StatusColumn
                                    key={status}
                                    status={status}
                                    items={itemsByStatus[status]}
                                    currentPlanId={currentPlanId}
                                    colors={colors}
                                    itemType={itemType}
                                    onTaskClick={handleTaskClick}
                                />
                            ))}
                        </Flex>
                    )}
                </Flex>

                <DragOverlay dropAnimation={{
                    duration: 200,
                    easing: 'cubic-bezier(0.18, 0.67, 0.6, 1.22)',
                }}>
                    {activeItem ? <DragOverlayContent item={activeItem} /> : null}
                </DragOverlay>
            </DndContext>

            {/* Task Info Modal */}
            <TaskInfoModal
                isOpen={isTaskModalOpen}
                onClose={handleCloseTaskModal}
                task={selectedTask}
                colors={colors}
            />
        </>
    );
};

export default TaskKanban;