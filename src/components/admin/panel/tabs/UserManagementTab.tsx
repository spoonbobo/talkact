"use client";

import React, { useState } from "react";
import { Box, Flex, Heading, Icon, Separator, Tabs, Text, VStack } from "@chakra-ui/react";
import { FaUserEdit } from "react-icons/fa";
import { motion } from "framer-motion";
import UserTable from "@/components/admin/users/user_table";
import UserDetails from "@/components/admin/users/user_details";
import UserPermissions from "@/components/admin/users/user_permissions";
import UserLogger from "@/components/admin/users/user_logger";
import { CreateUserModal } from "@/components/admin/users/user_modal";
import ResizableContainer from "../layout/ResizableContainer";

// Define the User interface if it's not already defined in your types/user.d.ts
interface User {
    id: string;
    username: string;
    email: string;
    avatar?: string;
    role: string;
    created_at: string;
    updated_at: string;
}

const MotionBox = motion.create(Box);

interface UserManagementTabProps {
    users: User[];
    loading: boolean;
    error: string | null;
    search: string;
    setSearch: (search: string) => void;
    pagination: {
        total: number;
        limit: number;
        offset: number;
    };
    setPagination: (pagination: any) => void;
    formatDate: (dateString: string | undefined) => string;
    formatUserId: (userId: string) => string;
    t: (key: string) => string;
    colors: {
        textColor: string;
        textColorHeading: string;
        textColorStrong: string;
        textColorMuted: string;
        inputBgColor: string;
        borderColor: string;
        inputBorderHoverColor: string;
        tableHeaderBg: string;
        errorBg: string;
        errorText: string;
        emptyBg: string;
        hoverBg: string;
        paginationBg: string;
        paginationDisabledBg: string;
        paginationColor: string;
        paginationDisabledColor: string;
        refreshButtonHoverBg: string;
        cardBg: string;
        bgSubtle: string;
    };
    handleUserCreated: () => void;
}

export default function UserManagementTab({
    users,
    loading,
    error,
    search,
    setSearch,
    pagination,
    setPagination,
    formatDate,
    formatUserId,
    t,
    colors,
    handleUserCreated,
}: UserManagementTabProps) {
    const [selectedUser, setSelectedUser] = useState<User | null>(null);
    const [isCreateUserModalOpen, setIsCreateUserModalOpen] = useState(false);

    const handleUserSelect = (user: User) => {
        setSelectedUser(user);
    };

    // Top component - Users List
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
                <Heading size="md" color={colors.textColor}>
                    {t("user_management")}
                </Heading>
                <Box>
                    <Box
                        as="button"
                        py={2}
                        px={4}
                        borderRadius="md"
                        bg="blue.500"
                        color="white"
                        fontWeight="medium"
                        fontSize="sm"
                        _hover={{ bg: "blue.600" }}
                        _active={{ bg: "blue.700" }}
                        onClick={() => setIsCreateUserModalOpen(true)}
                        display="flex"
                        alignItems="center"
                        gap={2}
                    >
                        <Icon as={FaUserEdit} />
                        {t("create_user")}
                    </Box>
                </Box>
            </Flex>
            <Separator mb={6} />

            <UserTable
                users={users}
                loading={loading}
                error={error}
                search={search}
                setSearch={setSearch}
                pagination={pagination}
                setPagination={setPagination}
                selectedUser={selectedUser}
                onUserSelect={handleUserSelect}
                formatDate={formatDate}
                formatUserId={formatUserId}
                t={t}
                colors={{
                    textColor: colors.textColor,
                    textColorHeading: colors.textColorHeading,
                    textColorStrong: colors.textColorStrong,
                    inputBgColor: colors.inputBgColor,
                    borderColor: colors.borderColor,
                    inputBorderHoverColor: colors.inputBorderHoverColor,
                    tableHeaderBg: colors.tableHeaderBg,
                    errorBg: colors.errorBg,
                    errorText: colors.errorText,
                    emptyBg: colors.emptyBg,
                    hoverBg: colors.hoverBg,
                    paginationBg: colors.paginationBg,
                    paginationDisabledBg: colors.paginationDisabledBg,
                    paginationColor: colors.paginationColor,
                    paginationDisabledColor: colors.paginationDisabledColor,
                    refreshButtonHoverBg: colors.refreshButtonHoverBg,
                }}
            />
        </Box>
    );

    // Bottom component - User Details with Tabs
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
                            <Tabs.Trigger value="activity">{t("activity")}</Tabs.Trigger>
                            <Tabs.Trigger value="permissions">{t("permissions")}</Tabs.Trigger>
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
                                    <UserDetails
                                        selectedUser={selectedUser}
                                        formatDate={formatDate}
                                        formatUserId={formatUserId}
                                        t={t}
                                        colors={{
                                            textColorMuted: colors.textColorMuted,
                                            textColorHeading: colors.textColorHeading,
                                            textColorStrong: colors.textColorStrong,
                                        }}
                                    />
                                </MotionBox>
                            </Tabs.Content>

                            <Tabs.Content value="activity">
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
                                    {!selectedUser ? (
                                        <Text color={colors.textColorMuted}>{t("select_user_to_view_activity")}</Text>
                                    ) : (
                                        <VStack align="stretch" gap={3}>
                                            <Text fontSize="sm" fontWeight="medium" color={colors.textColorStrong}>
                                                {t("recent_activity")}
                                            </Text>

                                            <UserLogger
                                                userId={selectedUser.id}
                                                limit={15}
                                                showUsername={false}
                                                showHeader={true}
                                                height="300px"
                                                onLogClick={(log) => {
                                                    console.log("Log clicked:", log);
                                                }}
                                            />
                                        </VStack>
                                    )}
                                </MotionBox>
                            </Tabs.Content>

                            <Tabs.Content value="permissions">
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
                                    <UserPermissions
                                        selectedUser={selectedUser}
                                        t={t}
                                        colors={{
                                            textColorMuted: colors.textColorMuted,
                                            textColorStrong: colors.textColorStrong,
                                            cardBg: colors.cardBg,
                                            borderColor: colors.borderColor,
                                        }}
                                    />
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

            <CreateUserModal
                isOpen={isCreateUserModalOpen}
                onClose={() => setIsCreateUserModalOpen(false)}
                onUserCreated={handleUserCreated}
            />
        </>
    );
} 