"use client";

import {
  Box,
  Text,
  Spinner,
  Flex,
  Portal,
  Heading,
  Icon,
  Container,
  Tabs,
  Stack,
  Field,
  Input,
  Button,
  Dialog,
} from "@chakra-ui/react";
import { Table, Select, createListCollection } from "@chakra-ui/react";
import { motion } from "framer-motion";
import { FaTasks, FaSync, FaEdit, FaSave, FaTimes } from "react-icons/fa";
import { useTranslations } from "next-intl";
import { useCallback, useRef, useState, useEffect } from "react";
import { useSelector } from "react-redux";
import { ITask } from "@/types/task";
import { useRouter } from "next/navigation";
import Loading from "@/components/loading";
import { useSession } from "next-auth/react";
import { useColorModeValue } from "@/components/ui/color-mode";
import { TaskStatusBadge, TaskMetadata, TaskSidebar, MCPToolCalls } from "@/components/task";
import axios from "axios";
import { toaster } from "@/components/ui/toaster";
import { RootState } from "@/store/store";

const MotionBox = motion.create(Box);

export default function TasksPage() {
  const t = useTranslations("Tasks");
  const router = useRouter();
  const { currentUser, isAuthenticated, isLoading, isOwner } = useSelector(
    (state: RootState) => state.user
  );
  // Task data state
  const [tasks, setTasks] = useState<ITask[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [totalTasks, setTotalTasks] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [totalPages, setTotalPages] = useState(1);
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedTask, setSelectedTask] = useState<ITask | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  // Resizable layout state - set initial top height to 75% (logger at 25%)
  const [topHeight, setTopHeight] = useState(75);
  const containerRef = useRef<HTMLDivElement>(null);
  const isDragging = useRef(false);
  const startY = useRef(0);
  const startHeight = useRef(0);

  // Fetch tasks function
  const fetchTasks = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      // Ensure statusFilter is a valid string before using it
      const statusParam = statusFilter && statusFilter !== "all" ? `&status=${statusFilter}` : "";

      const response = await fetch(
        `/api/task/get_tasks?page=${currentPage}&limit=${itemsPerPage}${statusParam}`
      );

      if (!response.ok) {
        throw new Error(`HTTP error! Status: ${response.status}`);
      }

      const data = await response.json();
      setTasks(data.tasks || []);
      setTotalTasks(data.pagination.total);
      setTotalPages(data.pagination.totalPages);
    } catch (err) {
      toaster.create({
        title: t("error_fetching_tasks_title"),
        description: t("error_fetching_tasks_description"),
        type: "error"
      });
      setError(err instanceof Error ? err.message : "Failed to fetch tasks");
      setTasks([]);
      setTotalTasks(0);
      setTotalPages(1);
    } finally {
      setLoading(false);
    }
  }, [currentPage, itemsPerPage, statusFilter, t]);

  // Handle page change
  const handlePageChange = useCallback((newPage: number) => {
    setCurrentPage(newPage);
  }, []);

  // Handle items per page change
  const handleItemsPerPageChange = useCallback((value: string) => {
    setItemsPerPage(parseInt(value, 10));
    setCurrentPage(1); // Reset to first page when changing items per page
  }, []);

  // Handle status filter change
  const handleStatusFilterChange = useCallback((valueObj: any) => {
    // Extract the value from the object structure
    const value = valueObj?.value?.[0] || "all";
    toaster.create({
      title: t("status"),
      description: t("showing") + ` ${value} ` + t("tasks"),
      type: "info"
    });
    setStatusFilter(value);
    setCurrentPage(1); // Reset to first page when changing filter
  }, [t]);

  // Add function to handle task selection
  const handleTaskSelect = useCallback((task: ITask) => {
    setSelectedTask(task);
  }, []);

  // Add this new function for handling approve/deny actions - MOVED HERE to maintain hook order
  const approveOrDeny = useCallback(async (action: 'approve' | 'deny') => {
    if (!selectedTask) {
      toaster.create({
        title: t("no_task_selected"),
        description: action === 'approve' ? t("approve") : t("deny"),
        type: "warning"
      });
      return;
    }

    toaster.create({
      title: action === 'approve' ? t("approve") : t("deny"),
      description: `${t("task_id")}: ${selectedTask.task_id}`,
      type: "info"
    });

    try {
      if (action === 'approve') {
        // Only make API call for approve action
        const url = `http://${window.location.hostname}:34430/api/agent/approve`;
        const response = await axios.post(url, selectedTask);
        toaster.create({
          title: t("approved"),
          description: `${t("task_id")}: ${selectedTask.task_id}`,
          type: "success"
        });
      } else {
        // For deny action, just log it without making an API call
        toaster.create({
          title: t("denied"),
          description: `${t("task_id")}: ${selectedTask.task_id}`,
          type: "info"
        });
      }

      // After action is processed, refresh the tasks list
      fetchTasks();
    } catch (error) {
      toaster.create({
        title: t("error"),
        description: `${action === 'approve' ? t("approve") : t("deny")} ${t("failed")}`,
        type: "error"
      });

      if (axios.isAxiosError(error)) {
        toaster.create({
          title: t("error"),
          description: `${t("status")}: ${error.response?.status}`,
          type: "error"
        });
      }
    }
  }, [selectedTask, fetchTasks, t]);

  // Load tasks on initial render and when dependencies change
  useEffect(() => {
    fetchTasks();
  }, [fetchTasks]);

  // Use useEffect for navigation instead of doing it during render
  useEffect(() => {
    if (currentUser && !isOwner) {
      router.push('/redirect/no_access?reason=Not available for UAT');
    }
  }, [currentUser, isOwner, router]);

  // Dark mode adaptive colors - enhanced for better contrast
  const bgSubtle = useColorModeValue("bg.subtle", "gray.800");
  const textColor = useColorModeValue("gray.600", "gray.400");
  const textColorStrong = useColorModeValue("gray.700", "gray.300");
  const textColorHeading = useColorModeValue("gray.800", "gray.100");
  const borderColor = useColorModeValue("gray.200", "gray.700");
  const hoverBg = useColorModeValue("bg.subtle", "gray.700");
  const tableBg = useColorModeValue("white", "gray.900");
  const tableHeaderBg = useColorModeValue("bg.subtle", "gray.800");
  const errorBg = useColorModeValue("red.50", "red.900");
  const errorText = useColorModeValue("red.500", "red.300");
  const emptyBg = useColorModeValue("bg.subtle", "gray.800");
  const paginationBg = useColorModeValue("gray.200", "gray.700");
  const paginationDisabledBg = useColorModeValue("gray.100", "gray.800");
  const paginationColor = useColorModeValue("gray.700", "gray.300");
  const paginationDisabledColor = useColorModeValue("gray.400", "gray.600");
  const approveButtonBg = useColorModeValue("green.50", "green.900");
  const approveButtonColor = useColorModeValue("green.600", "green.300");
  const approveButtonHoverBg = useColorModeValue("green.100", "green.800");
  const approveButtonActiveBg = useColorModeValue("green.200", "green.700");
  const denyButtonBg = useColorModeValue("red.50", "red.900");
  const denyButtonColor = useColorModeValue("red.600", "red.300");
  const denyButtonHoverBg = useColorModeValue("red.100", "red.800");
  const denyButtonActiveBg = useColorModeValue("red.200", "red.700");
  const refreshButtonBg = useColorModeValue("bg.subtle", "gray.700");
  const refreshButtonColor = useColorModeValue("gray.600", "gray.400");
  const refreshButtonHoverBg = useColorModeValue("gray.100", "gray.600");
  const refreshButtonActiveBg = useColorModeValue("gray.200", "gray.500");
  // New colors for logger and tabs
  const loggerBg = useColorModeValue("white", "gray.900");
  const loggerCodeBg = useColorModeValue("gray.50", "gray.800");
  const tabActiveBg = useColorModeValue("white", "gray.900");
  const tabHoverBg = useColorModeValue("gray.50", "gray.700");
  const tabIndicatorColor = useColorModeValue("blue.500", "blue.400");
  const monospaceTextColor = useColorModeValue("gray.800", "gray.200");

  const statusOptions = createListCollection({
    items: [
      { label: t("all"), value: "all" },
      { label: t("pending"), value: "pending" },
      { label: t("approved"), value: "approved" },
      { label: t("denied"), value: "denied" },
      { label: t("running"), value: "running" },
      { label: t("successful"), value: "successful" },
      { label: t("failed"), value: "failed" },
    ],
  });

  const perPageOptions = createListCollection({
    items: [
      { label: t("10_per_page"), value: "10" },
      { label: t("25_per_page"), value: "25" },
      { label: t("50_per_page"), value: "50" },
      { label: t("100_per_page"), value: "100" },
    ],
  });

  // Format task ID to show first chunk
  const formatTaskId = (taskId: string) => {
    if (!taskId) return "-";
    const parts = taskId.split("-");
    return parts.length > 0 ? parts[0] : taskId;
  };

  // Format user ID to show first chunk
  const formatUserId = (userId: string) => {
    if (!userId) return "-";
    const parts = userId.split("-");
    return parts.length > 0 ? parts[0] : userId;
  };

  const truncateText = (text: string, maxLength: number) => {
    if (!text) return "";
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + "...";
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return "N/A";
    return new Date(dateString).toLocaleString();
  };

  const getStatusBadge = (status: string) => {
    return <TaskStatusBadge status={status} size="sm" />;
  };

  // Resize handlers - optimized for performance
  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      isDragging.current = true;
      startY.current = e.clientY;
      startHeight.current = topHeight;
      document.body.style.userSelect = "none";
      document.body.style.cursor = "ns-resize";

      // Apply direct DOM manipulation during drag for better performance
      const topElement = containerRef.current?.firstElementChild as HTMLElement;
      const bottomElement = containerRef.current?.lastElementChild as HTMLElement;
      if (topElement && bottomElement) {
        topElement.style.transition = "none";
        bottomElement.style.transition = "none";
      }
    },
    [topHeight]
  );

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!isDragging.current || !containerRef.current) return;

    // Use direct DOM manipulation instead of state updates during drag
    const containerHeight = containerRef.current.offsetHeight;
    const deltaY = e.clientY - startY.current;
    const deltaPercent = (deltaY / containerHeight) * 100;
    const newTopHeight = startHeight.current + deltaPercent;

    // Constrain the resize (min 20% for bottom, min 30% for top)
    if (newTopHeight >= 30 && 100 - newTopHeight >= 20) {
      // Apply styles directly to DOM elements for smoother dragging
      const topElement = containerRef.current.firstElementChild as HTMLElement;
      const bottomElement = containerRef.current.lastElementChild as HTMLElement;

      if (topElement && bottomElement) {
        // Skip the divider element which is the second child
        const dividerElement = containerRef.current.children[1] as HTMLElement;

        topElement.style.height = `${newTopHeight}%`;
        bottomElement.style.height = `${100 - newTopHeight}%`;
      }
    }
  }, []);

  const handleMouseUp = useCallback(() => {
    if (!isDragging.current || !containerRef.current) return;

    isDragging.current = false;
    document.body.style.userSelect = "";
    document.body.style.cursor = "";

    // Get the current height from the DOM element and update state once at the end
    const topElement = containerRef.current.firstElementChild as HTMLElement;
    if (topElement) {
      // Extract percentage value from style
      const heightStyle = topElement.style.height;
      const percentValue = parseFloat(heightStyle);

      if (!isNaN(percentValue)) {
        // Restore transitions
        const bottomElement = containerRef.current.lastElementChild as HTMLElement;
        if (topElement && bottomElement) {
          topElement.style.transition = "";
          bottomElement.style.transition = "";
        }

        // Update state only once at the end of drag
        setTopHeight(percentValue);
      }
    }
  }, []);

  useEffect(() => {
    const handleGlobalMouseMove = (e: MouseEvent) => handleMouseMove(e);
    const handleGlobalMouseUp = () => handleMouseUp();

    document.addEventListener("mousemove", handleGlobalMouseMove, { passive: true });
    document.addEventListener("mouseup", handleGlobalMouseUp);

    return () => {
      document.removeEventListener("mousemove", handleGlobalMouseMove);
      document.removeEventListener("mouseup", handleGlobalMouseUp);
    };
  }, [handleMouseMove, handleMouseUp]);

  if (!isOwner) {
    return <Loading />;
  }

  if (!isAuthenticated) {
    return <Loading />;
  }

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
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5 }}
        display="flex"
        flexDirection="column"
        overflow="hidden"
        position="relative"
      >
        <Heading size="lg" mb={6} display="flex" alignItems="center" color={textColorHeading}>
          <Icon as={FaTasks} mr={3} color="blue.500" />
          {t("tasks")}
        </Heading>

        <Flex
          ref={containerRef}
          width="100%"
          height="calc(100% - 60px)"
          position="relative"
          overflow="hidden"
          flexDirection="column"
        >
          {/* Top component - Task History */}
          <MotionBox
            width="100%"
            height={`${topHeight}%`}
            overflow="auto"
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
          >
            <Flex
              justifyContent="space-between"
              alignItems="center"
              mb={4}
              flexDirection={{ base: "column", md: "row" }}
              gap={2}
            >
              <Text fontSize="xl" fontWeight="bold" textAlign="left" color={textColorHeading}>
                {t("task_history")}
              </Text>
              <Flex gap={2} alignItems="center" flexWrap="wrap">
                <Text fontSize="sm" color={textColor}>{t("status")}:</Text>
                <Select.Root
                  color={textColor}
                  size="sm"
                  width="150px"
                  collection={statusOptions}
                  defaultValue={["all"]}
                  onValueChange={(valueObj) => {
                    console.log("Select onValueChange - values:", valueObj);
                    handleStatusFilterChange(valueObj);
                  }}
                >
                  <Select.HiddenSelect />
                  <Select.Control>
                    <Select.Trigger>
                      <Select.ValueText placeholder="Filter by status" />
                    </Select.Trigger>
                    <Select.IndicatorGroup>
                      <Select.Indicator />
                    </Select.IndicatorGroup>
                  </Select.Control>
                  <Portal>
                    <Select.Positioner>
                      <Select.Content>
                        {statusOptions.items.map((option) => (
                          <Select.Item color={textColor} item={option} key={option.value}>
                            {option.label}
                            <Select.ItemIndicator />
                          </Select.Item>
                        ))}
                      </Select.Content>
                    </Select.Positioner>
                  </Portal>
                </Select.Root>

                <Box
                  as="button"
                  py={2}
                  px={3}
                  borderRadius="md"
                  bg={refreshButtonBg}
                  color={refreshButtonColor}
                  fontWeight="medium"
                  fontSize="sm"
                  _hover={{ bg: refreshButtonHoverBg }}
                  _active={{ bg: refreshButtonActiveBg }}
                  onClick={fetchTasks}
                  ml={2}
                >
                  <Flex align="center" justify="center">
                    <Icon as={FaSync} mr={2} />
                    {t("refresh")}
                  </Flex>
                </Box>
              </Flex>
            </Flex>

            {loading ? (
              <Flex justify="center" align="center" height="200px">
                <Spinner size="lg" color="blue.500" />
              </Flex>
            ) : error ? (
              <Box p={5} textAlign="center" bg={errorBg} borderRadius="md">
                <Text color={errorText}>{error}</Text>
              </Box>
            ) : tasks.length === 0 ? (
              <Box p={5} textAlign="center" bg={emptyBg} borderRadius="md" borderWidth="1px" borderColor={borderColor}>
                <Text color={textColor}>{t("no_tasks_found")}</Text>
              </Box>
            ) : (
              <>
                <Box overflowX="auto" width="100%">
                  <Table.Root variant="outline" size="md" colorScheme="gray">
                    <Table.Header
                      bg={tableHeaderBg}
                      position="sticky"
                      top={0}
                      zIndex={1}
                    >
                      <Table.Row>
                        <Table.ColumnHeader
                          fontWeight="semibold"
                          width="10%"
                          color={textColorHeading}
                        >
                          {t("task_id")}
                        </Table.ColumnHeader>
                        <Table.ColumnHeader
                          fontWeight="semibold"
                          width="15%"
                          color={textColorHeading}
                        >
                          {t("created_at")}
                        </Table.ColumnHeader>
                        <Table.ColumnHeader
                          fontWeight="semibold"
                          width="10%"
                          color={textColorHeading}
                        >
                          {t("assigner")}
                        </Table.ColumnHeader>
                        <Table.ColumnHeader
                          fontWeight="semibold"
                          width="10%"
                          color={textColorHeading}
                        >
                          {t("assignee")}
                        </Table.ColumnHeader>
                        <Table.ColumnHeader
                          fontWeight="semibold"
                          width="45%"
                          color={textColorHeading}
                        >
                          {t("summarization")}
                        </Table.ColumnHeader>
                        <Table.ColumnHeader
                          fontWeight="semibold"
                          width="10%"
                          textAlign="center"
                          color={textColorHeading}
                        >
                          {t("status")}
                        </Table.ColumnHeader>
                      </Table.Row>
                    </Table.Header>
                    <Table.Body>
                      {tasks.map((task) => (
                        <Table.Row
                          key={task.id}
                          cursor="pointer"
                          _hover={{ bg: hoverBg }}
                          onClick={() => handleTaskSelect(task)}
                          bg={selectedTask?.id === task.id ? hoverBg : undefined}
                        >
                          <Table.Cell
                            fontWeight="medium"
                            fontSize={{ base: "xs", md: "sm" }}
                            color={textColorStrong}
                          >
                            {formatTaskId(task.task_id)}
                          </Table.Cell>
                          <Table.Cell fontSize={{ base: "xs", md: "sm" }} color={textColorStrong}>
                            {formatDate(task.created_at)}
                          </Table.Cell>
                          <Table.Cell fontSize={{ base: "xs", md: "sm" }} color={textColorStrong}>
                            {formatUserId(task.assigner)}
                          </Table.Cell>
                          <Table.Cell fontSize={{ base: "xs", md: "sm" }} color={textColorStrong}>
                            {formatUserId(task.assignee)}
                          </Table.Cell>
                          <Table.Cell>
                            <Box
                              title={task.task_summarization || ""}
                              fontSize={{ base: "xs", md: "sm" }}
                              color={textColorStrong}
                            >
                              {truncateText(task.task_summarization || "", 100)}
                            </Box>
                          </Table.Cell>
                          <Table.Cell textAlign="center" padding={2}>
                            {getStatusBadge(task.status)}
                          </Table.Cell>
                        </Table.Row>
                      ))}
                    </Table.Body>
                  </Table.Root>
                </Box>

                <Flex
                  justifyContent="space-between"
                  alignItems="center"
                  mt={4}
                  flexDirection={{ base: "column", md: "row" }}
                  gap={3}
                >
                  <Flex alignItems="center" gap={2}>
                    <Text fontSize="sm" color={textColor}>{t("rows_per_page")}:</Text>
                    <Select.Root
                      size="sm"
                      width="120px"
                      collection={perPageOptions}
                      value={[itemsPerPage.toString()]}
                      // TODO: 
                      // @ts-ignore
                      onValueChange={(value) => handleItemsPerPageChange(value[0])}
                    >
                      <Select.HiddenSelect />
                      <Select.Control>
                        <Select.Trigger>
                          <Select.ValueText />
                        </Select.Trigger>
                        <Select.IndicatorGroup>
                          <Select.Indicator />
                        </Select.IndicatorGroup>
                      </Select.Control>
                      <Portal>
                        <Select.Positioner>
                          <Select.Content>
                            {perPageOptions.items.map((option) => (
                              <Select.Item item={option} key={option.value}>
                                {option.label}
                                <Select.ItemIndicator />
                              </Select.Item>
                            ))}
                          </Select.Content>
                        </Select.Positioner>
                      </Portal>
                    </Select.Root>
                  </Flex>

                  <Flex gap={1} alignItems="center">
                    <Box
                      as="button"
                      px={2}
                      py={1}
                      borderRadius="md"
                      bg={currentPage === 1 ? paginationDisabledBg : paginationBg}
                      color={currentPage === 1 ? paginationDisabledColor : paginationColor}
                      _hover={{
                        bg: currentPage === 1 ? paginationDisabledBg : refreshButtonHoverBg,
                      }}
                      aria-disabled={currentPage === 1}
                      pointerEvents={currentPage === 1 ? "none" : "auto"}
                      onClick={() => handlePageChange(1)}
                    >
                      «
                    </Box>
                    <Box
                      as="button"
                      px={2}
                      py={1}
                      borderRadius="md"
                      bg={currentPage === 1 ? paginationDisabledBg : paginationBg}
                      color={currentPage === 1 ? paginationDisabledColor : paginationColor}
                      _hover={{
                        bg: currentPage === 1 ? paginationDisabledBg : refreshButtonHoverBg,
                      }}
                      aria-disabled={currentPage === 1}
                      pointerEvents={currentPage === 1 ? "none" : "auto"}
                      onClick={() => handlePageChange(currentPage - 1)}
                    >
                      ‹
                    </Box>

                    <Text mx={2} fontSize="sm" color={textColor}>
                      {t("page")} {currentPage} {t("of")} {totalPages || 1}
                    </Text>

                    <Box
                      as="button"
                      px={2}
                      py={1}
                      borderRadius="md"
                      bg={
                        currentPage === totalPages || totalPages === 0
                          ? paginationDisabledBg
                          : paginationBg
                      }
                      color={
                        currentPage === totalPages || totalPages === 0
                          ? paginationDisabledColor
                          : paginationColor
                      }
                      _hover={{
                        bg:
                          currentPage === totalPages || totalPages === 0
                            ? paginationDisabledBg
                            : refreshButtonHoverBg,
                      }}
                      _disabled={{ opacity: 0.5, cursor: "not-allowed" }}
                      aria-disabled={
                        currentPage === totalPages || totalPages === 0
                      }
                      pointerEvents={
                        currentPage === totalPages || totalPages === 0
                          ? "none"
                          : "auto"
                      }
                      onClick={() => handlePageChange(currentPage + 1)}
                    >
                      ›
                    </Box>
                    <Box
                      as="button"
                      px={2}
                      py={1}
                      borderRadius="md"
                      bg={
                        currentPage === totalPages || totalPages === 0
                          ? paginationDisabledBg
                          : paginationBg
                      }
                      color={
                        currentPage === totalPages || totalPages === 0
                          ? paginationDisabledColor
                          : paginationColor
                      }
                      _hover={{
                        bg:
                          currentPage === totalPages || totalPages === 0
                            ? paginationDisabledBg
                            : refreshButtonHoverBg,
                      }}
                      _disabled={{ opacity: 0.5, cursor: "not-allowed" }}
                      aria-disabled={
                        currentPage === totalPages || totalPages === 0
                      }
                      pointerEvents={
                        currentPage === totalPages || totalPages === 0
                          ? "none"
                          : "auto"
                      }
                      onClick={() => handlePageChange(totalPages)}
                    >
                      »
                    </Box>
                  </Flex>

                  <Text fontSize="sm" color={textColor}>
                    {t("showing")}{" "}
                    {tasks.length > 0
                      ? (currentPage - 1) * itemsPerPage + 1
                      : 0}{" "}
                    - {Math.min(currentPage * itemsPerPage, totalTasks)}{" "}
                    {t("of")} {totalTasks} {t("tasks")}
                  </Text>
                </Flex>
              </>
            )}
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

          {/* Bottom component - Task Logger - improved for dark mode */}
          <MotionBox
            width="100%"
            height={`${100 - topHeight}%`}
            overflow="hidden"
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
            bg={loggerBg}
            borderRadius="md"
            boxShadow="sm"
            p={4}
            borderWidth="1px"
            borderColor={borderColor}
          >
            <Flex
              width="100%"
              height="100%"
              direction={{ base: "column", md: "row" }}
              gap={{ base: 4, md: 2 }}
            >
              <Box
                flex="1"
                mr={{ base: 0, md: 3 }}
                mb={{ base: 4, md: 0 }}
                height={{ base: "auto", md: "100%" }}
                display="flex"
                flexDirection="column"
                overflow="hidden"
                minWidth="0"
              >
                <Tabs.Root
                  defaultValue="details"
                  variant="line"
                  height="100%"
                  // @ts-ignore
                  sx={{
                    '[data-part="trigger"]': {
                      color: textColorStrong,
                      fontWeight: "medium",
                      px: 3,
                      py: 2,
                      _hover: { bg: tabHoverBg },
                      _selected: { color: tabIndicatorColor, bg: tabActiveBg }
                    },
                    '[data-part="indicator"]': {
                      bg: tabIndicatorColor,
                      height: "2px"
                    }
                  }}
                >
                  <Tabs.List
                    mb={4}
                    // @ts-ignore
                    sx={{
                      overflowX: "hidden",
                      scrollbarWidth: "none",  // Firefox
                      "&::-webkit-scrollbar": {
                        display: "none"  // Chrome, Safari, Edge
                      },
                      msOverflowStyle: "none"  // IE and Edge
                    }}
                    whiteSpace="nowrap"
                    borderBottomWidth="1px"
                    borderBottomColor={borderColor}
                    width="100%"
                    px={1}
                  >
                    <Tabs.Trigger value="details">{t("details")}</Tabs.Trigger>
                    <Tabs.Trigger value="arguments">{t("arguments")}</Tabs.Trigger>
                    <Tabs.Trigger value="logs">{t("logs")}</Tabs.Trigger>
                    <Tabs.Indicator />
                  </Tabs.List>

                  <Box flex="1" position="relative" overflow="hidden" height="calc(100% - 48px)">
                    <Tabs.Content value="details" height="100%" overflow="auto">
                      <MotionBox
                        height="100%"
                        p={2}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{
                          duration: 0.4,
                          ease: "easeOut",
                          delay: 0.1,
                        }}
                      >
                        <TaskMetadata selectedTask={selectedTask} />
                      </MotionBox>
                    </Tabs.Content>

                    <Tabs.Content value="arguments" height="100%" overflow="auto">
                      <MotionBox
                        height="100%"
                        p={2}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{
                          duration: 0.4,
                          ease: "easeOut",
                          delay: 0.1,
                        }}
                      >
                        {selectedTask && selectedTask.tools_called && selectedTask.tools_called.length > 0 ? (
                          <MCPToolCalls
                            selectedTask={selectedTask}
                            setSelectedTask={setSelectedTask}
                            fetchTasks={fetchTasks}
                          />
                        ) : (
                          <Text color={textColor}>{t("no_mcp_tool_calls")}</Text>
                        )}
                      </MotionBox>
                    </Tabs.Content>

                    <Tabs.Content value="logs" height="100%" overflow="auto">
                      <MotionBox
                        height="100%"
                        p={2}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{
                          duration: 0.4,
                          ease: "easeOut",
                          delay: 0.1,
                        }}
                      >
                        <Text
                          fontSize={{ base: "sm", md: "md" }}
                          color={monospaceTextColor}
                          whiteSpace="pre-wrap"
                          fontFamily="mono"
                          p={3}
                          bg={loggerCodeBg}
                          borderRadius="md"
                          overflowX="auto"
                          height="100%"
                          overflowY="auto"
                        >
                          {selectedTask && selectedTask.result ? selectedTask.result : t("no_logs_available")}
                        </Text>
                      </MotionBox>
                    </Tabs.Content>
                  </Box>
                </Tabs.Root>
              </Box>

              {/* Only show sidebar on larger screens or stack it on mobile */}
              <Box
                width={{ base: "100%", md: "200px" }}
                minWidth={{ md: "200px" }}
                height={{ base: "auto", md: "100%" }}
                overflow="auto"
              >
                <TaskSidebar
                  selectedTask={selectedTask}
                  approveOrDeny={approveOrDeny}
                  fetchTasks={fetchTasks}
                />
              </Box>
            </Flex>
          </MotionBox>
        </Flex>
      </MotionBox >
    </Container >
  );
}
