"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  Box,
  Heading,
  Text,
  VStack,
  Flex,
  Icon,
  Separator,
  Container,
  createListCollection,
  Tabs,
} from "@chakra-ui/react";
import { useTranslations } from "next-intl";
import { useSession } from "next-auth/react";
import { FaUsers, FaSync, FaUserEdit } from "react-icons/fa";
import { motion } from "framer-motion";
import Loading from "@/components/loading";
import { useColorModeValue } from "@/components/ui/color-mode";
import { useSelector } from 'react-redux';
import { RootState } from "@/store/store";
import { useRouter } from "next/navigation";
import UserLogger from "@/components/admin/panel/user_logger";
import UserTable from "@/components/admin/panel/user_table";
import UserDetails from "@/components/admin/panel/user_details"
import UserPermissions from "@/components/admin/panel/user_permissions";
import { CreateUserModal } from '@/components/admin/panel/user_modal';
import { toaster } from "@/components/ui/toaster";

// Create motion components
const MotionBox = motion.create(Box);
const MotionFlex = motion.create(Flex);
const MotionVStack = motion.create(VStack);

// Define the User interface if it's not already defined in your types/user.d.ts
interface User {
  id: string;
  user_id: string;
  username: string;
  email: string;
  avatar?: string;
  role: string;
  created_at: string;
  updated_at: string;
}

export default function AdminPanelPage() {
  const t = useTranslations("AdminPanel");
  const { data: session } = useSession();
  const router = useRouter();
  const { currentUser, isAuthenticated, isLoading } = useSelector(
    (state: RootState) => state.user
  );

  // Keep tab state for future expansion
  const [activeTab, setActiveTab] = useState(0);

  // Add state for users data
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [pagination, setPagination] = useState({
    total: 0,
    limit: 10,
    offset: 0
  });

  // Add state for selected user
  const [selectedUser, setSelectedUser] = useState<User | null>(null);

  // Add debounced search
  const [debouncedSearch, setDebouncedSearch] = useState('');

  // Resizable layout state - set initial top height to 65% (user details at 35%)
  const [topHeight, setTopHeight] = useState(65);
  const containerRef = useRef<HTMLDivElement>(null);
  const isDragging = useRef(false);
  const startY = useRef(0);
  const startHeight = useRef(0);

  // Define custom colors using useColorModeValue for dark mode support
  const borderColor = useColorModeValue("gray.200", "gray.700");
  const hoverBg = useColorModeValue("gray.50", "gray.700");
  const textColor = useColorModeValue("gray.800", "gray.100");
  const cardBg = useColorModeValue("white", "gray.800");
  const textColorHeading = useColorModeValue("gray.800", "gray.100");
  const textColorStrong = useColorModeValue("gray.800", "gray.100");
  const textColorMuted = useColorModeValue("gray.600", "gray.400");
  const bgSubtle = useColorModeValue("gray.50", "gray.800");
  const tableHeaderBg = useColorModeValue("gray.50", "gray.800");
  const errorBg = useColorModeValue("red.50", "red.900");
  const errorText = useColorModeValue("red.500", "red.300");
  const emptyBg = useColorModeValue("gray.50", "gray.800");
  const paginationBg = useColorModeValue("gray.200", "gray.700");
  const paginationDisabledBg = useColorModeValue("gray.100", "gray.800");
  const paginationColor = useColorModeValue("gray.700", "gray.300");
  const paginationDisabledColor = useColorModeValue("gray.400", "gray.600");
  const refreshButtonHoverBg = useColorModeValue("gray.100", "gray.600");
  const inputBgColor = useColorModeValue("white", "gray.700");
  const inputBorderHoverColor = useColorModeValue("gray.300", "gray.600");

  // Define the tab items with proper typing
  const tabItems = [
    { icon: FaUsers, label: t("users"), id: 0 },
    // More tabs can be added here in the future
  ];

  // Add state for user creation modal
  const [isCreateUserModalOpen, setIsCreateUserModalOpen] = useState(false);

  // Fetch users function
  const fetchUsers = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        limit: pagination.limit.toString(),
        offset: pagination.offset.toString()
      });

      if (debouncedSearch) {
        params.append('search', debouncedSearch);
      }

      const response = await fetch(`/api/user/get_users?${params.toString()}`);

      if (!response.ok) {
        throw new Error(`Error: ${response.status}`);
      }

      const data = await response.json();
      setUsers(data.users);
      setPagination(data.pagination);
      setError(null);
    } catch (err) {
      toaster.create({
        title: "Error fetching users",
        description: "Failed to fetch users. Please try again later.",
        type: "error"
      })
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
    }, 500);

    return () => clearTimeout(timer);
  }, [search]);

  // Fetch users when search or pagination changes
  useEffect(() => {
    if (isAuthenticated && activeTab === 0) {
      fetchUsers();
    }
  }, [debouncedSearch, pagination.limit, pagination.offset, activeTab, isAuthenticated]);

  // Format date helper
  const formatDate = (dateString: string | undefined) => {
    if (!dateString) return "N/A";
    return new Date(dateString).toLocaleString();
  };

  // Format UUID helper to get first substring
  const formatUserId = (userId: string) => {
    if (!userId) return "N/A";
    return userId.split('-')[0];
  };

  // Pagination helpers
  const totalPages = Math.ceil(pagination.total / pagination.limit);
  const currentPage = Math.floor(pagination.offset / pagination.limit) + 1;

  const handlePageChange = (newPage: number) => {
    if (newPage < 1 || newPage > totalPages) return;

    setPagination({
      ...pagination,
      offset: (newPage - 1) * pagination.limit
    });
  };

  // Per page options
  const perPageOptions = createListCollection({
    items: [
      { label: "10 per page", value: "10" },
      { label: "25 per page", value: "25" },
      { label: "50 per page", value: "50" },
      { label: "100 per page", value: "100" },
    ],
  });

  // Handle rows per page change
  const handleRowsPerPageChange = (value: string) => {
    setPagination({
      ...pagination,
      limit: parseInt(value),
      offset: 0 // Reset to first page
    });
  };

  // Handle user selection
  const handleUserSelect = (user: User) => {
    setSelectedUser(user);
  };

  // Resize handlers
  const handleMouseDown = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      e.preventDefault();
      isDragging.current = true;
      startY.current = e.clientY;
      startHeight.current = topHeight;
      document.body.style.userSelect = "none";
      document.body.style.cursor = "ns-resize";
    },
    [topHeight]
  );

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!isDragging.current || !containerRef.current) return;

    const containerHeight = containerRef.current.offsetHeight;
    const deltaY = e.clientY - startY.current;
    const deltaPercent = (deltaY / containerHeight) * 100;
    const newTopHeight = startHeight.current + deltaPercent;

    // Constrain the resize (min 20% for bottom, min 30% for top)
    if (newTopHeight >= 30 && 100 - newTopHeight >= 20) {
      setTopHeight(newTopHeight);
    }
  }, []);

  const handleMouseUp = useCallback(() => {
    isDragging.current = false;
    document.body.style.userSelect = "";
    document.body.style.cursor = "";
  }, []);

  useEffect(() => {
    const handleGlobalMouseMove = (e: MouseEvent) => handleMouseMove(e);
    const handleGlobalMouseUp = () => handleMouseUp();

    document.addEventListener("mousemove", handleGlobalMouseMove);
    document.addEventListener("mouseup", handleGlobalMouseUp);

    return () => {
      document.removeEventListener("mousemove", handleGlobalMouseMove);
      document.removeEventListener("mouseup", handleGlobalMouseUp);
    };
  }, [handleMouseMove, handleMouseUp]);

  // Show loading state while checking authentication
  if (isLoading || !session) {
    return <Loading />;
  }

  // Redirect if not authenticated
  if (!isAuthenticated && !session) {
    router.push('/login');
    return null;
  }

  // Animation variants
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        duration: 0.4,
        when: "beforeChildren",
        staggerChildren: 0.1,
      },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.3 } },
  };

  const tabVariants = {
    hidden: { opacity: 0, x: -20 },
    visible: { opacity: 1, x: 0, transition: { duration: 0.3 } },
  };

  // Add this function if you want to refresh user list after creation
  const handleUserCreated = () => {
    // Refresh your user list or perform any other actions
    // For example: refetchUsers();
  };

  return (
    <Container
      maxW="1400px"
      px={{ base: 4, md: 6, lg: 8 }}
      py={4}
      height="100%"
      position="relative"
      overflow="hidden"
    >
      <MotionBox
        width="100%"
        height="100%"
        initial="hidden"
        animate="visible"
        variants={containerVariants}
        display="flex"
        flexDirection="column"
        overflow="hidden"
        position="relative"
      >
        <MotionBox variants={itemVariants}>
          <Heading size="lg" mb={6} display="flex" alignItems="center" color={textColorHeading}>
            <Icon as={FaUsers} mr={3} color="blue.500" />
            {t("admin_panel")}
          </Heading>
        </MotionBox>

        <MotionFlex
          direction={{ base: "column", md: "row" }}
          gap={6}
          variants={itemVariants}
          height="calc(100% - 60px)"
          overflow="hidden"
        >
          {/* Left sidebar */}
          <MotionVStack
            width={{ base: "100%", md: "250px" }}
            align="stretch"
            height="fit-content"
            variants={itemVariants}
          >
            {tabItems.map((item) => (
              <motion.div key={item.id} variants={tabVariants}>
                <Box
                  as="button"
                  py={3}
                  px={4}
                  borderRadius="md"
                  bg={activeTab === item.id ? hoverBg : "transparent"}
                  color={textColor}
                  fontWeight="medium"
                  fontSize="sm"
                  width="100%"
                  textAlign="left"
                  _hover={{ bg: hoverBg }}
                  _active={{ bg: activeTab === item.id ? hoverBg : "gray.100" }}
                  onClick={() => setActiveTab(item.id)}
                >
                  <Flex align="center">
                    <Icon
                      as={item.icon}
                      color={textColor}
                      mr={2}
                    />
                    {item.label}
                  </Flex>
                </Box>
              </motion.div>
            ))}
          </MotionVStack>

          {/* Main content */}
          <MotionBox
            flex={1}
            variants={itemVariants}
            overflow="hidden"
            ref={containerRef}
            height="100%"
          >
            {/* Users Tab */}
            {activeTab === 0 && (
              <Flex
                width="100%"
                height="100%"
                position="relative"
                overflow="hidden"
                flexDirection="column"
              >
                {/* Top component - Users List */}
                <MotionBox
                  width="100%"
                  height={`${topHeight}%`}
                  overflow="auto"
                  transition={{ type: "spring", stiffness: 300, damping: 30 }}
                  bg={cardBg}
                  borderRadius="md"
                  borderWidth="1px"
                  borderColor={borderColor}
                  p={6}
                  boxShadow="sm"
                >
                  <Flex justifyContent="space-between" alignItems="center" mb={4}>
                    <Heading size="md" color={textColor}>
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
                      textColor,
                      textColorHeading,
                      textColorStrong,
                      inputBgColor,
                      borderColor,
                      inputBorderHoverColor,
                      tableHeaderBg,
                      errorBg,
                      errorText,
                      emptyBg,
                      hoverBg,
                      paginationBg,
                      paginationDisabledBg,
                      paginationColor,
                      paginationDisabledColor,
                      refreshButtonHoverBg
                    }}
                  />
                </MotionBox>

                {/* Draggable divider */}
                <Box
                  width="100%"
                  height="4px"
                  cursor="ns-resize"
                  position="relative"
                  onMouseDown={handleMouseDown}
                  _hover={{ bg: "rgba(0, 0, 0, 0.1)" }}
                  _active={{ bg: "rgba(0, 0, 0, 0.2)" }}
                  _before={{
                    content: '""',
                    position: "absolute",
                    top: "-2px",
                    width: "100%",
                    height: "8px",
                    cursor: "ns-resize",
                  }}
                />

                {/* Bottom component - User Details */}
                <MotionBox
                  width="100%"
                  height={`${100 - topHeight}%`}
                  overflow="auto"
                  transition={{ type: "spring", stiffness: 300, damping: 30 }}
                  bg={bgSubtle}
                  borderRadius="md"
                  boxShadow="sm"
                  p={4}
                  borderWidth="1px"
                  borderColor={borderColor}
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
                                  textColorMuted,
                                  textColorHeading,
                                  textColorStrong
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
                                <Text color={textColorMuted}>{t("select_user_to_view_activity")}</Text>
                              ) : (
                                <VStack align="stretch" gap={3}>
                                  <Text fontSize="sm" fontWeight="medium" color={textColorStrong}>
                                    {t("recent_activity")}
                                  </Text>

                                  <UserLogger
                                    userId={selectedUser.user_id}
                                    limit={15}
                                    showUsername={false}
                                    showHeader={true}
                                    height="300px"
                                    onLogClick={(log) => {
                                      console.log("Log clicked:", log);
                                      // You can add additional handling here if needed
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
                                  textColorMuted,
                                  textColorStrong,
                                  cardBg,
                                  borderColor
                                }}
                              />
                            </MotionBox>
                          </Tabs.Content>
                        </Box>
                      </Tabs.Root>
                    </Box>
                  </Flex>
                </MotionBox>
              </Flex>
            )}
          </MotionBox>
        </MotionFlex>
      </MotionBox>

      <CreateUserModal
        isOpen={isCreateUserModalOpen}
        onClose={() => setIsCreateUserModalOpen(false)}
        onUserCreated={handleUserCreated}
      />
    </Container>
  );
}