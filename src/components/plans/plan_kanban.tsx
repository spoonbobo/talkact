"use client";

import { useTranslations } from "next-intl";
import { useDispatch } from 'react-redux';
import { Box, Text, VStack, Flex, Badge, useToken } from "@chakra-ui/react";
import { usePlansColors } from "@/utils/colors";
import Link from "next/link";
import { IPlan, PlanStatus } from "@/types/plan";
import { getStatusColorScheme } from "@/components/ui/StatusBadge";
import { updatePlanStatus, updatePlanOrders } from "@/store/features/planSlice";
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

interface PlanKanbanProps {
    plans: any[];
    currentPlanId?: string;
    viewMode: 'kanban' | 'calendar';
    onViewModeChange: (mode: 'kanban' | 'calendar') => void;
}

// Draggable plan item component
const SortablePlanItem = ({ plan, isSelected, colors }: { plan: IPlan, isSelected: boolean, colors: any }) => {
    const t = useTranslations("Plans");
    const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
        id: plan.id,
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
        <Link href={`/plans/${plan.id}`} style={{ textDecoration: 'none' }}>
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
                data-plan-id={plan.id}
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
const StatusColumn = ({ status, plans, currentPlanId, colors }: {
    status: PlanStatus,
    plans: IPlan[],
    currentPlanId?: string,
    colors: any
}) => {
    const t = useTranslations("Plans");
    const { setNodeRef: setDroppableNodeRef, isOver } = useDroppable({
        id: `column-${status}`,
        data: {
            type: 'column',
            status: status,
        }
    });

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
                    {plans.length}
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
                    items={plans.map(plan => plan.id)}
                    strategy={verticalListSortingStrategy}
                    id={`sortable-context-${status}`}
                >
                    <VStack align="stretch" gap={2}>
                        {plans.map((plan: IPlan) => (
                            <SortablePlanItem
                                key={plan.id}
                                plan={plan}
                                isSelected={currentPlanId === plan.id}
                                colors={colors}
                            />
                        ))}
                        {plans.length === 0 && (
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
                                    {t("drop_plans_here", { status: t(status) })}
                                </Text>
                            </Flex>
                        )}
                    </VStack>
                </SortableContext>
            </Box>
        </Box>
    );
};

// Drag overlay component for better visual feedback
const DragOverlayContent = ({ plan, colors }: { plan: IPlan | null, colors: any }) => {
    const t = useTranslations("Plans");

    if (!plan) return null;

    return (
        <Box
            p={3}
            borderWidth="1px"
            borderRadius="md"
            borderColor={colors.selectedBorder}
            bg={colors.subtleSelectedItemBg}
            boxShadow="lg"
            width="200px"
            opacity={0.9}
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
    );
};

// Custom hook for drag and drop logic
const useDragAndDrop = (typedPlans: IPlan[], dispatch: AppDispatch) => {
    const [activePlan, setActivePlan] = useState<IPlan | null>(null);
    const t = useTranslations("Plans");

    const sensors = useSensors(
        useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
        useSensor(TouchSensor, { activationConstraint: { delay: 250, tolerance: 5 } }),
        useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
    );

    // Handle drag start
    const handleDragStart = useCallback((event: DragStartEvent) => {
        document.body.classList.add('dragging');
        const { active } = event;
        const plan = typedPlans.find(p => p.id === active.id);
        if (plan) {
            setActivePlan(plan);
            console.log(`Started dragging plan: ${plan.plan_name} (Status: ${plan.status})`);
        }
    }, [typedPlans]);

    // Handle drag over - Simplified (highlighting handled by useDroppable)
    const handleDragOver = useCallback((event: DragOverEvent) => {
        // Basic logging, highlighting is automatic via useDroppable in StatusColumn
        // console.log("Dragging over:", event.over?.id, event.over?.data.current?.type);
    }, []);

    // Handle drag end - Updated to be more robust with ID handling
    const handleDragEnd = useCallback((event: DragEndEvent) => {
        const { active, over } = event;

        // *** LOG: Drag End Triggered ***
        console.log(`[PlanKanban/handleDragEnd] DragEnd event triggered. Active ID: ${active.id}, Over ID: ${over?.id}`);

        if (!over) {
            console.log("[PlanKanban/handleDragEnd] Drag ended outside a droppable area.");
            setActivePlan(null);
            document.body.classList.remove('dragging');
            return;
        }

        const activePlanId = active.id as string;
        const overId = over.id as string;

        // Determine the target status - either from column ID or from the plan it was dropped on
        let targetStatus: PlanStatus | null = null;

        // Check if dropped on a column
        const statusPrefix = "column-";
        if (typeof overId === 'string' && overId.startsWith(statusPrefix)) {
            targetStatus = overId.substring(statusPrefix.length) as PlanStatus;
            console.log(`[PlanKanban/handleDragEnd] Dropped on column with status: ${targetStatus}`);
        }
        // Check if dropped on another plan
        else {
            // Find the plan it was dropped on
            const overPlan = typedPlans.find(p => p.id === overId || p.plan_id === overId);
            if (overPlan) {
                targetStatus = overPlan.status;
                console.log(`[PlanKanban/handleDragEnd] Dropped on plan with status: ${targetStatus}`);
            }
        }

        // Validate if the extracted status is a valid PlanStatus
        const validStatuses: PlanStatus[] = ['pending', 'running', 'success', 'failure', 'terminated'];
        if (targetStatus && !validStatuses.includes(targetStatus)) {
            console.error(`[PlanKanban/handleDragEnd] Extracted invalid status '${targetStatus}'`);
            targetStatus = null; // Reset if invalid
        }

        // Find the plan being dragged - check both id and plan_id
        const activePlan = typedPlans.find(p => p.id === activePlanId || p.plan_id === activePlanId);

        if (!activePlan) {
            console.error(`[PlanKanban/handleDragEnd] Could not find active plan with ID: ${activePlanId}`);
            setActivePlan(null);
            document.body.classList.remove('dragging');
            return;
        }

        const originalStatus = activePlan.status;

        // *** LOG: Plan and Status Info (using extracted status) ***
        console.log(`[PlanKanban/handleDragEnd] Plan: ${activePlanId}, Original Status: ${originalStatus}, Target Status: ${targetStatus}`);

        // *** Use the extracted targetStatus in the condition and dispatch ***
        if (targetStatus && originalStatus !== targetStatus) {
            try {
                // *** LOG: Confirming dispatch (using extracted status) ***
                console.log(`[PlanKanban/handleDragEnd] Dispatching updatePlanStatus for planId: ${activePlan.id || activePlan.plan_id} to status: ${targetStatus}`);

                // Show optimistic UI update
                // toaster.success({
                //     title: t("status_updating"),
                //     description: t("moving_plan_to_status", {
                //         plan: activePlan.plan_name,
                //         status: t(targetStatus)
                //     })
                // });

                // Use the ID that's most likely to be in the Redux store
                const idToUse = activePlan.plan_id || activePlan.id;

                dispatch(updatePlanStatus({ planId: idToUse, status: targetStatus }))
                    .unwrap()
                    .then(() => {
                        console.log(`[PlanKanban/handleDragEnd] updatePlanStatus successful for planId: ${idToUse}`);
                        // toaster.success({
                        //     title: t("status_updated"),
                        //     description: t("plan_moved_to_status", {
                        //         plan: activePlan.plan_name,
                        //         status: t(targetStatus as PlanStatus)
                        //     })
                        // });
                    })
                    .catch(error => {
                        console.error(`[PlanKanban/handleDragEnd] updatePlanStatus failed for planId: ${idToUse}`, error);
                        // Show error message to user
                        // toaster.error({
                        //     title: t("status_update_failed"),
                        //     description: t("could_not_move_plan", {
                        //         plan: activePlan.plan_name,
                        //         status: t(targetStatus as PlanStatus)
                        //     })
                        // });
                    });
            } catch (error) {
                console.error("[PlanKanban/handleDragEnd] Error in dispatch:", error);
                toaster.error({
                    title: t("status_update_failed"),
                    description: t("unexpected_error_occurred")
                });
            }
        } else if (targetStatus && originalStatus === targetStatus) {
            console.log(`[PlanKanban/handleDragEnd] Plan dropped in the same column (${targetStatus}), no status change needed.`);
            // Handle reordering logic here if needed
        } else {
            console.log("[PlanKanban/handleDragEnd] Drop target status was invalid, could not be determined, or status did not change.");
        }

        // Reset states
        setActivePlan(null);
        document.body.classList.remove('dragging');

    }, [typedPlans, dispatch, setActivePlan, t, toaster]);

    // Handle drag cancel - Simplified
    const handleDragCancel = useCallback(() => {
        setActivePlan(null);
        document.body.classList.remove('dragging');
        // Highlighting removal is handled by useDroppable's isOver becoming false
        console.log("Drag cancelled");
    }, []);

    return {
        activePlan,
        sensors,
        handleDragStart,
        handleDragOver,
        handleDragEnd,
        handleDragCancel
    };
};

const PlanKanban = ({ plans, currentPlanId, viewMode, onViewModeChange }: PlanKanbanProps) => {
    const t = useTranslations("Plans");
    const colors = usePlansColors();
    const dispatch = useDispatch<AppDispatch>();
    const [blue100] = useToken('colors', ['blue.100']);

    // Convert string dates to Date objects for all plans
    const typedPlans: IPlan[] = useMemo(() => plans.map((plan: any) => ({
        ...plan,
        created_at: plan.created_at ? new Date(plan.created_at) : new Date(),
        updated_at: plan.updated_at ? new Date(plan.updated_at) : new Date(),
        completed_at: plan.completed_at ? new Date(plan.completed_at) : null
    })), [plans]);

    // Group plans by status for kanban view
    const plansByStatus = useMemo(() => {
        const grouped: Record<PlanStatus, IPlan[]> = {
            pending: [],
            running: [],
            success: [],
            failure: [],
            terminated: []
        };
        typedPlans.forEach(plan => {
            if (grouped[plan.status]) {
                grouped[plan.status].push(plan);
            }
        });
        // TODO: Add sorting within each status group if needed (e.g., by updated_at or a specific order)
        // Object.values(grouped).forEach(group => group.sort((a, b) => (a.updated_at < b.updated_at ? 1 : -1)));
        return grouped;
    }, [typedPlans]);

    // Use our custom hook for drag and drop logic, passing typedPlans
    const {
        activePlan,
        sensors,
        handleDragStart,
        handleDragOver,
        handleDragEnd,
        handleDragCancel
    } = useDragAndDrop(typedPlans, dispatch);

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

    return (
        <DndContext
            sensors={sensors}
            collisionDetection={rectIntersection}
            onDragStart={handleDragStart}
            onDragOver={handleDragOver}
            onDragEnd={handleDragEnd}
            onDragCancel={handleDragCancel}
            measuring={{
                droppable: {
                    strategy: MeasuringStrategy.Always
                }
            }}
            modifiers={[restrictToWindowEdges]}
        >
            <Flex
                className="kanban-outer-container"
                direction="column"
                width="100%"
                height="100%"
                position="relative"
                overflow="hidden"
            >
                <Flex
                    className="kanban-scroll-container"
                    direction="row"
                    gap={2}
                    width="100%"
                    overflowX="auto"
                    overflowY="hidden"
                    pb={4}
                    height="100%"
                    bg={colors.timelineBg}
                    p={2}
                    borderRadius="md"
                    alignItems="stretch"
                >
                    {(Object.keys(plansByStatus) as PlanStatus[]).map((status) => (
                        <StatusColumn
                            key={status}
                            status={status}
                            plans={plansByStatus[status]}
                            currentPlanId={currentPlanId}
                            colors={colors}
                        />
                    ))}
                </Flex>
            </Flex>

            <DragOverlay dropAnimation={{
                duration: 200,
                easing: 'cubic-bezier(0.18, 0.67, 0.6, 1.22)',
            }}>
                {activePlan ? <DragOverlayContent plan={activePlan} colors={colors} /> : null}
            </DragOverlay>
        </DndContext>
    );
};

export default PlanKanban;
