"use client"

import React, { useState, useEffect } from "react";
import { Box, Flex, Heading, Icon, Separator, Tabs, Text, VStack, Input, Badge, Spinner, Table, IconButton } from "@chakra-ui/react";
import { FaSearch, FaSync, FaUsers, FaUserEdit, FaCommentDots } from "react-icons/fa";
import { motion } from "framer-motion";
import ResizableContainer from "../layout/ResizableContainer";
import { toaster } from "@/components/ui/toaster";
import { RootState } from "@/store/store";
import { useSelector } from "react-redux";

// Define the ChatRoom interface
interface ChatRoom {
    id: string;
    name: string;
    created_at: string;
    last_updated: string;
    unread: number;
    active_users: any[];
}

// Define the User interface for active users
interface User {
    id: string;
    username: string;
    email: string;
    avatar?: string;
    role?: string;
}

const MotionBox = motion.create(Box);

interface ChatroomTabProps {
    colors: {
        textColor: string;
        textColorHeading: string;
        textColorStrong: string;
        textColorMuted: string;
        cardBg: string;
        borderColor: string;
        bgSubtle: string;
        inputBgColor: string;
        inputBorderHoverColor: string;
        tableHeaderBg: string;
        errorBg: string;
        errorText: string;
        emptyBg: string;
        hoverBg: string;
        paginationBg?: string;
        paginationDisabledBg?: string;
        paginationColor?: string;
        paginationDisabledColor?: string;
        refreshButtonHoverBg?: string;
    };
    t: (key: string) => string;
}

export default function ChatroomTab({ colors, t }: ChatroomTabProps) {
    const [chatrooms, setChatrooms] = useState<ChatRoom[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [search, setSearch] = useState('');
    const [selectedChatroom, setSelectedChatroom] = useState<ChatRoom | null>(null);
    const [activeUsers, setActiveUsers] = useState<User[]>([]);
    const [loadingUsers, setLoadingUsers] = useState(false);
    const [isCreateChatroomModalOpen, setIsCreateChatroomModalOpen] = useState(false);
    const currentUser = useSelector((state: RootState) => state.user.currentUser);
    const lastOpenedTeam = useSelector((state: RootState) => state.user.lastOpenedTeam);


    // Fetch chatrooms
    const fetchChatrooms = async () => {
        try {
            setLoading(true);
            const response = await fetch(`/api/team/get_team?team_id=${lastOpenedTeam}`);

            if (!response.ok) {
                throw new Error(`Error: ${response.status}`);
            }

            const team_data = await response.json();
            const team_rooms = team_data.team.rooms;

            const roomResponse = await fetch('/api/chat/get_rooms_v2', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ roomIds: team_rooms }),
            });
            const data = await roomResponse.json();
            setChatrooms(data);
            setError(null);
        } catch (err) {
            toaster.create({
                title: "Error fetching chatrooms",
                description: "Failed to fetch chatrooms. Please try again later.",
                type: "error"
            });
            setError((err as Error).message);
        } finally {
            setLoading(false);
        }
    };

    // Fetch active users for a chatroom
    const fetchActiveUsers = async (userIds: string[]) => {
        if (!userIds || userIds.length === 0) {
            setActiveUsers([]);
            return;
        }

        try {
            setLoadingUsers(true);
            const response = await fetch('/api/chat/get_rooms', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ userIds }),
            });

            if (!response.ok) {
                throw new Error(`Error: ${response.status}`);
            }

            const data = await response.json();

            const teamResponse = await fetch(`/api/team/get_team?team_id=${lastOpenedTeam}`);

            if (!teamResponse.ok) {
                throw new Error(`Error: ${teamResponse.status}`);
            }

            const team_data = await teamResponse.json();
            const team_owners = team_data.team.owners;

            const augmentedUsers = data.users.map((user: User) => ({
                ...user,
                role: team_owners.includes(user.id) ? 'owner' : 'member'
            }));

            setActiveUsers(augmentedUsers || []);
        } catch (err) {
            toaster.create({
                title: "Error fetching users",
                description: "Failed to fetch active users. Please try again later.",
                type: "error"
            });
        } finally {
            setLoadingUsers(false);
        }
    };

    console.log("chatrooms", chatrooms);
    console.log("users", activeUsers);

    // Initial fetch
    useEffect(() => {
        fetchChatrooms();
    }, []);

    // Handle chatroom selection
    const handleChatroomSelect = (chatroom: ChatRoom) => {
        setSelectedChatroom(chatroom);
        if (chatroom.active_users && chatroom.active_users.length > 0) {
            fetchActiveUsers(chatroom.active_users);
        } else {
            setActiveUsers([]);
        }
    };

    // Format date helper
    const formatDate = (dateString: string | undefined) => {
        if (!dateString) return "N/A";
        return new Date(dateString).toLocaleString();
    };

    // Filter chatrooms based on search
    const filteredChatrooms = chatrooms.filter(room =>
        room.name.toLowerCase().includes(search.toLowerCase())
    );

    // Top component - Chatroom List
    const topComponent = (
        <Box
            bg={colors.cardBg}
            borderRadius="md"
            borderWidth="1px"
            borderColor={colors.borderColor}
            p={6}
            boxShadow="sm"
            height="100%"
        >
            <Flex justifyContent="space-between" alignItems="center" mb={4}>
                <Heading size="md" color={colors.textColorHeading}>
                    {t("chatroom_management")}
                </Heading>
            </Flex>
            <Separator mb={6} />

            <Flex
                justifyContent="space-between"
                alignItems="center"
                mb={4}
                flexDirection={{ base: "column", md: "row" }}
                gap={2}
            >
                <Text fontSize="md" fontWeight="bold" textAlign="left" color={colors.textColorHeading}>
                    {t("chatroom_list")}
                </Text>
                <Flex gap={4}>
                    <Box position="relative">
                        <Input
                            placeholder={t("search_chatrooms")}
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            bg={colors.inputBgColor}
                            borderColor={colors.borderColor}
                            _hover={{ borderColor: colors.inputBorderHoverColor }}
                            _focus={{ borderColor: "blue.500", boxShadow: "0 0 0 1px var(--chakra-colors-blue-500)" }}
                            color={colors.textColor}
                            size="sm"
                            maxW="300px"
                        />
                    </Box>
                    <IconButton
                        aria-label={t("refresh")}
                        size="sm"
                        variant="outline"
                        borderRadius="full"
                        onClick={fetchChatrooms}
                        colorScheme="blue"
                    >
                        <Icon as={FaSync} />
                    </IconButton>
                </Flex>
            </Flex>

            {loading ? (
                <Flex justify="center" align="center" height="200px">
                    <Spinner size="lg" color="blue.500" />
                </Flex>
            ) : error ? (
                <Box p={5} textAlign="center" bg={colors.errorBg} borderRadius="md">
                    <Text color={colors.errorText}>{error}</Text>
                </Box>
            ) : filteredChatrooms.length === 0 ? (
                <Box p={5} textAlign="center" bg={colors.emptyBg} borderRadius="md">
                    <Text color={colors.textColorMuted}>{t("no_chatrooms_found")}</Text>
                </Box>
            ) : (
                <Box overflowX="auto" width="100%">
                    <Table.Root variant="outline" size="md" colorScheme="gray">
                        <Table.Header
                            bg={colors.tableHeaderBg}
                            position="sticky"
                            top={0}
                            zIndex={1}
                        >
                            <Table.Row>
                                <Table.ColumnHeader
                                    fontWeight="semibold"
                                    width="30%"
                                    color={colors.textColorHeading}
                                >
                                    {t("name")}
                                </Table.ColumnHeader>
                                <Table.ColumnHeader
                                    fontWeight="semibold"
                                    width="25%"
                                    color={colors.textColorHeading}
                                    display={{ base: "none", md: "table-cell" }}
                                >
                                    {t("created_at")}
                                </Table.ColumnHeader>
                                <Table.ColumnHeader
                                    fontWeight="semibold"
                                    width="25%"
                                    color={colors.textColorHeading}
                                    display={{ base: "none", md: "table-cell" }}
                                >
                                    {t("last_updated")}
                                </Table.ColumnHeader>
                                <Table.ColumnHeader
                                    fontWeight="semibold"
                                    width="20%"
                                    color={colors.textColorHeading}
                                    textAlign="center"
                                >
                                    {t("active_users")}
                                </Table.ColumnHeader>
                            </Table.Row>
                        </Table.Header>
                        <Table.Body>
                            {filteredChatrooms.map((room) => (
                                <Table.Row
                                    key={room.id}
                                    cursor="pointer"
                                    _hover={{ bg: 'rgba(255, 255, 255, 0.02)' }}
                                    onClick={() => handleChatroomSelect(room)}
                                    bg={selectedChatroom?.id === room.id ? 'rgba(255, 255, 255, 0.03)' : undefined}
                                    borderLeft={selectedChatroom?.id === room.id ? '2px solid rgba(59, 130, 246, 0.6)' : 'none'}
                                >
                                    <Table.Cell fontSize={{ base: "xs", md: "sm" }} color={colors.textColorStrong}>
                                        <Flex align="center" gap={2}>
                                            {room.name}
                                        </Flex>
                                    </Table.Cell>
                                    <Table.Cell
                                        fontSize={{ base: "xs", md: "sm" }}
                                        color={colors.textColorStrong}
                                        display={{ base: "none", md: "table-cell" }}
                                    >
                                        {formatDate(room.created_at)}
                                    </Table.Cell>
                                    <Table.Cell
                                        fontSize={{ base: "xs", md: "sm" }}
                                        color={colors.textColorStrong}
                                        display={{ base: "none", md: "table-cell" }}
                                    >
                                        {formatDate(room.last_updated)}
                                    </Table.Cell>
                                    <Table.Cell fontSize={{ base: "xs", md: "sm" }} textAlign="center">
                                        <Badge colorScheme="blue">
                                            {room.active_users?.length || 0}
                                        </Badge>
                                    </Table.Cell>
                                </Table.Row>
                            ))}
                        </Table.Body>
                    </Table.Root>
                </Box>
            )}
        </Box>
    );

    // Bottom component - Chatroom Details
    const bottomComponent = (
        <Box
            bg={colors.bgSubtle}
            borderRadius="md"
            boxShadow="sm"
            p={4}
            borderWidth="1px"
            borderColor={colors.borderColor}
            height="100%"
        >
            <Flex width="100%" height="100%">
                <Box flex="1" mr={4} height="100%">
                    <Tabs.Root defaultValue="details" variant="line">
                        <Tabs.List mb={4}>
                            <Tabs.Trigger value="details">{t("details")}</Tabs.Trigger>
                            <Tabs.Trigger value="users">{t("active_users")}</Tabs.Trigger>
                            <Tabs.Trigger value="messages">{t("messages")}</Tabs.Trigger>
                            <Tabs.Indicator />
                        </Tabs.List>

                        <Box flex="1" position="relative" overflow="hidden">
                            <Tabs.Content value="details">
                                <MotionBox
                                    height="100%"
                                    p={4}
                                    initial={{ opacity: 0, x: -20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{
                                        duration: 0.4,
                                        ease: "easeOut",
                                        delay: 0.1,
                                    }}
                                >
                                    {!selectedChatroom ? (
                                        <Flex justify="center" align="center" height="100%" direction="column" gap={4}>
                                            <Icon as={FaCommentDots} fontSize="4xl" color="gray.400" />
                                            <Text color={colors.textColorMuted}>{t("select_chatroom_to_view_details")}</Text>
                                        </Flex>
                                    ) : (
                                        <Flex direction="column" gap={4}>
                                            <Flex align="center" gap={4}>
                                                <Box
                                                    p={3}
                                                    borderRadius="md"
                                                    bg="blue.50"
                                                    color="blue.500"
                                                >
                                                    <Icon as={FaCommentDots} fontSize="xl" />
                                                </Box>
                                                <Box>
                                                    <Heading size="md" color={colors.textColorHeading}>{selectedChatroom.name}</Heading>
                                                    <Text color={colors.textColorMuted}>ID: {selectedChatroom.id}</Text>
                                                    <Badge colorScheme="blue" mt={1}>
                                                        {selectedChatroom.active_users?.length || 0} {t("active_users")}
                                                    </Badge>
                                                </Box>
                                            </Flex>

                                            <Separator my={2} />

                                            <Flex wrap="wrap" gap={6}>
                                                <Box>
                                                    <Text fontSize="xs" color={colors.textColorMuted}>
                                                        {t("chatroom_id")}
                                                    </Text>
                                                    <Text fontSize="sm" fontWeight="medium" color={colors.textColorStrong}>
                                                        {selectedChatroom.id}
                                                    </Text>
                                                </Box>

                                                <Box>
                                                    <Text fontSize="xs" color={colors.textColorMuted}>
                                                        {t("created_at")}
                                                    </Text>
                                                    <Text fontSize="sm" color={colors.textColorStrong}>
                                                        {formatDate(selectedChatroom.created_at)}
                                                    </Text>
                                                </Box>

                                                <Box>
                                                    <Text fontSize="xs" color={colors.textColorMuted}>
                                                        {t("last_updated")}
                                                    </Text>
                                                    <Text fontSize="sm" color={colors.textColorStrong}>
                                                        {formatDate(selectedChatroom.last_updated)}
                                                    </Text>
                                                </Box>

                                                <Box>
                                                    <Text fontSize="xs" color={colors.textColorMuted}>
                                                        {t("unread_messages")}
                                                    </Text>
                                                    <Text fontSize="sm" color={colors.textColorStrong}>
                                                        {selectedChatroom.unread || 0}
                                                    </Text>
                                                </Box>
                                            </Flex>
                                        </Flex>
                                    )}
                                </MotionBox>
                            </Tabs.Content>

                            <Tabs.Content value="users">
                                <MotionBox
                                    height="100%"
                                    p={4}
                                    initial={{ opacity: 0, x: -20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{
                                        duration: 0.4,
                                        ease: "easeOut",
                                        delay: 0.1,
                                    }}
                                >
                                    {!selectedChatroom ? (
                                        <Flex justify="center" align="center" height="100%" direction="column" gap={4}>
                                            <Icon as={FaUsers} fontSize="4xl" color="gray.400" />
                                            <Text color={colors.textColorMuted}>{t("select_chatroom_to_view_users")}</Text>
                                        </Flex>
                                    ) : loadingUsers ? (
                                        <Flex justify="center" align="center" height="200px">
                                            <Box
                                                as="div"
                                                className="spinner"
                                                width="40px"
                                                height="40px"
                                                borderWidth="4px"
                                                borderStyle="solid"
                                                borderColor="transparent"
                                                borderTopColor={colors.textColorStrong}
                                                borderRadius="50%"
                                                animation="spin 1s linear infinite"
                                                // TODO:
                                                // @ts-ignore
                                                sx={{
                                                    "@keyframes spin": {
                                                        "0%": { transform: "rotate(0deg)" },
                                                        "100%": { transform: "rotate(360deg)" }
                                                    }
                                                }}
                                            />
                                        </Flex>
                                    ) : activeUsers.length === 0 ? (
                                        <Flex justify="center" align="center" height="100%" direction="column" gap={4}>
                                            <Icon as={FaUsers} fontSize="4xl" color="gray.400" />
                                            <Text color={colors.textColorMuted}>{t("no_active_users")}</Text>
                                        </Flex>
                                    ) : (
                                        <Box overflowX="auto">
                                            <Box as="table" width="100%" style={{ borderCollapse: 'collapse' }}>
                                                <Box as="thead" bg={colors.tableHeaderBg}>
                                                    <Box as="tr">
                                                        <Box as="th" py={2} px={3} textAlign="left" color={colors.textColorMuted} fontWeight="semibold">{t("username")}</Box>
                                                        <Box as="th" py={2} px={3} textAlign="left" color={colors.textColorMuted} fontWeight="semibold">{t("email")}</Box>
                                                        <Box as="th" py={2} px={3} textAlign="center" color={colors.textColorMuted} fontWeight="semibold">{t("role")}</Box>
                                                    </Box>
                                                </Box>
                                                <Box as="tbody">
                                                    {activeUsers.map((user) => (
                                                        <Box
                                                            as="tr"
                                                            key={user.id}
                                                            _hover={{ bg: colors.hoverBg }}
                                                        >
                                                            <Box as="td" py={2} px={3} fontWeight="medium" color={colors.textColorStrong}>{user.username}</Box>
                                                            <Box as="td" py={2} px={3} color={colors.textColor}>{user.email}</Box>
                                                            <Box as="td" py={2} px={3} textAlign="center">
                                                                <Badge colorScheme={user.role === 'admin' ? 'red' : 'blue'}>
                                                                    {user.role || "User"}
                                                                </Badge>
                                                            </Box>
                                                        </Box>
                                                    ))}
                                                </Box>
                                            </Box>
                                        </Box>
                                    )}
                                </MotionBox>
                            </Tabs.Content>

                            <Tabs.Content value="messages">
                                <MotionBox
                                    height="100%"
                                    p={4}
                                    initial={{ opacity: 0, x: -20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{
                                        duration: 0.4,
                                        ease: "easeOut",
                                        delay: 0.1,
                                    }}
                                >
                                    {!selectedChatroom ? (
                                        <Text color={colors.textColorMuted}>{t("select_chatroom_to_view_messages")}</Text>
                                    ) : (
                                        <VStack align="stretch" gap={3}>
                                            <Text fontSize="sm" fontWeight="medium" color={colors.textColorStrong}>
                                                {t("recent_messages")}
                                            </Text>
                                            <Text color={colors.textColorMuted}>{t("message_history_coming_soon")}</Text>
                                        </VStack>
                                    )}
                                </MotionBox>
                            </Tabs.Content>
                        </Box>
                    </Tabs.Root>
                </Box>
            </Flex>
        </Box>
    );

    return (
        <>
            <ResizableContainer topComponent={topComponent} bottomComponent={bottomComponent} />
        </>
    );
} 