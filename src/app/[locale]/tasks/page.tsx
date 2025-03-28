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
} from "@chakra-ui/react";
import { Table, Select, createListCollection } from "@chakra-ui/react";
import { motion } from "framer-motion";
import { FaTasks, FaSync } from "react-icons/fa";
import { useTranslations } from "next-intl";
import TaskStatusBadge from "@/components/task_badge";
import { useCallback, useRef, useState, useEffect } from "react";
import { ITask } from "@/types/task";
import Loading from "@/components/loading";
import { useSession } from "next-auth/react";
import { useColorModeValue } from "@/components/ui/color-mode";

const MotionBox = motion(Box);

export default function TasksPage() {
  const t = useTranslations("Tasks");

  // Mock data for UI demonstration
  const tasks: ITask[] = [];
  const loading = false;
  const error = null;
  const totalTasks = 0;
  const currentPage = 1;
  const itemsPerPage = 10;
  const totalPages = Math.ceil(totalTasks / itemsPerPage);

  // Resizable layout state - set initial top height to 75% (logger at 25%)
  const [topHeight, setTopHeight] = useState(75);
  const containerRef = useRef<HTMLDivElement>(null);
  const isDragging = useRef(false);
  const startY = useRef(0);
  const startHeight = useRef(0);

  // Dark mode adaptive colors
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

  // Resize handlers
  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
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

  const { data: session } = useSession();
  if (!session) {
    return <Loading />;
  }

  // Task metadata component (simplified from TaskMetadata)
  const TaskMetadata = () => (
    <Flex direction="column" gap={4}>
      <Box width="100%">
        <Text fontSize={{ base: "sm", md: "md" }} color={textColor} mb={1}>
          {t("summarization")}
        </Text>
        <Text
          fontSize={{ base: "sm", md: "md" }}
          fontWeight="medium"
          whiteSpace="pre-wrap"
          color={textColorStrong}
        >
          {t("no_task_selected")}
        </Text>
      </Box>

      <Flex direction="row" wrap="wrap" gap={4}>
        <Box>
          <Text fontSize="xs" color={textColor}>
            {t("created")}
          </Text>
          <Text fontSize="sm" color={textColorStrong}>N/A</Text>
        </Box>
        <Box>
          <Text fontSize="xs" color={textColor}>
            {t("started")}
          </Text>
          <Text fontSize="sm" color={textColorStrong}>N/A</Text>
        </Box>
        <Box>
          <Text fontSize="xs" color={textColor}>
            {t("completed")}
          </Text>
          <Text fontSize="sm" color={textColorStrong}>N/A</Text>
        </Box>
      </Flex>
    </Flex>
  );

  // Task sidebar component (simplified from TaskSidebar)
  const TaskSidebar = () => (
    <Box
      width="180px"
      bg={bgSubtle}
      p={4}
      borderRadius="md"
      height="fit-content"
      borderWidth="1px"
      borderColor={borderColor}
    >
      <Flex direction="column" gap={3}>
        <Flex justify="space-between" align="center">
          <Text fontSize="xs" fontWeight="medium" color={textColor}>
            {t("status")}
          </Text>
          <Flex align="center">
            <Text fontSize="xs" color={textColor}>
              {t("no_task_selected")}
            </Text>
          </Flex>
        </Flex>

        <Box mb={2}>
          <Text fontSize="xs" color={textColor}>
            {t("task_id")}
          </Text>
          <Text fontSize="sm" fontWeight="medium" color={textColorStrong}>
            -
          </Text>
        </Box>

        <Flex direction="column" gap={2} mt={2}>
          <Box
            as="button"
            py={2}
            px={3}
            borderRadius="md"
            bg={approveButtonBg}
            color={approveButtonColor}
            fontWeight="medium"
            fontSize="sm"
            _hover={{ bg: approveButtonHoverBg }}
            _active={{ bg: approveButtonActiveBg }}
            _disabled={{ opacity: 0.5, cursor: "not-allowed" }}
          >
            {t("approve")}
          </Box>

          <Box
            as="button"
            py={2}
            px={3}
            borderRadius="md"
            bg={denyButtonBg}
            color={denyButtonColor}
            fontWeight="medium"
            fontSize="sm"
            _hover={{ bg: denyButtonHoverBg }}
            _active={{ bg: denyButtonActiveBg }}
            _disabled={{ opacity: 0.5, cursor: "not-allowed" }}
          >
            {t("deny")}
          </Box>

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
            _disabled={{ opacity: 0.5, cursor: "not-allowed" }}
          >
            <Flex align="center" justify="center">
              <Icon as={FaSync} mr={2} />
              {t("refresh")}
            </Flex>
          </Box>
        </Flex>
      </Flex>
    </Box>
  );

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
                  size="sm"
                  width="150px"
                  color={textColor}
                  collection={statusOptions}
                  defaultValue={["all"]}
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
              </Flex>
            </Flex>

            {loading ? (
              <Flex justify="center" align="center" height="200px">
                <Spinner size="lg" color="blue.500" />
              </Flex>
            ) : error ? (
              <Box p={5} textAlign="center" bg={errorBg} borderRadius="md">
                <Text color={errorText}>{t("error")}</Text>
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
                          width={{ base: "20%", md: "10%" }}
                          color={textColorHeading}
                        >
                          {t("id")}
                        </Table.ColumnHeader>
                        <Table.ColumnHeader
                          fontWeight="semibold"
                          width={{ base: "25%", md: "15%" }}
                          color={textColorHeading}
                        >
                          {t("role")}
                        </Table.ColumnHeader>
                        <Table.ColumnHeader
                          fontWeight="semibold"
                          width={{ base: "55%", md: "45%" }}
                          color={textColorHeading}
                        >
                          {t("summarization")}
                        </Table.ColumnHeader>
                        <Table.ColumnHeader
                          fontWeight="semibold"
                          width="20%"
                          display={{ base: "none", md: "table-cell" }}
                          color={textColorHeading}
                        >
                          {t("created_at")}
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
                        >
                          <Table.Cell
                            fontWeight="medium"
                            fontSize={{ base: "xs", md: "sm" }}
                            color={textColorStrong}
                          >
                            {task.id}
                          </Table.Cell>
                          <Table.Cell fontSize={{ base: "xs", md: "sm" }} color={textColorStrong}>
                            {task.task_id}
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
                          <Table.Cell
                            fontSize={{ base: "xs", md: "sm" }}
                            display={{ base: "none", md: "table-cell" }}
                            color={textColorStrong}
                          >
                            {formatDate(task.created_at)}
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
                      defaultValue={[itemsPerPage.toString()]}
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

          {/* Bottom component - Task Logger */}
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
                    <Tabs.Trigger value="description">
                      {t("description")}
                    </Tabs.Trigger>
                    <Tabs.Trigger value="arguments">
                      {t("arguments")}
                    </Tabs.Trigger>
                    <Tabs.Trigger value="logs">{t("logs")}</Tabs.Trigger>
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
                        <TaskMetadata />
                      </MotionBox>
                    </Tabs.Content>

                    <Tabs.Content value="description">
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
                        <Text
                          fontSize={{ base: "sm", md: "md" }}
                          whiteSpace="pre-wrap"
                          color={textColorStrong}
                        >
                          {t("no_task_selected")}
                        </Text>
                      </MotionBox>
                    </Tabs.Content>

                    <Tabs.Content value="arguments">
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
                        <Text color={textColor}>{t("no_task_selected")}</Text>
                      </MotionBox>
                    </Tabs.Content>

                    <Tabs.Content value="logs">
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
                        <Text
                          fontSize={{ base: "sm", md: "md" }}
                          color={textColor}
                        >
                          {t("no_task_selected")}
                        </Text>
                      </MotionBox>
                    </Tabs.Content>
                  </Box>
                </Tabs.Root>
              </Box>

              <TaskSidebar />
            </Flex>
          </MotionBox>
        </Flex>
      </MotionBox>
    </Container>
  );
}
