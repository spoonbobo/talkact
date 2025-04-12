"use client";

import { useTranslations } from "next-intl";
import { useDispatch } from 'react-redux';
import { Box, Text, VStack, Flex, Badge, IconButton, Icon } from "@chakra-ui/react";
import { usePlansColors } from "@/utils/colors";
import Link from "next/link";
import { IPlan, PlanStatus } from "@/types/plan";
import { getStatusColorScheme } from "@/components/ui/StatusBadge";
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { updatePlanStatus } from "@/store/features/planSlice";
import { AppDispatch } from "@/store/store";
import { FaCalendarAlt, FaColumns } from "react-icons/fa";

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

const PlanKanban = ({ plans, currentPlanId, viewMode, onViewModeChange }: PlanKanbanProps) => {
    const t = useTranslations("Plans");
    const colors = usePlansColors();
    const dispatch = useDispatch<AppDispatch>();

    // Group plans by status for kanban view
    const plansByStatus = {
        pending: plans.filter((plan: any) => plan.status === 'pending'),
        running: plans.filter((plan: any) => plan.status === 'running'),
        success: plans.filter((plan: any) => plan.status === 'success'),
        failure: plans.filter((plan: any) => plan.status === 'failure'),
        terminated: plans.filter((plan: any) => plan.status === 'terminated')
    };

    // Handle drag end for kanban items
    const handleDragEnd = (result: any) => {
        if (!result.destination) return;

        const { source, destination, draggableId } = result;

        // If dropped in a different column (status changed)
        if (source.droppableId !== destination.droppableId) {
            const newStatus = destination.droppableId as PlanStatus;

            // Dispatch action to update plan status
            dispatch(updatePlanStatus({ planId: draggableId, status: newStatus }));

            console.log(`Plan ${draggableId} status changed from ${source.droppableId} to ${newStatus}`);
        }
    };

    return (
        <DragDropContext onDragEnd={handleDragEnd}>
            <Flex direction="column" width="100%" height="100%">
                <Flex
                    direction="row"
                    gap={4}
                    width="100%"
                    overflowX="auto"
                    pb={2}
                    height="100%"
                    bg={colors.timelineBg}
                    p={3}
                    borderRadius="md"
                >
                    {Object.entries(plansByStatus).map(([status, statusPlans]) => (
                        <Box
                            key={status}
                            flex="1"
                            minWidth="200px"
                            borderWidth="1px"
                            borderRadius="md"
                            borderColor={colors.borderColor}
                            bg={colors.cardBg}
                            height="100%"
                            display="flex"
                            flexDirection="column"
                            boxShadow={colors.cardShadow}
                            _hover={{
                                borderColor: colors.borderColorSubtle,
                                boxShadow: colors.selectedCardShadow
                            }}
                            transition="all 0.2s"
                        >
                            <Flex
                                p={2}
                                borderBottomWidth="1px"
                                borderColor={colors.borderColor}
                                bg={`${getStatusColorScheme(status as PlanStatus)}.50`}
                                borderTopRadius="md"
                                align="center"
                                justify="space-between"
                            >
                                <Flex align="center" gap={2}>
                                    <Box
                                        w={2}
                                        h={2}
                                        borderRadius="full"
                                        bg={colors[`status${status.charAt(0).toUpperCase() + status.slice(1)}` as keyof typeof colors] ||
                                            `${getStatusColorScheme(status as PlanStatus)}.500`}
                                    />
                                    <Text
                                        fontWeight="bold"
                                        fontSize="sm"
                                        color={colors.textColorHeading}
                                    >
                                        {t(status)}
                                    </Text>
                                </Flex>
                                <Badge
                                    borderRadius="full"
                                    px={2}
                                    size="sm"
                                    colorScheme={getStatusColorScheme(status as PlanStatus)}
                                    bg={`${getStatusColorScheme(status as PlanStatus)}.100`}
                                    color={`${getStatusColorScheme(status as PlanStatus)}.800`}
                                >
                                    {statusPlans.length}
                                </Badge>
                            </Flex>

                            <Droppable droppableId={status}>
                                {(provided, snapshot) => (
                                    <Box
                                        ref={provided.innerRef}
                                        {...provided.droppableProps}
                                        bg={snapshot.isDraggingOver ? colors.selectedItemBg : colors.cardBg}
                                        borderBottomRadius="md"
                                        transition="background-color 0.2s"
                                        minHeight="50px"
                                        p={2}
                                        flex="1"
                                        overflowY="auto"
                                        css={{
                                            '&::-webkit-scrollbar': {
                                                width: '8px',
                                            },
                                            '&::-webkit-scrollbar-track': {
                                                background: colors.bgSubtle,
                                            },
                                            '&::-webkit-scrollbar-thumb': {
                                                background: colors.borderColor,
                                                borderRadius: '4px',
                                            },
                                            '&::-webkit-scrollbar-thumb:hover': {
                                                background: colors.textColorMuted,
                                            }
                                        }}
                                    >
                                        {statusPlans.length > 0 ? (
                                            <VStack align="stretch" gap={2}>
                                                {statusPlans.map((plan: any, index: number) => {
                                                    // Convert string dates to Date objects
                                                    const typedPlan: IPlan = {
                                                        ...plan,
                                                        created_at: plan.created_at ? new Date(plan.created_at) : new Date(),
                                                        updated_at: plan.updated_at ? new Date(plan.updated_at) : new Date(),
                                                        completed_at: plan.completed_at ? new Date(plan.completed_at) : null
                                                    };

                                                    const isSelected = currentPlanId === typedPlan.id;

                                                    return (
                                                        <Draggable
                                                            key={typedPlan.id}
                                                            draggableId={typedPlan.id}
                                                            index={index}
                                                        >
                                                            {(provided, snapshot) => (
                                                                <Link
                                                                    href={`/plans/${typedPlan.id}`}
                                                                    style={{ textDecoration: 'none' }}
                                                                >
                                                                    <Box
                                                                        ref={provided.innerRef}
                                                                        {...provided.draggableProps}
                                                                        {...provided.dragHandleProps}
                                                                        p={3}
                                                                        borderWidth="1px"
                                                                        borderRadius="md"
                                                                        borderColor={isSelected ? colors.selectedBorder : colors.borderColor}
                                                                        bg={isSelected ? colors.subtleSelectedItemBg :
                                                                            snapshot.isDragging ? colors.subtleSelectedItemBg : colors.planItemBg}
                                                                        boxShadow={snapshot.isDragging ? "lg" : isSelected ? colors.selectedCardShadow : "sm"}
                                                                        cursor="grab"
                                                                        _hover={{
                                                                            boxShadow: isSelected ? colors.selectedCardShadow : colors.cardShadow,
                                                                            borderColor: colors.selectedBorderColor,
                                                                            bg: isSelected ? colors.subtleSelectedItemBg : colors.planItemHoverBg
                                                                        }}
                                                                        transition="all 0.2s"
                                                                    >
                                                                        <Flex justify="space-between" align="center" mb={1}>
                                                                            <Text fontWeight="bold" fontSize="sm" lineClamp={1} color={colors.textColorHeading}>
                                                                                {typedPlan.plan_name.substring(0, 30)}
                                                                                {typedPlan.plan_name.length > 30 ? '...' : ''}
                                                                            </Text>
                                                                        </Flex>
                                                                        <Flex justify="space-between" align="center">
                                                                            <Text fontSize="xs" color={colors.textColorMuted}>
                                                                                {t("progress")}: {typedPlan.progress}%
                                                                            </Text>
                                                                            <Text fontSize="xs" color={colors.textColorMuted}>
                                                                                {formatDate(typedPlan.updated_at)}
                                                                            </Text>
                                                                        </Flex>
                                                                    </Box>
                                                                </Link>
                                                            )}
                                                        </Draggable>
                                                    );
                                                })}
                                            </VStack>
                                        ) : (
                                            <Box
                                                p={3}
                                                textAlign="center"
                                                color={colors.textColorMuted}
                                                fontSize="sm"
                                                fontStyle="italic"
                                                borderWidth="1px"
                                                borderRadius="md"
                                                borderColor={colors.borderColor}
                                                borderStyle="dashed"
                                                bg={colors.emptyBg}
                                            >
                                                {t("no_plans_in_status")}
                                            </Box>
                                        )}
                                        {provided.placeholder}
                                    </Box>
                                )}
                            </Droppable>
                        </Box>
                    ))}
                </Flex>
            </Flex>
        </DragDropContext>
    );
};

export default PlanKanban;
