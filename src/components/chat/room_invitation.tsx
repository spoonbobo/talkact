"use client"

import { useState, useEffect, useRef } from "react";
import {
    Box,
    Input,
    Button,
    VStack,
    HStack,
    Text,
    Avatar,
    Spinner,
    Flex,
    Badge,
    Separator,
    IconButton,
    Icon
} from "@chakra-ui/react";
import { FaSearch, FaUserPlus, FaCheck } from "react-icons/fa";
import axios from "axios";
import { User } from "@/types/user";
import { useTranslations } from "next-intl";
import { useDispatch } from "react-redux";
import { updateRoom, inviteToRoom } from "@/store/features/chatSlice";
import { toaster } from "@/components/ui/toaster";
import { useChatPageColors } from "@/utils/colors";

interface RoomInvitationProps {
    roomId: string;
    currentUsers: User[];
    onClose: () => void;
}

export const RoomInvitation = ({ roomId, currentUsers, onClose }: RoomInvitationProps) => {
    const t = useTranslations("Chat");
    const colors = useChatPageColors();
    const dispatch = useDispatch();

    const [searchQuery, setSearchQuery] = useState("");
    const [searchResults, setSearchResults] = useState<User[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [selectedUsers, setSelectedUsers] = useState<User[]>([]);
    const [isInviting, setIsInviting] = useState(false);

    const searchRef = useRef<HTMLDivElement>(null);
    const [showResults, setShowResults] = useState(false);

    // Current user IDs for filtering
    const currentUserIds = useRef<string[]>([]);

    // Update the ref when currentUsers changes
    useEffect(() => {
        currentUserIds.current = currentUsers.map(user => user.user_id);
    }, [currentUsers]);

    // Custom outside click handler
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
                setShowResults(false);
            }
        };

        document.addEventListener("mousedown", handleClickOutside);
        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
        };
    }, [searchRef]);

    // Search for users
    useEffect(() => {
        const searchUsers = async () => {
            if (searchQuery.trim().length < 2) {
                setSearchResults([]);
                return;
            }

            try {
                setIsLoading(true);
                const response = await axios.get(`/api/user/get_users?search=${searchQuery}`);

                // Filter out users who are already in the room
                const filteredResults = response.data.users.filter(
                    (user: User) => !currentUserIds.current.includes(user.user_id)
                );

                setSearchResults(filteredResults);
                setShowResults(true);
            } catch (error) {
                console.error("Error searching users:", error);
                toaster.create({
                    title: t("error"),
                    description: t("error_searching_users"),
                    type: "error"
                });
            } finally {
                setIsLoading(false);
            }
        };

        const debounceTimeout = setTimeout(searchUsers, 300);
        return () => clearTimeout(debounceTimeout);
    }, [searchQuery, t]);

    // Handle selecting a user
    const handleSelectUser = (user: User) => {
        if (!selectedUsers.some(u => u.user_id === user.user_id)) {
            setSelectedUsers([...selectedUsers, user]);
        }
        setSearchQuery("");
        setShowResults(false);
    };

    // Handle removing a selected user
    const handleRemoveUser = (userId: string) => {
        setSelectedUsers(selectedUsers.filter(user => user.user_id !== userId));
    };

    // Handle inviting users
    const handleInviteUsers = async () => {
        if (selectedUsers.length === 0) return;

        try {
            setIsInviting(true);

            // Get the user IDs to add
            const userIdsToAdd = selectedUsers.map(user => user.user_id);

            // Update the room's active users
            const response = await axios.put("/api/chat/update_room", {
                roomId,
                active_users: [...currentUserIds.current, ...userIdsToAdd]
            });

            // join room
            dispatch(inviteToRoom({ roomId, userIds: userIdsToAdd }));

            if (response.data) {
                // Update the room in Redux
                dispatch(updateRoom(response.data));

                // For each invited user, update their active_rooms
                await Promise.all(userIdsToAdd.map(userId =>
                    axios.post("/api/user/update_active_rooms", {
                        roomId,
                        action: "add",
                        userId // Pass the specific user ID to update
                    })
                ));

                toaster.create({
                    title: t("success"),
                    description: t("users_invited_successfully"),
                    type: "success"
                });

                // Close the invitation dialog
                onClose();
            }
        } catch (error) {
            console.error("Error inviting users:", error);
            toaster.create({
                title: t("error"),
                description: t("error_inviting_users"),
                type: "error"
            });
        } finally {
            setIsInviting(false);
        }
    };

    return (
        <Box
            borderRadius="md"
            bg={colors.bgSubtle}
            width="100%"
        >
            <Box position="relative" ref={searchRef} mb={4}>
                <Flex gap={2}>
                    <Box position="relative" flex={1}>
                        <Input
                            placeholder={t("search_users")}
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            onFocus={() => {
                                if (searchResults.length > 0) setShowResults(true);
                            }}
                            pr="40px"
                            bg={colors.formInputBg}
                            color={colors.textColor}
                            borderColor={colors.borderColor}
                            _hover={{ borderColor: colors.borderColor }}
                            _focus={{ borderColor: colors.createButtonBg }}
                            size="sm"
                        />
                        <Box position="absolute" right="10px" top="50%" transform="translateY(-50%)">
                            {isLoading ? <Spinner size="sm" /> : <FaSearch />}
                        </Box>
                    </Box>

                    <IconButton
                        aria-label={t("invite")}
                        size="sm"
                        variant="outline"
                        borderRadius="full"
                        onClick={handleInviteUsers}
                        disabled={selectedUsers.length === 0}
                        loading={isInviting}
                        colorScheme="blue"
                    >
                        <Icon as={FaUserPlus} />
                    </IconButton>
                </Flex>

                {/* Search results dropdown */}
                {showResults && searchResults.length > 0 && (
                    <Box
                        position="absolute"
                        top="100%"
                        left={0}
                        right={0}
                        mt={1}
                        maxH="200px"
                        overflowY="auto"
                        bg={colors.cardBg}
                        borderWidth="1px"
                        borderColor={colors.borderColor}
                        borderRadius="md"
                        zIndex={10}
                        boxShadow="md"
                    >
                        {searchResults.map(user => (
                            <HStack
                                key={user.user_id}
                                p={2}
                                _hover={{ bg: colors.hoverBg }}
                                cursor="pointer"
                                onClick={() => handleSelectUser(user)}
                            >
                                <Avatar.Root size="sm" mt={2}>
                                    <Avatar.Fallback name={user.username || user.email} />
                                    <Avatar.Image src={user.avatar || undefined} />
                                </Avatar.Root>
                                <Box flex={1}>
                                    <Text fontWeight="medium" color={colors.textColorHeading}>
                                        {user.username || "Unnamed User"}
                                    </Text>
                                    <Text fontSize="xs" color={colors.textColorSecondary}>
                                        {user.email}
                                    </Text>
                                </Box>
                                <FaUserPlus color={colors.createButtonBg} />
                            </HStack>
                        ))}
                    </Box>
                )}

                {showResults && searchQuery.trim().length >= 2 && searchResults.length === 0 && !isLoading && (
                    <Box
                        position="absolute"
                        top="100%"
                        left={0}
                        right={0}
                        mt={1}
                        p={2}
                        bg={colors.cardBg}
                        borderWidth="1px"
                        borderColor={colors.borderColor}
                        borderRadius="md"
                        zIndex={10}
                    >
                        <Text fontSize="sm" color={colors.textColorSecondary}>
                            {t("no_users_found")}
                        </Text>
                    </Box>
                )}
            </Box>

            {/* Selected users */}
            {selectedUsers.length > 0 && (
                <Box>
                    <Text fontSize="sm" fontWeight="medium" mb={2} color={colors.textColorHeading}>
                        {t("selected_users")}:
                    </Text>
                    <Flex flexWrap="wrap" gap={2}>
                        {selectedUsers.map(user => (
                            <Badge
                                key={user.user_id}
                                colorScheme="blue"
                                borderRadius="full"
                                px={2}
                                py={1}
                                display="flex"
                                alignItems="center"
                            >
                                <Text fontSize="xs" mr={1}>
                                    {user.username || user.email}
                                </Text>
                                <Box
                                    as="span"
                                    cursor="pointer"
                                    onClick={() => handleRemoveUser(user.user_id)}
                                    ml={1}
                                    fontSize="xs"
                                >
                                    ✕
                                </Box>
                            </Badge>
                        ))}
                    </Flex>
                </Box>
            )}
        </Box>
    );
};
