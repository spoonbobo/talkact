"use client";

import {
    Box,
    Container,
    Flex,
    Heading,
    Icon,
    Text,
} from "@chakra-ui/react";
import { motion } from "framer-motion";
import { FaComments } from "react-icons/fa";
import { useTranslations } from "next-intl";
import { useSelector, useDispatch } from 'react-redux';
import { RootState } from '@/store/store';
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useCallback } from "react";
import { useChatPageColors } from "@/utils/colors";
import { Global, css } from '@emotion/react';
import axios from "axios";
import { toaster } from "@/components/ui/toaster";
import {
    setRooms,
    setSelectedRoom,
    setLoadingRooms,
    setUnreadCount,
    joinRoom
} from '@/store/features/chatSlice';
import { ChatRoomList } from "@/components/chat/room_list";
import Loading from "@/components/loading";
import { useSession } from "next-auth/react";
import { CreateRoomModal } from "@/components/chat/create_room_modal";

const MotionBox = motion(Box);

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
        isSocketConnected
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
