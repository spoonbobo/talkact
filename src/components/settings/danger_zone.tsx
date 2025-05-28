"use client"

import React, { useState } from "react";
import {
    Box,
    Heading,
    Text,
    HStack,
    Icon,
    Badge,
} from "@chakra-ui/react";
import { FiInfo } from "react-icons/fi";
import { useTranslations } from "next-intl";
import { useSession } from "next-auth/react";
import { toaster } from "@/components/ui/toaster";
import { useColorModeValue } from "@/components/ui/color-mode";

interface DangerZoneProps {
    isOwner: boolean;
    isAuthenticated: boolean;
}

export default function DangerZone({ isOwner, isAuthenticated }: DangerZoneProps) {
    const t = useTranslations("Settings");
    const { data: session } = useSession();

    const [isDeletingAllRooms, setIsDeletingAllRooms] = useState(false);
    const [isDeletingAllUsers, setIsDeletingAllUsers] = useState(false);
    const [isDeletingAllTasks, setIsDeletingAllTasks] = useState(false);
    const [isResettingAllData, setIsResettingAllData] = useState(false);

    // Define custom colors using useColorModeValue for dark mode support
    const dangerZoneBg = useColorModeValue("red.50", "red.900");
    const dangerZoneBorder = useColorModeValue("red.200", "red.700");
    const dangerZoneText = useColorModeValue("red.700", "red.200");
    const dangerZoneHeading = useColorModeValue("red.600", "red.300");

    // Only render if user is authenticated and owner
    if (!isAuthenticated || !isOwner) {
        return null;
    }

    const handleDeleteAllRooms = async () => {
        if (!session) return;

        setIsDeletingAllRooms(true);
        try {
            const response = await fetch('/api/chat/delete_room', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ all: true }),
            });

            const data = await response.json();

            if (response.ok) {
                toaster.create({
                    title: t("rooms_deleted"),
                    description: data.message,
                    duration: 5000,
                });
            } else {
                throw new Error(data.error || "Failed to delete rooms");
            }
        } catch (error) {
            console.error("Error deleting rooms:", error);
            toaster.create({
                title: t("error"),
                description: error instanceof Error ? error.message : "An unknown error occurred",
                duration: 5000,
            });
        } finally {
            setIsDeletingAllRooms(false);
        }
    };

    const handleDeleteAllUsers = async () => {
        if (!session) return;

        // Add confirmation dialog
        if (!confirm(t("delete_all_users_confirm"))) {
            return;
        }

        setIsDeletingAllUsers(true);
        try {
            const response = await fetch('/api/user/delete_user', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ all: true }),
            });

            const data = await response.json();

            if (response.ok) {
                toaster.create({
                    title: t("users_deleted"),
                    description: data.message,
                    duration: 5000,
                });
            } else {
                throw new Error(data.error || "Failed to delete users");
            }
        } catch (error) {
            console.error("Error deleting users:", error);
            toaster.create({
                title: t("error"),
                description: error instanceof Error ? error.message : "An unknown error occurred",
                duration: 5000,
            });
        } finally {
            setIsDeletingAllUsers(false);
        }
    };

    const handleDeleteAllTasks = async () => {
        if (!session) return;

        setIsDeletingAllTasks(true);
        try {
            const response = await fetch('/api/task/delete_task?deleteAll=true', {
                method: 'DELETE',
                headers: {
                    'Content-Type': 'application/json',
                },
            });

            const data = await response.json();

            if (response.ok) {
                toaster.create({
                    title: t("tasks_deleted"),
                    description: data.message,
                    duration: 5000,
                });
            } else {
                throw new Error(data.error || "Failed to delete tasks");
            }
        } catch (error) {
            console.error("Error deleting tasks:", error);
            toaster.create({
                title: t("error"),
                description: error instanceof Error ? error.message : "An unknown error occurred",
                duration: 5000,
            });
        } finally {
            setIsDeletingAllTasks(false);
        }
    };

    const handleResetAllData = async () => {
        if (!session) return;

        // Add confirmation dialog with a more serious warning
        if (!confirm(t("reset_all_data_confirm"))) {
            return;
        }

        // Double confirmation for destructive action
        if (!confirm(t("reset_all_data_confirm_final"))) {
            return;
        }

        setIsResettingAllData(true);
        try {
            // Delete all messages
            const messagesResponse = await fetch('/api/chat/delete_message', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ all: true }),
            });

            if (!messagesResponse.ok) {
                const messagesData = await messagesResponse.json();
                throw new Error(messagesData.error || "Failed to delete messages");
            }

            // Delete all plans (which also deletes associated tasks)
            const plansResponse = await fetch('/api/plan/delete_plan', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ all: true }),
            });

            if (!plansResponse.ok) {
                const plansData = await plansResponse.json();
                throw new Error(plansData.error || "Failed to delete plans");
            }

            // Delete all rooms
            const roomsResponse = await fetch('/api/chat/delete_room', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ all: true }),
            });

            if (!roomsResponse.ok) {
                const roomsData = await roomsResponse.json();
                throw new Error(roomsData.error || "Failed to delete rooms");
            }

            // Delete all users (except current admin)
            const usersResponse = await fetch('/api/user/delete_user', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ all: true }),
            });

            if (!usersResponse.ok) {
                const usersData = await usersResponse.json();
                throw new Error(usersData.error || "Failed to delete users");
            }

            toaster.create({
                title: t("database_reset"),
                description: t("all_data_reset_success"),
                duration: 5000,
            });

            // Redirect to sign-out page after successful reset with locale parameter
            setTimeout(() => {
                const locale = window.location.pathname.split('/')[1]; // Extract locale from current URL
                window.location.href = `/${locale}/signout`;
            }, 2000);
        } catch (error) {
            console.error("Error resetting database:", error);
            toaster.create({
                title: t("error"),
                description: error instanceof Error ? error.message : "An unknown error occurred",
                duration: 5000,
            });
        } finally {
            setIsResettingAllData(false);
        }
    };

    return (
        <Box>
            <Box
                p={4}
                borderWidth="1px"
                borderColor={dangerZoneBorder}
                borderRadius="md"
                bg={dangerZoneBg}
                mb={6}
            >
                <HStack align="flex-start">
                    <Icon as={FiInfo} color="red.500" boxSize={5} mt={0.5} />
                    <Box>
                        <Heading size="sm" color={dangerZoneHeading} mb={1}>
                            {t("delete_all_rooms")}
                        </Heading>
                        <Text color={dangerZoneText} fontSize="sm">
                            {t("delete_all_rooms_warning")}
                        </Text>
                        <Box
                            as="button"
                            mt={3}
                            py={2}
                            px={4}
                            borderRadius="md"
                            bg="red.500"
                            color="white"
                            fontWeight="medium"
                            fontSize="sm"
                            _hover={{ bg: "red.600" }}
                            _active={{ bg: "red.700" }}
                            _disabled={{ opacity: 0.5, cursor: "not-allowed" }}
                            onClick={handleDeleteAllRooms}
                            // @ts-ignore
                            disabled={isDeletingAllRooms}
                        >
                            {isDeletingAllRooms ? t("deleting") : t("delete_all_rooms")}
                        </Box>
                    </Box>
                </HStack>
            </Box>

            {/* Add Delete All Users section */}
            <Box
                p={4}
                borderWidth="1px"
                borderColor={dangerZoneBorder}
                borderRadius="md"
                bg={dangerZoneBg}
                mb={6}
            >
                <HStack align="flex-start">
                    <Icon as={FiInfo} color="red.500" boxSize={5} mt={0.5} />
                    <Box>
                        <Heading size="sm" color={dangerZoneHeading} mb={1}>
                            {t("delete_all_users")}
                        </Heading>
                        <Text color={dangerZoneText} fontSize="sm">
                            {t("delete_all_users_warning")}
                        </Text>
                        <Box
                            as="button"
                            mt={3}
                            py={2}
                            px={4}
                            borderRadius="md"
                            bg="red.500"
                            color="white"
                            fontWeight="medium"
                            fontSize="sm"
                            _hover={{ bg: "red.600" }}
                            _active={{ bg: "red.700" }}
                            _disabled={{ opacity: 0.5, cursor: "not-allowed" }}
                            onClick={handleDeleteAllUsers}
                            // @ts-ignore
                            disabled={isDeletingAllUsers}
                        >
                            {isDeletingAllUsers ? t("deleting") : t("delete_all_users")}
                        </Box>
                    </Box>
                </HStack>
            </Box>

            {/* Add Reset All Data section */}
            <Box
                p={4}
                borderWidth="1px"
                borderColor={dangerZoneBorder}
                borderRadius="md"
                bg={dangerZoneBg}
                mb={6}
            >
                <HStack align="flex-start">
                    <Icon as={FiInfo} color="red.500" boxSize={5} mt={0.5} />
                    <Box>
                        <Heading size="sm" color={dangerZoneHeading} mb={1}>
                            {t("reset_all_data")}
                        </Heading>
                        <Text color={dangerZoneText} fontSize="sm">
                            {t("reset_all_data_warning")}
                        </Text>
                        <Badge colorScheme="red" mt={2} mb={2}>
                            {t("extremely_destructive")}
                        </Badge>
                        <Box
                            as="button"
                            mt={3}
                            py={2}
                            px={4}
                            borderRadius="md"
                            bg="red.600"
                            color="white"
                            fontWeight="medium"
                            fontSize="sm"
                            _hover={{ bg: "red.700" }}
                            _active={{ bg: "red.800" }}
                            _disabled={{ opacity: 0.5, cursor: "not-allowed" }}
                            onClick={handleResetAllData}
                            // @ts-ignore
                            disabled={isResettingAllData}
                        >
                            {isResettingAllData ? t("resetting") : t("reset_all_data")}
                        </Box>
                    </Box>
                </HStack>
            </Box>
        </Box>
    );
}