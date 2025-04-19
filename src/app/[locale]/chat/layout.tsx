"use client";

import {
    Box,
    Container,
    Flex,
    Heading,
    Icon,
    Text,
    VStack,
    Select,
    Portal,
    createListCollection,
    Card,
    Stack,
    Progress
} from "@chakra-ui/react";
import { motion } from "framer-motion";
import { FaComments } from "react-icons/fa";
import { useTranslations } from "next-intl";
import { useSelector, useDispatch } from 'react-redux';
import { RootState } from '@/store/store';
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useCallback, useMemo } from "react";
import { useChatPageColors } from "@/utils/colors";
import { Global, css } from '@emotion/react';
import axios from "axios";
import { toaster } from "@/components/ui/toaster";
import {
    setRooms,
    setSelectedRoom,
    setLoadingRooms,
    setUnreadCount,
    joinRoom,
    setPlanSectionWidth
} from '@/store/features/chatSlice';
import { ChatRoomList } from "@/components/chat/room_list";
import Loading from "@/components/loading";
import { useSession } from "next-auth/react";
import { CreateRoomModal } from "@/components/chat/create_room_modal";
import { IChatRoom } from "@/types/chat";
import { Log } from "@/types/plan";
import PlanLogSection from "@/components/plans/plan_log_section";
import { getStatusColorScheme } from "@/components/ui/StatusBadge";
import PlanLogModal from "@/components/plans/plan_log_modal";

const MotionBox = motion(Box);

const colorPalettes = [
    "blue", "green", "yellow", "orange", "red", "purple", "teal", "gray"
];

// Update SimplifiedPlanSection component
interface SimplifiedPlanSectionProps {
    currentRoom: IChatRoom | undefined;
    colors: ReturnType<typeof useChatPageColors>;
    t: any;
}

const SimplifiedPlanSection = ({
    currentRoom,
    colors,
    t
}: SimplifiedPlanSectionProps) => {
    const [plans, setPlans] = useState<Array<{
        id: string,
        name: string,
        plan_id?: string,
        progress?: number,
        logs?: Log[]
    }>>([]);
    const [isLoadingPlans, setIsLoadingPlans] = useState(false);
    const [selectedPlans, setSelectedPlans] = useState<string[]>([]);
    const [logsByPlan, setLogsByPlan] = useState<Record<string, Log[]>>({});
    const [selectedLog, setSelectedLog] = useState<Log | null>(null);
    const [isModalOpen, setIsModalOpen] = useState(false);

    // Create collection for plans
    const plansCollection = useMemo(() => {
        return createListCollection({
            items: plans.map(plan => ({
                label: plan.name,
                value: plan.id
            }))
        });
    }, [plans]);

    // Fetch plans when room changes
    useEffect(() => {
        const fetchPlans = async () => {
            if (!currentRoom) {
                setPlans([]);
                setSelectedPlans([]);
                setLogsByPlan({});
                return;
            }

            setIsLoadingPlans(true);
            try {
                const response = await axios.get(`/api/plan/get_plans?roomId=${currentRoom.id}`);
                setPlans(response.data.map((plan: any) => ({
                    id: plan.id,
                    name: plan.plan_name || `Plan ${plan.plan_id}`,
                    plan_id: plan.plan_id,
                    progress: plan.progress,
                    logs: plan.logs || []
                })));
            } catch (error) {
                console.error("Error fetching plans:", error);
            } finally {
                setIsLoadingPlans(false);
            }
        };

        fetchPlans();
    }, [currentRoom]);

    // Fetch logs for selected plans
    useEffect(() => {
        const fetchLogs = async () => {
            // If no plans are selected, show logs from all plans
            if (!selectedPlans.length) {
                // Create logs object with all plans' logs
                const logsObj: Record<string, Log[]> = {};

                plans.forEach(plan => {
                    if (plan && plan.logs) {
                        // Format logs to match PlanLogSection props requirements
                        const formattedLogs = plan.logs.map(log => ({
                            ...log,
                            planName: plan.name,
                            planShortId: getShortId(plan.plan_id),
                            planNavId: plan.id // Add the full plan ID for navigation
                        }));
                        logsObj[plan.id] = formattedLogs;
                    }
                });

                setLogsByPlan(logsObj);
                return;
            }

            // Use logs directly from the plans data for selected plans
            const logsObj: Record<string, Log[]> = {};

            selectedPlans.forEach(planId => {
                const plan = plans.find(p => p.id === planId);
                if (plan && plan.logs) {
                    // Format logs to match PlanLogSection props requirements
                    const formattedLogs = plan.logs.map(log => ({
                        ...log,
                        planName: plan.name,
                        planShortId: getShortId(plan.plan_id),
                        planNavId: plan.id // Add the full plan ID for navigation
                    }));
                    logsObj[planId] = formattedLogs;
                } else {
                    logsObj[planId] = [];
                }
            });

            setLogsByPlan(logsObj);
        };

        fetchLogs();
    }, [selectedPlans, plans]);

    // Helper to get first chunk of uuid
    const getShortId = (uuid?: string) => uuid ? uuid.split('-')[0] : '';

    // Combine all logs from selected plans into a single array, with plan info
    const allLogs = useMemo(() => {
        let logs: Array<Log & { planName?: string; planShortId?: string; planNavId?: string }> = [];

        // If no plans are selected, use logs from all plans
        if (selectedPlans.length === 0) {
            plans.forEach(plan => {
                if (plan.logs) {
                    logs = logs.concat(
                        plan.logs.map(log => ({
                            ...log,
                            planName: plan.name,
                            planShortId: getShortId(plan.plan_id),
                            planNavId: plan.id,
                        }))
                    );
                }
            });
        } else {
            // Otherwise use logs from selected plans
            selectedPlans.forEach(planId => {
                const plan = plans.find(p => p.id === planId);
                const planLogs = logsByPlan[planId] || [];
                logs = logs.concat(
                    planLogs.map(log => ({
                        ...log,
                        planName: plan?.name,
                        planShortId: getShortId(plan?.plan_id),
                        planNavId: plan?.id,
                    }))
                );
            });
        }

        // Sort by created_at descending
        return logs.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    }, [selectedPlans, logsByPlan, plans]);

    // Map status to color scheme
    const getColorForPlan = (plan: any) => {
        // Default to 'running' if no status is provided
        const status = plan.status || 'running';
        return getStatusColorScheme(status);
    };

    const handleLogClick = (log: Log) => {
        console.log("Log clicked in SimplifiedPlanSection:", log);
        setSelectedLog(log);
        setIsModalOpen(true);
    };

    const handleCloseModal = () => {
        setIsModalOpen(false);
    };

    return (
        <MotionBox
            layout
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            bg={colors.cardBg}
            transition={{ duration: 0.5 }}
            height="100%"
            width="100%"
            overflow="hidden"
            borderRadius="md"
            display="flex"
            flexDirection="column"
            borderWidth="1px"
            borderColor={colors.planSectionBorder}
            zIndex={1}
            whileHover={{ boxShadow: colors.planSectionHoverShadow }}
        >
            <Box
                p={4}
                borderBottomWidth="1px"
                borderColor={colors.planSectionBorder}
                bg={colors.planSectionHeaderBg}
            >
                <Text
                    fontSize="lg"
                    fontWeight="bold"
                    color={colors.planSectionHeaderText}
                >
                    {t("plan_section")}
                </Text>
            </Box>

            <VStack gap={4} p={4} align="stretch" overflowY="auto">
                {currentRoom ? (
                    <>
                        <Box>
                            <Text
                                fontSize="sm"
                                fontWeight="bold"
                                color={colors.planLabelText}
                                mb={2}
                            >
                                {t("select_plans")}
                            </Text>
                            {isLoadingPlans ? (
                                <Box
                                    p={3}
                                    borderWidth="1px"
                                    borderRadius="md"
                                    borderColor={colors.planItemBorder}
                                    bg={colors.planItemBg}
                                    textAlign="center"
                                >
                                    <Text fontSize="sm" color={colors.textColor}>
                                        {t("loading_plans")}...
                                    </Text>
                                </Box>
                            ) : plans.length > 0 ? (
                                <>
                                    <Select.Root
                                        multiple
                                        collection={plansCollection}
                                        size="sm"
                                        width="100%"
                                        onValueChange={obj => {
                                            const value = obj?.value;
                                            setSelectedPlans(Array.isArray(value) ? value : value ? [value] : []);
                                        }}
                                        value={selectedPlans}
                                    >
                                        <Select.HiddenSelect />
                                        {/* <Select.Label color={colors.textColor}>Select plans</Select.Label> */}
                                        <Select.Control>
                                            <Select.Trigger>
                                                <Select.ValueText
                                                    placeholder={t("select_plans")}
                                                    color={colors.textColor}
                                                />
                                            </Select.Trigger>
                                            <Select.IndicatorGroup>
                                                <Select.Indicator />
                                            </Select.IndicatorGroup>
                                        </Select.Control>
                                        <Portal>
                                            <Select.Positioner>
                                                <Select.Content bg={colors.dropdownBg}>
                                                    {plansCollection.items.map((plan) => {
                                                        // Find the full plan object for progress/plan_id
                                                        const fullPlan = plans.find(p => p.id === plan.value);
                                                        return (
                                                            <Select.Item
                                                                item={plan}
                                                                key={plan.value}
                                                                color={colors.dropdownText}
                                                                _hover={{ bg: colors.dropdownHoverBg }}
                                                                px={2}
                                                                py={1}
                                                            >
                                                                <Flex align="center" justify="space-between" width="100%">
                                                                    <Box>
                                                                        <Text as="span" fontWeight="medium">
                                                                            {plan.label}
                                                                        </Text>
                                                                        <Text as="span" color="gray.400" fontSize="xs" ml={2}>
                                                                            [{getShortId(fullPlan?.plan_id)}]
                                                                        </Text>
                                                                    </Box>
                                                                    {typeof fullPlan?.progress === "number" && (
                                                                        <Box minW="40px" textAlign="right">
                                                                            <Text as="span" color="gray.400" fontSize="xs">
                                                                                {fullPlan.progress}%
                                                                            </Text>
                                                                        </Box>
                                                                    )}
                                                                </Flex>
                                                                <Select.ItemIndicator />
                                                            </Select.Item>
                                                        );
                                                    })}
                                                </Select.Content>
                                            </Select.Positioner>
                                        </Portal>
                                    </Select.Root>
                                    <Box mt={2}>
                                        <Stack gap={1}>
                                            {plans
                                                .filter(plan => selectedPlans.includes(plan.id))
                                                .map((plan) => {
                                                    const colorScheme = getColorForPlan(plan);
                                                    return (
                                                        <Flex
                                                            key={plan.id}
                                                            align="center"
                                                            justify="space-between"
                                                            width="100%"
                                                            py={1}
                                                        >
                                                            {/* Plan name with ID */}
                                                            <Text
                                                                width="45%"
                                                                color={colors.textColor}
                                                                fontSize="sm"
                                                                lineClamp={1}
                                                            >
                                                                {plan.name}
                                                                <Text as="span" color="gray.500" fontSize="xs" ml={1}>
                                                                    [{getShortId(plan.plan_id)}]
                                                                </Text>
                                                            </Text>

                                                            {/* Progress bar */}
                                                            <Progress.Root
                                                                width="40%"
                                                                defaultValue={plan.progress ?? 0}
                                                                colorScheme={colorScheme}
                                                                variant="outline"
                                                                size="sm"
                                                            >
                                                                <Progress.Track>
                                                                    <Progress.Range />
                                                                </Progress.Track>
                                                            </Progress.Root>

                                                            {/* Percentage */}
                                                            <Text
                                                                width="15%"
                                                                fontSize="xs"
                                                                color={colors.textColor}
                                                                textAlign="right"
                                                            >
                                                                {typeof plan.progress === "number" ? `${plan.progress}%` : "0%"}
                                                            </Text>
                                                        </Flex>
                                                    );
                                                })}
                                        </Stack>
                                    </Box>
                                    {/* Render PlanLogSection with the logs */}
                                    {currentRoom && (
                                        <Box mt={4}>
                                            <PlanLogSection
                                                logs={allLogs}
                                                colors={colors}
                                                t={t}
                                                onLogClick={handleLogClick}
                                            />
                                        </Box>
                                    )}
                                </>
                            ) : (
                                <Box
                                    p={3}
                                    borderWidth="1px"
                                    borderRadius="md"
                                    borderColor={colors.planItemBorder}
                                    bg={colors.planItemBg}
                                >
                                    <Text fontSize="sm" color={colors.textColor}>
                                        {t("no_plans_found")}
                                    </Text>
                                </Box>
                            )}
                        </Box>
                    </>
                ) : (
                    <Box
                        p={4}
                        borderWidth="1px"
                        borderRadius="md"
                        borderColor={colors.planItemBorder}
                        bg={colors.planItemBg}
                        textAlign="center"
                    >
                        <Text fontSize="sm" color={colors.textColor}>
                            {t("select_room_to_see_plans")}
                        </Text>
                    </Box>
                )}
            </VStack>

            {/* Render the modal */}
            <PlanLogModal
                isOpen={isModalOpen}
                onClose={handleCloseModal}
                log={selectedLog}
                colors={colors}
            />
        </MotionBox>
    );
};

export default function ChatLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const t = useTranslations("Chat");
    const { isAuthenticated } = useSelector((state: RootState) => state.user);
    const router = useRouter();
    const colors = useChatPageColors();
    const dispatch = useDispatch();
    const { data: session } = useSession();

    // Get chat state from Redux
    const {
        rooms,
        selectedRoomId,
        unreadCounts,
        isLoadingRooms,
        isSocketConnected,
        planSectionWidth
    } = useSelector((state: RootState) => state.chat);

    // Add state for container resizing
    const [containerResizing, setContainerResizing] = useState(false);
    const [containerResizeEdge, setContainerResizeEdge] = useState<'left' | 'right' | null>(null);
    const [containerWidth, setContainerWidth] = useState<number | null>(null);
    const [resizeStartPosition, setResizeStartPosition] = useState(0);
    const [containerLeft, setContainerLeft] = useState<number | null>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const CONTAINER_MIN_WIDTH = 800; // Minimum container width
    const MARGIN_PERCENT = 5; // 5% margin from window edges
    const MIN_CONTAINER_WIDTH_PERCENT = 50; // Minimum width as percentage of window

    // State for creating new room
    const [isCreatingRoom, setIsCreatingRoom] = useState(false);
    const [isCreatingRoomLoading, setIsCreatingRoomLoading] = useState(false);

    // Add state for sidebar resizing
    const [sidebarResizing, setSidebarResizing] = useState(false);
    const [sidebarWidth, setSidebarWidth] = useState(300);
    const sidebarRef = useRef<HTMLDivElement>(null);
    const MIN_SIDEBAR_WIDTH = 200;
    const MAX_SIDEBAR_WIDTH = 400;

    // Add state for plan section resizing
    const [planSectionResizing, setPlanSectionResizing] = useState(false);
    const planSectionRef = useRef<HTMLDivElement>(null);
    const MIN_PLAN_SECTION_WIDTH = 200;
    const MAX_PLAN_SECTION_WIDTH = 500;

    // Authentication check
    useEffect(() => {
        if (!isAuthenticated) {
            router.push("/signin");
        }
    }, [isAuthenticated, router]);

    // Initialize container dimensions on mount
    useEffect(() => {
        if (containerRef.current && containerWidth === null) {
            const rect = containerRef.current.getBoundingClientRect();
            setContainerWidth(rect.width);
            setContainerLeft(rect.left);
        }
    }, [containerWidth]);

    // Fetch rooms
    useEffect(() => {
        const fetchRooms = async () => {
            try {
                const response = await axios.get("/api/chat/get_rooms");
                // Make sure rooms have their active_users properly populated
                const roomsWithUsers = response.data.map((room: any) => {
                    // If active_users is null or undefined, initialize as empty array
                    if (!room.active_users) {
                        room.active_users = [];
                    }
                    return room;
                });

                dispatch(setRooms(roomsWithUsers));
            } catch (error) {
                toaster.create({
                    title: t("error"),
                    description: t("error_fetching_rooms"),
                    type: "error"
                });
            } finally {
                dispatch(setLoadingRooms(false));
            }
        };

        if (session) {
            fetchRooms();
        }
    }, [session, dispatch, t]);

    // Join rooms when socket connects
    useEffect(() => {
        // When socket connects, join all rooms the user is part of
        if (isSocketConnected && rooms.length > 0) {
            console.log("Socket connected, joining all rooms:", rooms.map(r => r.id));
            rooms.forEach(room => {
                dispatch({ type: 'chat/joinRoom', payload: room.id });
            });
        }
    }, [isSocketConnected, rooms, dispatch]);

    // Handle room selection
    const handleRoomSelect = useCallback((roomId: string) => {
        console.log("Selecting room:", roomId);

        // First join the room via socket
        dispatch(joinRoom(roomId));

        // Then set it as selected in Redux
        dispatch(setSelectedRoom(roomId));

        // Reset unread count for this room
        dispatch(setUnreadCount({ roomId, count: 0 }));
    }, [dispatch]);

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

            setResizeStartPosition(e.clientX);
        };

        const handleMouseUp = () => {
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
    }, [containerResizing, containerResizeEdge, containerWidth, resizeStartPosition]);

    // Handle sidebar resize start
    const handleSidebarResizeStart = (e: React.MouseEvent) => {
        e.preventDefault();
        setSidebarResizing(true);
        setResizeStartPosition(e.clientX);
    };

    // Effect for sidebar resizing
    useEffect(() => {
        const handleMouseMove = (e: MouseEvent) => {
            if (sidebarResizing && sidebarRef.current) {
                const deltaX = e.clientX - resizeStartPosition;
                const newWidth = Math.max(
                    MIN_SIDEBAR_WIDTH,
                    Math.min(MAX_SIDEBAR_WIDTH, sidebarWidth + deltaX)
                );

                // Update local state
                setSidebarWidth(newWidth);

                // Update DOM directly
                sidebarRef.current.style.width = `${newWidth}px`;

                setResizeStartPosition(e.clientX);
            }
        };

        const handleMouseUp = () => {
            setSidebarResizing(false);
        };

        if (sidebarResizing) {
            document.addEventListener('mousemove', handleMouseMove);
            document.addEventListener('mouseup', handleMouseUp);
            document.body.style.userSelect = 'none';
        }

        return () => {
            document.removeEventListener('mousemove', handleMouseMove);
            document.removeEventListener('mouseup', handleMouseUp);
            document.body.style.userSelect = '';
        };
    }, [sidebarResizing, resizeStartPosition, sidebarWidth]);

    // Get the current room
    const currentRoom = useMemo(() => {
        return rooms.find(room => room.id === selectedRoomId);
    }, [rooms, selectedRoomId]);

    // Handle plan section resize start
    const handlePlanSectionResizeStart = (e: React.MouseEvent) => {
        e.preventDefault();
        setPlanSectionResizing(true);
        setResizeStartPosition(e.clientX);
    };

    // Effect for plan section resizing
    useEffect(() => {
        const handleMouseMove = (e: MouseEvent) => {
            if (planSectionResizing && planSectionRef.current) {
                const deltaX = e.clientX - resizeStartPosition;
                const newWidth = Math.max(
                    MIN_PLAN_SECTION_WIDTH,
                    Math.min(MAX_PLAN_SECTION_WIDTH, planSectionWidth - deltaX)
                );

                // Update Redux state
                dispatch(setPlanSectionWidth(newWidth));

                // Update DOM directly for smooth resizing
                planSectionRef.current.style.width = `${newWidth}px`;

                setResizeStartPosition(e.clientX);
            }
        };

        const handleMouseUp = () => {
            setPlanSectionResizing(false);
        };

        if (planSectionResizing) {
            document.addEventListener('mousemove', handleMouseMove);
            document.addEventListener('mouseup', handleMouseUp);
            document.body.style.userSelect = 'none';
        }

        return () => {
            document.removeEventListener('mousemove', handleMouseMove);
            document.removeEventListener('mouseup', handleMouseUp);
            document.body.style.userSelect = '';
        };
    }, [planSectionResizing, resizeStartPosition, planSectionWidth, dispatch]);

    if (!isAuthenticated) {
        return null;
    }

    if (isLoadingRooms || !session) {
        return <Loading />;
    }

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
                    overflow="hidden"
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
                        _hover={{ opacity: 0.7, bg: `${colors.cardBg}33` }}
                        onMouseDown={(e) => handleContainerResizeStart(e, 'left')}
                        bg={containerResizing && containerResizeEdge === 'left' ? colors.cardBg : 'transparent'}
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
                        _hover={{ opacity: 0.7, bg: `${colors.cardBg}33` }}
                        onMouseDown={(e) => handleContainerResizeStart(e, 'right')}
                        bg={containerResizing && containerResizeEdge === 'right' ? colors.cardBg : 'transparent'}
                    />

                    <MotionBox
                        width="100%"
                        height="100%"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ duration: 0.3 }}
                        display="flex"
                        flexDirection="column"
                        overflow="hidden"
                        position="relative"
                    >
                        <Heading
                            size="lg"
                            mb={6}
                            display="flex"
                            alignItems="center"
                            color={colors.textColorHeading}
                        >
                            <Icon as={FaComments} mr={3} color="blue.500" />
                            {t("chat")}
                        </Heading>

                        <Flex
                            width="100%"
                            height="calc(100% - 60px)"
                            position="relative"
                            overflow="hidden"
                            gap={4}
                        >
                            {/* Room List Component with resize handle */}
                            <Box
                                ref={sidebarRef}
                                width={`${sidebarWidth}px`}
                                flexShrink={0}
                                position="relative"
                                transition={sidebarResizing ? 'none' : 'width 0.2s'}
                            >
                                <ChatRoomList
                                    rooms={rooms}
                                    selectedRoomId={selectedRoomId}
                                    unreadCounts={unreadCounts}
                                    onSelectRoom={handleRoomSelect}
                                    onCreateRoomClick={() => setIsCreatingRoom(true)}
                                    isCreatingRoomLoading={isCreatingRoomLoading}
                                />

                                {/* Resize handle for sidebar */}
                                <Box
                                    position="absolute"
                                    top="0"
                                    right="-4px"
                                    width="8px"
                                    height="100%"
                                    cursor="col-resize"
                                    onMouseDown={handleSidebarResizeStart}
                                    _hover={{
                                        bg: colors.cardBg,
                                        opacity: 0.5
                                    }}
                                    zIndex={2}
                                />
                            </Box>

                            {/* Main content area - will render children */}
                            <Box flex="1" minWidth="0">
                                {children}
                            </Box>

                            {/* Plan Section Component with resize handle */}
                            <Box
                                ref={planSectionRef}
                                width={`${planSectionWidth}px`}
                                flexShrink={0}
                                position="relative"
                                transition={planSectionResizing ? 'none' : 'width 0.2s'}
                            >
                                <SimplifiedPlanSection
                                    currentRoom={currentRoom}
                                    colors={colors}
                                    t={t}
                                />

                                {/* Resize handle for plan section */}
                                <Box
                                    position="absolute"
                                    top="0"
                                    left="-4px"
                                    width="8px"
                                    height="100%"
                                    cursor="col-resize"
                                    onMouseDown={handlePlanSectionResizeStart}
                                    _hover={{
                                        bg: colors.borderColor || "blue.500",
                                        opacity: 0.5
                                    }}
                                    zIndex={2}
                                />
                            </Box>
                        </Flex>
                    </MotionBox>
                </Container>
            </Box>

            {/* Add the CreateRoomModal component */}
            <CreateRoomModal
                isOpen={isCreatingRoom}
                onClose={() => setIsCreatingRoom(false)}
            />
        </>
    );
}
