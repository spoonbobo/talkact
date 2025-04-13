"use client";

import { useTranslations } from "next-intl";
import { Box, Text, Flex, IconButton, Grid, GridItem, Icon } from "@chakra-ui/react";
import { FaArrowLeft, FaArrowRight, FaCalendarAlt, FaColumns } from "react-icons/fa";
import { Tooltip } from "@/components/ui/tooltip";
import { usePlansColors } from "@/utils/colors";
import Link from "next/link";
import { IPlan } from "@/types/plan";
import { useState, useEffect } from "react";
import StatusBadge from "@/components/ui/StatusBadge";

interface PlanCalendarProps {
    plans: any[];
    currentPlanId?: string;
    viewMode: 'kanban' | 'calendar';
    onViewModeChange: (mode: 'kanban' | 'calendar') => void;
}

const PlanCalendar = ({ plans, currentPlanId, viewMode, onViewModeChange }: PlanCalendarProps) => {
    const t = useTranslations("Plans");
    const colors = usePlansColors();
    const [currentDate, setCurrentDate] = useState(new Date());
    const [calendarDays, setCalendarDays] = useState<Date[]>([]);

    // Generate calendar days for the current month
    useEffect(() => {
        const year = currentDate.getFullYear();
        const month = currentDate.getMonth();

        // Get first day of month
        const firstDay = new Date(year, month, 1);
        // Get last day of month
        const lastDay = new Date(year, month + 1, 0);

        // Get day of week for first day (0 = Sunday, 6 = Saturday)
        const firstDayOfWeek = firstDay.getDay();

        // Calculate days from previous month to show
        const daysFromPrevMonth = firstDayOfWeek;

        // Calculate total days to show (previous month days + current month days)
        const totalDays = daysFromPrevMonth + lastDay.getDate();

        // Calculate rows needed (7 days per row)
        const rows = Math.ceil(totalDays / 7);

        // Calculate total cells in calendar
        const totalCells = rows * 7;

        // Generate array of dates
        const days: Date[] = [];

        // Add days from previous month
        const prevMonth = new Date(year, month - 1, 0);
        const prevMonthDays = prevMonth.getDate();

        for (let i = prevMonthDays - daysFromPrevMonth + 1; i <= prevMonthDays; i++) {
            days.push(new Date(year, month - 1, i));
        }

        // Add days from current month
        for (let i = 1; i <= lastDay.getDate(); i++) {
            days.push(new Date(year, month, i));
        }

        // Add days from next month
        const remainingCells = totalCells - days.length;
        for (let i = 1; i <= remainingCells; i++) {
            days.push(new Date(year, month + 1, i));
        }

        setCalendarDays(days);
    }, [currentDate]);

    // Get plans for a specific day
    const getPlansForDay = (day: Date) => {
        return plans.filter((plan: any) => {
            const planDate = new Date(plan.created_at);
            return planDate.getDate() === day.getDate() &&
                planDate.getMonth() === day.getMonth() &&
                planDate.getFullYear() === day.getFullYear();
        });
    };

    // Format date for display
    const formatDate = (date: Date): string => {
        return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
    };

    // Format time for display
    const formatTime = (date: Date): string => {
        return date.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
    };

    // Check if date is in current month
    const isCurrentMonth = (date: Date): boolean => {
        return date.getMonth() === currentDate.getMonth();
    };

    // Check if date is today
    const isToday = (date: Date): boolean => {
        const today = new Date();
        return date.getDate() === today.getDate() &&
            date.getMonth() === today.getMonth() &&
            date.getFullYear() === today.getFullYear();
    };

    // Navigate to previous month
    const prevMonth = () => {
        setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
    };

    // Navigate to next month
    const nextMonth = () => {
        setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
    };

    // Navigate to today
    const goToToday = () => {
        setCurrentDate(new Date());
    };

    // Day of week headers
    const weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

    return (
        <Box width="100%" height="100%">
            <Box
                bg={colors.cardBg}
                borderRadius="md"
                borderWidth="1px"
                borderColor={colors.borderColor}
                height="100%"
                display="flex"
                flexDirection="column"
                overflow="hidden"
            >
                {/* Calendar header */}
                <Flex
                    justify="space-between"
                    align="center"
                    p={3}
                    borderBottomWidth="1px"
                    borderColor={colors.borderColor}
                    bg={colors.bgSubtle}
                >
                    <Flex>
                        <IconButton
                            aria-label="Previous month"
                            size="sm"
                            variant="ghost"
                            onClick={prevMonth}
                            mr={1}
                        >
                            <Icon as={FaArrowLeft} />
                        </IconButton>
                        <IconButton
                            aria-label="Next month"
                            size="sm"
                            variant="ghost"
                            onClick={nextMonth}
                        >
                            <Icon as={FaArrowRight} />
                        </IconButton>
                    </Flex>

                    <Text fontWeight="bold">
                        {currentDate.toLocaleDateString(undefined, { month: 'long', year: 'numeric' })}
                    </Text>

                    {/* <IconButton
                        aria-label="Today"
                        size="sm"
                        onClick={goToToday}
                    >
                        {t("today")}
                    </IconButton> */}
                </Flex>

                {/* Calendar body - make it fill available space */}
                <Box p={2} flex="1" overflow="hidden" display="flex" flexDirection="column">
                    {/* Weekday headers */}
                    <Grid templateColumns="repeat(7, 1fr)" gap={1} mb={1} position="sticky" top="0" bg={colors.cardBg} zIndex={1}>
                        {weekDays.map((day) => (
                            <GridItem key={day} textAlign="center">
                                <Text fontSize="sm" fontWeight="bold" color={colors.textColorMuted}>
                                    {day}
                                </Text>
                            </GridItem>
                        ))}
                    </Grid>

                    {/* Calendar days - use auto-fill available space */}
                    <Grid
                        templateColumns="repeat(7, 1fr)"
                        templateRows={`repeat(${Math.ceil(calendarDays.length / 7)}, 1fr)`}
                        gap={1}
                        flex="1"
                        overflow="hidden"
                    >
                        {calendarDays.map((day, index) => {
                            const dayPlans = getPlansForDay(day);
                            const isCurrentMonthDay = isCurrentMonth(day);
                            const isTodayDay = isToday(day);
                            const hasPlans = dayPlans.length > 0;

                            return (
                                <GridItem
                                    key={index}
                                    bg={isTodayDay ? `${colors.accentColor}10` : isCurrentMonthDay ? colors.cardBg : colors.bgSubtle}
                                    borderWidth="1px"
                                    borderColor={isTodayDay ? colors.accentColor : hasPlans ? `${colors.accentColor}40` : colors.borderColor}
                                    borderRadius="md"
                                    p={1}
                                    position="relative"
                                    display="flex"
                                    flexDirection="column"
                                    overflow="hidden"
                                    maxHeight="100%"
                                    _hover={{
                                        borderColor: hasPlans ? colors.accentColor : colors.borderColor,
                                        boxShadow: hasPlans ? "0 0 0 1px " + colors.accentColor : "none"
                                    }}
                                    transition="all 0.2s"
                                >
                                    {/* Date header */}
                                    <Flex
                                        justify="space-between"
                                        align="center"
                                        mb={1}
                                        borderBottomWidth={hasPlans ? "1px" : "0"}
                                        borderColor={colors.borderColor}
                                        pb={1}
                                        flexShrink={0}
                                    >
                                        <Text
                                            fontSize="sm"
                                            fontWeight={isTodayDay ? "bold" : "normal"}
                                            color={isCurrentMonthDay ? colors.textColor : colors.textColorMuted}
                                        >
                                            {day.getDate()}
                                        </Text>
                                        {isTodayDay && (
                                            <Text
                                                fontSize="xs"
                                                fontWeight="bold"
                                                color={colors.accentColor}
                                                bg={`${colors.accentColor}20`}
                                                px={1}
                                                borderRadius="sm"
                                            >
                                                {t("today")}
                                            </Text>
                                        )}
                                    </Flex>

                                    {/* Plans list with improved scrolling */}
                                    <Box
                                        flex="1"
                                        overflowY="auto"
                                        overflowX="hidden"
                                        minHeight="0"
                                        css={{
                                            '&::-webkit-scrollbar': {
                                                width: '4px',
                                            },
                                            '&::-webkit-scrollbar-track': {
                                                background: 'transparent',
                                            },
                                            '&::-webkit-scrollbar-thumb': {
                                                background: colors.borderColor,
                                                borderRadius: '4px',
                                            },
                                            '&::-webkit-scrollbar-thumb:hover': {
                                                background: colors.textColorMuted,
                                            },
                                            'scrollbarWidth': 'thin',
                                            'scrollbarColor': `${colors.borderColor} transparent`
                                        }}
                                    >
                                        {dayPlans.length > 0 ? (
                                            dayPlans.map((plan: any) => {
                                                // Convert string dates to Date objects
                                                const typedPlan: IPlan = {
                                                    ...plan,
                                                    created_at: plan.created_at ? new Date(plan.created_at) : new Date(),
                                                    updated_at: plan.updated_at ? new Date(plan.updated_at) : new Date(),
                                                    completed_at: plan.completed_at ? new Date(plan.completed_at) : null
                                                };

                                                const isSelected = currentPlanId === typedPlan.id;

                                                return (
                                                    <Tooltip
                                                        key={typedPlan.id}
                                                        content={`${typedPlan.plan_name} - ${formatTime(typedPlan.created_at)}`}
                                                    >
                                                        <Link
                                                            href={`/plans/${typedPlan.id}`}
                                                            style={{ textDecoration: 'none' }}
                                                        >
                                                            <Box
                                                                p={1}
                                                                mb={1}
                                                                borderRadius="sm"
                                                                bg={isSelected ? colors.subtleSelectedItemBg : colors.planItemBg}
                                                                _hover={{
                                                                    bg: colors.subtleSelectedItemBg,
                                                                }}
                                                                transition="background 0.2s"
                                                            >
                                                                {/* Simplified plan item layout */}
                                                                <Flex align="center" mb={0.5}>
                                                                    <StatusBadge
                                                                        status={typedPlan.status}
                                                                        size="sm"
                                                                        variant="subtle"
                                                                        mr={1}
                                                                    />
                                                                    <Text fontSize="xs" fontWeight="medium" lineClamp={1} flex="1">
                                                                        {typedPlan.plan_name}
                                                                    </Text>
                                                                </Flex>

                                                                {/* Progress bar */}
                                                                {typedPlan.progress !== undefined && (
                                                                    <Box
                                                                        height="2px"
                                                                        width="100%"
                                                                        bg={colors.borderColor}
                                                                        borderRadius="full"
                                                                        overflow="hidden"
                                                                    >
                                                                        <Box
                                                                            height="100%"
                                                                            width={`${typedPlan.progress}%`}
                                                                            bg={colors.accentColor}
                                                                        />
                                                                    </Box>
                                                                )}
                                                            </Box>
                                                        </Link>
                                                    </Tooltip>
                                                );
                                            })
                                        ) : (
                                            <Box height="100%" />
                                        )}
                                    </Box>
                                </GridItem>
                            );
                        })}
                    </Grid>
                </Box>
            </Box>
        </Box>
    );
};

export default PlanCalendar;