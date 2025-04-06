"use client";

import React, { useState, useRef, useEffect } from "react";
import {
    Box,
    IconButton,
    Badge,
    Popover,
    VStack,
    Text,
    Flex,
    Portal,
    Icon,
} from "@chakra-ui/react";
import { FaBell } from "react-icons/fa"
import { useColorModeValue } from "@/components/ui/color-mode"
import { useDispatch, useSelector } from 'react-redux';
import { RootState } from '@/store/store';
import { markAsRead, updatePosition } from '@/store/features/notificationSlice';

const Notification: React.FC = () => {
    const dispatch = useDispatch();
    const { notifications, unreadCount, position } = useSelector((state: RootState) => state.notification);
    const { currentUser, isAuthenticated } = useSelector((state: RootState) => state.user);
    const [isOpen, setIsOpen] = useState(false);
    const [dragStartPosition, setDragStartPosition] = useState({ x: 0, y: 0 });
    const [isDragging, setIsDragging] = useState(false);
    const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
    const bellRef = useRef<HTMLDivElement>(null);

    // TODO: if not authenticated, just hide.

    // Add constants for boundary margins
    const BOUNDARY_MARGIN = 20; // pixels from edge of screen

    const bgColor = useColorModeValue("white", "gray.800");
    const borderColor = useColorModeValue("gray.200", "gray.700");
    const hoverBg = useColorModeValue("gray.100", "gray.700");

    const handleMouseDown = (e: React.MouseEvent) => {
        if (bellRef.current) {
            setIsDragging(true);
            setDragStartPosition({ x: e.clientX, y: e.clientY });
            const rect = bellRef.current.getBoundingClientRect();
            setDragOffset({
                x: e.clientX - rect.left,
                y: e.clientY - rect.top
            });
        }
    };

    const handleClick = (e: React.MouseEvent) => {
        // Only toggle popover if it wasn't a drag (moved less than 5px)
        const moveDistance = Math.sqrt(
            Math.pow(e.clientX - dragStartPosition.x, 2) +
            Math.pow(e.clientY - dragStartPosition.y, 2)
        );

        if (moveDistance < 5) {
            setIsOpen(!isOpen);
        }
    };

    useEffect(() => {
        const handleMouseMove = (e: MouseEvent) => {
            if (isDragging) {
                // Calculate new position with boundary constraints
                const newX = e.clientX - dragOffset.x;
                const newY = e.clientY - dragOffset.y;

                // Get window dimensions
                const windowWidth = window.innerWidth;
                const windowHeight = window.innerHeight;

                // Apply boundary constraints
                const boundedX = Math.max(BOUNDARY_MARGIN, Math.min(newX, windowWidth - BOUNDARY_MARGIN));
                const boundedY = Math.max(BOUNDARY_MARGIN, Math.min(newY, windowHeight - BOUNDARY_MARGIN));

                dispatch(updatePosition({
                    x: boundedX,
                    y: boundedY
                }));
            }
        };

        const handleMouseUp = () => {
            setIsDragging(false);
        };

        if (isDragging) {
            document.addEventListener('mousemove', handleMouseMove);
            document.addEventListener('mouseup', handleMouseUp);
        }

        return () => {
            document.removeEventListener('mousemove', handleMouseMove);
            document.removeEventListener('mouseup', handleMouseUp);
        };
    }, [isDragging, dragOffset, dispatch]);

    // Add effect to ensure notification stays within bounds when window is resized
    useEffect(() => {
        const handleResize = () => {
            if (bellRef.current) {
                const windowWidth = window.innerWidth;
                const windowHeight = window.innerHeight;

                // Check if current position is outside boundaries after resize
                const boundedX = Math.max(BOUNDARY_MARGIN, Math.min(position.x, windowWidth - BOUNDARY_MARGIN));
                const boundedY = Math.max(BOUNDARY_MARGIN, Math.min(position.y, windowHeight - BOUNDARY_MARGIN));

                // Only update if position needs to change
                if (boundedX !== position.x || boundedY !== position.y) {
                    dispatch(updatePosition({
                        x: boundedX,
                        y: boundedY
                    }));
                }
            }
        };

        window.addEventListener('resize', handleResize);

        // Initial check when component mounts
        handleResize();

        return () => {
            window.removeEventListener('resize', handleResize);
        };
    }, [position, dispatch]);

    const handleNotificationClick = (id: string) => {
        dispatch(markAsRead(id));
        setIsOpen(false);
    };

    return (
        <Box
            ref={bellRef}
            position="fixed"
            left={`${position.x}px`}
            top={`${position.y}px`}
            zIndex="10"
            cursor={isDragging ? "grabbing" : "grab"}
            onMouseDown={handleMouseDown}
        >
            <Popover.Root
                lazyMount
                unmountOnExit
                open={isOpen}
                onOpenChange={(details) => setIsOpen(details.open)}
            >
                <Popover.Trigger asChild>
                    <IconButton
                        aria-label="Notifications"
                        onClick={handleClick}
                        size="lg"
                        colorScheme="blue"
                        variant="outline"
                        borderRadius="full"
                        boxShadow="lg"
                        position="relative"
                        bg={useColorModeValue("white", "gray.800")}
                        _hover={{ bg: useColorModeValue("blue.50", "gray.700") }}
                    >
                        {<Icon as={FaBell} />}
                        {unreadCount > 0 && (
                            <Badge
                                position="absolute"
                                top="-5px"
                                right="-5px"
                                borderRadius="full"
                                bg="red.500"
                                color="white"
                                fontSize="xs"
                                boxSize="20px"
                                display="flex"
                                alignItems="center"
                                justifyContent="center"
                            >
                                {unreadCount > 9 ? '9+' : unreadCount}
                            </Badge>
                        )}
                    </IconButton>
                </Popover.Trigger>
                <Portal>
                    <Popover.Positioner>
                        <Popover.Content width="300px" boxShadow="xl" border="1px solid" borderColor={borderColor}>
                            <Popover.Body p={0}>
                                {notifications.length === 0 ? (
                                    <Box p={4} textAlign="center">
                                        <Text color="gray.500">No notifications</Text>
                                    </Box>
                                ) : (
                                    <VStack gap={0} align="stretch" maxH="400px" overflowY="auto">
                                        {notifications.map((notification) => (
                                            <Box
                                                key={notification.id}
                                                p={3}
                                                borderBottom="1px solid"
                                                borderColor={borderColor}
                                                bg={notification.read ? bgColor : "blue.50"}
                                                _dark={{
                                                    bg: notification.read ? bgColor : "blue.900"
                                                }}
                                                _hover={{ bg: hoverBg }}
                                                cursor="pointer"
                                                onClick={() => {
                                                    handleNotificationClick(notification.id || "");
                                                }}
                                            >
                                                <Flex justifyContent="space-between" mb={1}>
                                                    <Text fontWeight="bold" fontSize="sm">{notification.title}</Text>
                                                    <Text fontSize="xs" color="gray.500">{notification.timestamp}</Text>
                                                </Flex>
                                                <Text fontSize="sm" lineClamp={2}>{notification.message}</Text>
                                            </Box>
                                        ))}
                                    </VStack>
                                )}
                            </Popover.Body>
                        </Popover.Content>
                    </Popover.Positioner>
                </Portal>
            </Popover.Root>
        </Box>
    );
};

export default Notification;
