"use client";

import { useTranslations } from "next-intl";
import { useSession } from "next-auth/react";
import { useSelector, useDispatch } from 'react-redux';
import { RootState, AppDispatch } from "@/store/store";
import { useEffect, useState, useRef } from "react";
import { useRouter, usePathname } from "next/navigation";
import { motion } from "framer-motion";
import { Box, Heading, Icon, Container, Text, VStack, Flex, Spinner, Badge, Input, HStack, Button, IconButton } from "@chakra-ui/react";
import { FaTasks, FaSearch, FaColumns, FaCalendarAlt } from "react-icons/fa";
import { FiChevronRight, FiChevronLeft } from "react-icons/fi";
import { fetchPlans, updateContainerWidth, updateSidebarWidth, updatePlanStatus, updateViewMode } from "@/store/features/planSlice";
import { usePlansColors } from "@/utils/colors";
import { IPlan, PlanStatus } from "@/types/plan";
import { Global, css } from '@emotion/react';
import PlanKanban from "@/components/plans/plan_kanban";
import PlanCalendar from "@/components/plans/plan_calendar";

const MotionBox = motion(Box);

// Use typed dispatch
const useAppDispatch = () => useDispatch<AppDispatch>();

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

export default function PlansLayout({ children }: { children: React.ReactNode }) {
    const t = useTranslations("Plans");
    const router = useRouter();
    const pathname = usePathname();
    const { data: session } = useSession();
    const dispatch = useAppDispatch();

    const { isAuthenticated, isLoading: userLoading, isOwner } = useSelector(
        (state: RootState) => state.user
    );

    const { plans, loading, layout } = useSelector(
        (state: RootState) => state.plan
    );

    const { currentUser } = useSelector(
        (state: RootState) => state.user
    );

    const colors = usePlansColors();

    // Add state for search, filter, and pagination
    const [searchQuery, setSearchQuery] = useState("");
    const [statusFilter, setStatusFilter] = useState<PlanStatus | "all">("all");
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 10; // Number of plans per page

    // Add state for resizing
    const [resizing, setResizing] = useState(false);
    const [resizeStartPosition, setResizeStartPosition] = useState(0);
    const [sidebarWidth, setSidebarWidth] = useState(layout.sidebarWidth);
    const sidebarRef = useRef<HTMLDivElement>(null);
    const MIN_SIDEBAR_WIDTH_PERCENT = 50; // Minimum 50% of container width
    const MAX_SIDEBAR_WIDTH_PERCENT = 80; // Maximum 80% of container width
    const INITIAL_SIDEBAR_WIDTH_PERCENT = 70; // Initial 70% of container width

    // Add state for container resizing
    const [containerResizing, setContainerResizing] = useState(false);
    const [containerResizeEdge, setContainerResizeEdge] = useState<'left' | 'right' | null>(null);
    const [containerWidth, setContainerWidth] = useState(layout.containerWidth);
    const [containerLeft, setContainerLeft] = useState<number | null>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const CONTAINER_MIN_WIDTH = 800; // Minimum container width
    const MARGIN_PERCENT = 5; // 5% margin from window edges

    // Add this constant near your other constants
    const MIN_CONTAINER_WIDTH_PERCENT = 50; // Minimum width as percentage of window

    // Update the viewMode state to use Redux
    // const [viewMode, setViewMode] = useState<'kanban' | 'calendar'>('kanban');

    // Fetch plans on component mount
    useEffect(() => {
        if (isAuthenticated) {
            console.log("Fetching plans...");
            dispatch(fetchPlans());
        }
    }, [isAuthenticated, dispatch]);

    // Reset to first page when filters change
    useEffect(() => {
        setCurrentPage(1);
    }, [searchQuery, statusFilter]);


    useEffect(() => {
        if (!isAuthenticated) {
            router.push("/signin");
        }
    }, [isAuthenticated, router]);

    // // Add this after fetching plans
    // useEffect(() => {
    //     if (plans.length > 0 && currentUser) {
    //         console.log("All plans:", plans);
    //         console.log("User active rooms:", currentUser.active_rooms);

    //         // Check which plans match active rooms
    //         const plansInActiveRooms = plans.filter(plan =>
    //             currentUser.active_rooms?.includes(plan.room_id)
    //         );
    //         console.log("Plans in active rooms:", plansInActiveRooms);

    //         // Check if the specific plan exists
    //         const specificPlan = plans.find(plan =>
    //             plan.plan_id === "2540061f-031f-4050-8061-25f0e07a6600"
    //         );
    //         console.log("Specific plan found:", specificPlan);
    //     }
    // }, [plans, currentUser]);

    // Log Redux state on mount to verify it's loading correctly
    useEffect(() => {
        console.log("Redux layout state:", layout);
    }, []);

    // Handle resize start
    const handleResizeStart = (e: React.MouseEvent) => {
        e.preventDefault();
        setResizing(true);
        setResizeStartPosition(e.clientX);
    };

    // Update sidebar resize effect
    useEffect(() => {
        const handleMouseMove = (e: MouseEvent) => {
            if (resizing && sidebarRef.current && containerRef.current) {
                const containerWidth = containerRef.current.getBoundingClientRect().width;
                const minWidth = containerWidth * (MIN_SIDEBAR_WIDTH_PERCENT / 100);
                const maxWidth = containerWidth * (MAX_SIDEBAR_WIDTH_PERCENT / 100);

                const deltaX = e.clientX - resizeStartPosition;
                const newWidth = Math.max(
                    minWidth,
                    Math.min(maxWidth, sidebarWidth + deltaX)
                );

                // Update local state
                setSidebarWidth(newWidth);

                // Update DOM directly
                sidebarRef.current.style.width = `${newWidth}px`;

                // Update Redux immediately
                dispatch(updateSidebarWidth(newWidth));

                setResizeStartPosition(e.clientX);
            }
        };

        const handleMouseUp = () => {
            if (resizing) {
                // Final update to Redux
                dispatch(updateSidebarWidth(sidebarWidth));
                console.log("Saved sidebar width to Redux:", sidebarWidth);
            }
            setResizing(false);
        };

        if (resizing) {
            document.addEventListener('mousemove', handleMouseMove);
            document.addEventListener('mouseup', handleMouseUp);
        }

        return () => {
            document.removeEventListener('mousemove', handleMouseMove);
            document.removeEventListener('mouseup', handleMouseUp);
        };
    }, [resizing, resizeStartPosition, sidebarWidth, dispatch]);

    // Handle container resize
    const handleContainerResizeStart = (e: React.MouseEvent, edge: 'left' | 'right') => {
        e.preventDefault();
        e.stopPropagation();

        if (!containerRef.current) return;

        const rect = containerRef.current.getBoundingClientRect();
        setContainerResizing(true);
        setContainerResizeEdge(edge);
        setContainerWidth(rect.width);
        setContainerLeft(rect.left);
        setResizeStartPosition(e.clientX);
    };

    // Update container resize effect
    useEffect(() => {
        const handleMouseMove = (e: MouseEvent) => {
            if (!containerResizing || !containerResizeEdge || containerWidth === null) return;

            const deltaX = e.clientX - resizeStartPosition;
            const windowWidth = window.innerWidth;
            const minMargin = windowWidth * (MARGIN_PERCENT / 100);

            // Calculate minimum width based on percentage of window width
            const minWidthFromPercent = windowWidth * (MIN_CONTAINER_WIDTH_PERCENT / 100);
            const effectiveMinWidth = Math.max(CONTAINER_MIN_WIDTH, minWidthFromPercent);

            let newWidth;

            if (containerResizeEdge === 'right') {
                // Resize from right edge
                newWidth = Math.max(effectiveMinWidth, Math.min(windowWidth - (minMargin * 2), containerWidth + deltaX));
            } else {
                // Resize from left edge
                newWidth = Math.max(effectiveMinWidth, Math.min(windowWidth - (minMargin * 2), containerWidth - deltaX));
            }

            // Update local state
            setContainerWidth(newWidth);

            // Update DOM directly
            if (containerRef.current) {
                containerRef.current.style.width = `${newWidth}px`;
                containerRef.current.style.maxWidth = `${newWidth}px`;
            }

            // Update Redux immediately
            dispatch(updateContainerWidth(newWidth));

            setResizeStartPosition(e.clientX);
        };

        const handleMouseUp = () => {
            if (containerResizing && containerWidth !== null) {
                // Final update to Redux
                dispatch(updateContainerWidth(containerWidth));
                console.log("Saved container width to Redux:", containerWidth);
            }
            setContainerResizing(false);
            setContainerResizeEdge(null);
        };

        if (containerResizing) {
            document.addEventListener('mousemove', handleMouseMove);
            document.addEventListener('mouseup', handleMouseUp);
            document.body.style.userSelect = 'none';
        }

        return () => {
            document.removeEventListener('mousemove', handleMouseMove);
            document.removeEventListener('mouseup', handleMouseUp);
            document.body.style.userSelect = '';
        };
    }, [containerResizing, containerResizeEdge, containerWidth, resizeStartPosition, dispatch]);

    // Initialize container dimensions on mount
    useEffect(() => {
        if (containerRef.current && containerWidth === null) {
            const rect = containerRef.current.getBoundingClientRect();
            setContainerWidth(rect.width);
            setContainerLeft(rect.left);
        }
    }, [containerWidth]);

    // Initialize from Redux state
    useEffect(() => {
        // Apply saved sidebar width from Redux or use initial width
        if (sidebarRef.current && containerRef.current) {
            const containerWidth = containerRef.current.getBoundingClientRect().width;
            const minWidth = containerWidth * (MIN_SIDEBAR_WIDTH_PERCENT / 100);
            const maxWidth = containerWidth * (MAX_SIDEBAR_WIDTH_PERCENT / 100);
            const initialWidth = containerWidth * (INITIAL_SIDEBAR_WIDTH_PERCENT / 100);

            // Use saved width from Redux if available, otherwise use initial width
            const savedWidth = layout.sidebarWidth || initialWidth;

            // Ensure width is within constraints
            const constrainedWidth = Math.max(
                Math.min(savedWidth, maxWidth),
                minWidth
            );

            setSidebarWidth(constrainedWidth);
            sidebarRef.current.style.width = `${constrainedWidth}px`;

            // Update Redux if we had to constrain the width
            if (constrainedWidth !== layout.sidebarWidth) {
                dispatch(updateSidebarWidth(constrainedWidth));
            }
        }

        // Apply saved container width from Redux
        if (layout.containerWidth && containerRef.current) {
            setContainerWidth(layout.containerWidth);
            containerRef.current.style.width = `${layout.containerWidth}px`;
            containerRef.current.style.maxWidth = `${layout.containerWidth}px`;
        }
    }, []);

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

    // Add a handler for view mode changes that updates Redux
    const handleViewModeChange = (mode: 'kanban' | 'calendar') => {
        dispatch(updateViewMode(mode));
    };

    if (!isAuthenticated) {
        return null;
    }

    // Show loading state while checking authentication
    if (userLoading || !session) {
        return null;
    }


    // Redirect if not authenticated
    if (!isAuthenticated && !session) {
        return null; // Show loading instead of direct navigation
    }

    // Extract the current plan ID from the pathname
    const currentPlanId = pathname.split('/').pop();
    const isDetailView = pathname !== '/plans' && pathname !== '/plans/';

    // Filter plans based on search query, status filter, and user's active rooms
    const filteredPlans = plans
        .filter((plan: any) => {
            const matchesSearch = plan.plan_overview.toLowerCase().includes(searchQuery.toLowerCase()) ||
                plan.plan_name.toLowerCase().includes(searchQuery.toLowerCase());
            const matchesStatus = statusFilter === "all" || plan.status === statusFilter;
            const isInActiveRooms = currentUser?.active_rooms?.includes(plan.room_id);
            return matchesSearch && matchesStatus && isInActiveRooms;
        })
        .sort((a: any, b: any) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime());

    // Calculate pagination
    const totalPages = Math.ceil(filteredPlans.length / itemsPerPage);
    const paginatedPlans = filteredPlans.slice(
        (currentPage - 1) * itemsPerPage,
        currentPage * itemsPerPage
    );

    // Status filter options with their respective colors
    const statusOptions: Array<{ value: PlanStatus | "all", label: string }> = [
        { value: "all", label: "All" },
        { value: "pending", label: "Pending" },
        { value: "running", label: "Running" },
        { value: "success", label: "Success" },
        { value: "failure", label: "Failure" },
        { value: "terminated", label: "Terminated" }
    ];

    // Group plans by status for kanban view
    const plansByStatus = {
        pending: filteredPlans.filter((plan: any) => plan.status === 'pending'),
        running: filteredPlans.filter((plan: any) => plan.status === 'running'),
        success: filteredPlans.filter((plan: any) => plan.status === 'success'),
        failure: filteredPlans.filter((plan: any) => plan.status === 'failure'),
        terminated: filteredPlans.filter((plan: any) => plan.status === 'terminated')
    };

    return (
        <>
            {/* Global styles to override parent constraints */}
            <Global
                styles={css`
                    body > div, 
                    #__next, 
                    #__next > div, 
                    main, 
                    main > div, 
                    main > div > div {
                        overflow: visible !important;
                        max-width: none !important;
                    }
                    
                    .chakra-container {
                        max-width: none !important;
                        overflow: visible !important;
                    }
                `}
            />

            <Box
                width="100%"
                height="100%"
                overflow="visible"
                position="relative"
                display="flex"
                justifyContent="center"
                maxWidth="none !important"
                css={{
                    '& > *': {
                        maxWidth: 'none !important',
                        overflow: 'visible !important'
                    }
                }}
            >
                <Container
                    ref={containerRef}
                    maxW="none"
                    width={containerWidth ? `${containerWidth}px` : "90%"}
                    px={{ base: 4, md: 6, lg: 8 }}
                    py={4}
                    height="calc(100% - 10px)"
                    position="relative"
                    overflow="visible"
                    css={{
                        maxWidth: containerWidth ? `${containerWidth}px !important` : "90% !important",
                        transition: containerResizing ? 'none' : 'width 0.2s',
                        '&:hover .resize-handle': {
                            opacity: 0.7
                        },
                        overflow: 'visible !important'
                    }}
                >
                    {/* Resize handles */}
                    <Box
                        className="resize-handle"
                        position="absolute"
                        left="-4px"
                        top="0"
                        width="8px"
                        height="100%"
                        cursor="ew-resize"
                        opacity={0}
                        zIndex={100}
                        _hover={{ opacity: 0.7, bg: `${colors.accentColor}33` }}
                        onMouseDown={(e) => handleContainerResizeStart(e, 'left')}
                        bg={containerResizing && containerResizeEdge === 'left' ? colors.accentColor : 'transparent'}
                    />

                    <Box
                        className="resize-handle"
                        position="absolute"
                        right="-4px"
                        top="0"
                        width="8px"
                        height="100%"
                        cursor="ew-resize"
                        opacity={0}
                        zIndex={100}
                        _hover={{ opacity: 0.7, bg: `${colors.accentColor}33` }}
                        onMouseDown={(e) => handleContainerResizeStart(e, 'right')}
                        bg={containerResizing && containerResizeEdge === 'right' ? colors.accentColor : 'transparent'}
                    />

                    <MotionBox
                        width="100%"
                        height="100%"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ duration: 0.5 }}
                        display="flex"
                        flexDirection="column"
                        overflow="visible"
                        position="relative"
                    >
                        <Flex justify="space-between" align="center" mb={6}>
                            <Heading size="lg" display="flex" alignItems="center" color={colors.textColorHeading}>
                                <Icon as={FaTasks} mr={3} color={colors.accentColor} />
                                {t("plans")}
                            </Heading>
                        </Flex>

                        <Flex
                            bg={colors.cardBg}
                            borderRadius="lg"
                            boxShadow={colors.cardShadow}
                            height="calc(100vh - 160px)"
                            borderWidth="1px"
                            borderColor={colors.borderColor}
                            overflow="hidden"
                            position="relative"
                        >
                            {/* Sidebar with Kanban board */}
                            <Box
                                ref={sidebarRef}
                                width={`${sidebarWidth}px`}
                                borderRightWidth="1px"
                                borderRightColor={colors.borderColor}
                                overflowY="auto"
                                p={4}
                                display="flex"
                                flexDirection="column"
                                bg={colors.timelineBg}
                                position="relative"
                                minHeight="0"
                            >
                                <Flex justify="space-between" align="center" mb={4}>
                                    <Flex align="center">
                                        <Text fontSize="lg" fontWeight="bold" color={colors.textColorHeading} mr={3}>
                                            {t("available_plans")} {filteredPlans.length > 0 && `(${filteredPlans.length})`}
                                        </Text>
                                        <IconButton
                                            aria-label="Kanban view"
                                            size="sm"
                                            variant={layout.viewMode === 'kanban' ? 'solid' : 'ghost'}
                                            colorScheme={layout.viewMode === 'kanban' ? 'green' : 'gray'}
                                            onClick={() => handleViewModeChange('kanban')}
                                            mr={1}
                                            color={layout.viewMode === 'kanban' ? 'white' : colors.textColorMuted}
                                            bg={layout.viewMode === 'kanban' ? colors.greenBgColor : 'transparent'}
                                            _hover={{
                                                bg: layout.viewMode === 'kanban' ? colors.greenHoverBgColor : colors.hoverBg
                                            }}
                                        >
                                            <Icon as={FaColumns} />
                                        </IconButton>
                                        <IconButton
                                            aria-label="Calendar view"
                                            size="sm"
                                            variant={layout.viewMode === 'calendar' ? 'solid' : 'ghost'}
                                            colorScheme={layout.viewMode === 'calendar' ? 'pink' : 'gray'}
                                            onClick={() => handleViewModeChange('calendar')}
                                            color={layout.viewMode === 'calendar' ? 'white' : colors.textColorMuted}
                                            bg={layout.viewMode === 'calendar' ? 'pink.500' : 'transparent'}
                                            _hover={{
                                                bg: layout.viewMode === 'calendar' ? 'pink.600' : colors.hoverBg
                                            }}
                                        >
                                            <Icon as={FaCalendarAlt} />
                                        </IconButton>
                                    </Flex>
                                    <Box> {/* Empty box to maintain the space-between layout */}
                                    </Box>
                                </Flex>

                                {/* Search bar with Chakra UI v3 syntax */}
                                <Flex position="relative" mb={3}>
                                    <Box position="absolute" left={3} top="50%" transform="translateY(-50%)" zIndex={1}>
                                        <Icon as={FaSearch} color={colors.textColorMuted} />
                                    </Box>
                                    <Input
                                        placeholder={t("search_plans")}
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                        borderColor={colors.inputBorder}
                                        bg={colors.inputBg}
                                        _focus={{ borderColor: colors.accentColor, boxShadow: `0 0 0 1px ${colors.focusRingColor}` }}
                                        pl={10}
                                        size="sm"
                                    />
                                </Flex>

                                {/* Status filter badges removed */}

                                {loading.plans ? (
                                    <VStack py={8}>
                                        <Spinner size="md" color={colors.accentColor} mb={2} />
                                        <Text fontSize="sm" color={colors.textColor}>{t("loading_plans")}</Text>
                                    </VStack>
                                ) : (
                                    layout.viewMode === 'kanban' ? (
                                        <PlanKanban
                                            plans={filteredPlans}
                                            currentPlanId={currentPlanId}
                                            viewMode={layout.viewMode}
                                            onViewModeChange={handleViewModeChange}
                                        />
                                    ) : (
                                        <PlanCalendar
                                            plans={filteredPlans}
                                            currentPlanId={currentPlanId}
                                            viewMode={layout.viewMode}
                                            onViewModeChange={handleViewModeChange}
                                        />
                                    )
                                )}

                                {/* Pagination Controls */}
                                {totalPages > 1 && (
                                    <Flex justify="center" mt={4} align="center" borderTopWidth="1px" borderColor={colors.borderColor} pt={3}>
                                        <IconButton
                                            aria-label="Previous Page"
                                            size="sm"
                                            colorScheme="blue"
                                            variant="ghost"
                                            disabled={currentPage === 1}
                                            onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                                            mr={2}
                                            color={colors.accentColor}
                                            _hover={{ bg: colors.hoverBg }}
                                        >
                                            <Icon as={FiChevronLeft} />
                                        </IconButton>

                                        <Text fontSize="sm" mx={2} color={colors.textColorMuted}>
                                            {currentPage} / {totalPages}
                                        </Text>

                                        <IconButton
                                            aria-label="Next Page"
                                            size="sm"
                                            colorScheme="blue"
                                            variant="ghost"
                                            disabled={currentPage === totalPages}
                                            onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                                            ml={2}
                                            color={colors.accentColor}
                                            _hover={{ bg: colors.hoverBg }}
                                        >
                                            <Icon as={FiChevronRight} />
                                        </IconButton>
                                    </Flex>
                                )}

                                {/* Resize handle */}
                                <Box
                                    position="absolute"
                                    top="0"
                                    right="0"
                                    width="8px"
                                    height="100%"
                                    cursor="col-resize"
                                    onMouseDown={handleResizeStart}
                                    _hover={{
                                        bg: colors.accentColor,
                                        opacity: 0.5
                                    }}
                                    zIndex={2}
                                />
                            </Box>

                            {/* Main content area */}
                            <Box flex="1" p={0} position="relative" overflowY="auto" bg={colors.detailsBg}>
                                {!isDetailView && !loading.plans ? (
                                    <Flex
                                        direction="column"
                                        align="center"
                                        justify="center"
                                        height="100%"
                                        p={8}
                                    >
                                        <Icon as={FaTasks} fontSize="6xl" color={colors.accentColor} mb={6} />
                                        <Text fontSize="xl" fontWeight="bold" color={colors.textColorHeading} mb={2}>
                                            {t("select_plan")}
                                        </Text>
                                        <Text color={colors.textColorMuted} textAlign="center" maxW="md">
                                            {t("select_plan_description")}
                                        </Text>
                                    </Flex>
                                ) : (
                                    children
                                )}
                            </Box>
                        </Flex>
                    </MotionBox>
                </Container>
            </Box>
        </>
    );
} 