"use client";

import React, { useState } from "react";
import {
  Box,
  Heading,
  Text,
  VStack,
  HStack,
  Flex,
  Button,
  Icon,
  Separator,
  Badge,
  Input,
  Container,
  Select,
  Portal,
  createListCollection,
} from "@chakra-ui/react";
import { useTranslations } from "next-intl";
import { useSession } from "next-auth/react";
import { FaCog, FaGlobe, FaTrash, FaUserCircle, FaDatabase } from "react-icons/fa";
import { FiInfo, FiLock } from "react-icons/fi";
import { motion } from "framer-motion";
import Loading from "@/components/loading";
import {
  ColorModeButton, useColorModeValue
} from "@/components/ui/color-mode"
import { toaster } from "@/components/ui/toaster"
import { useSelector } from 'react-redux';
import { RootState } from "@/store/store";
import { useRouter, usePathname, useParams } from "next/navigation";

// Create motion components
const MotionBox = motion.create(Box);
const MotionFlex = motion.create(Flex);
const MotionVStack = motion.create(VStack);

export default function SettingsPage() {
  const t = useTranslations("Settings");
  const { data: session } = useSession();
  const { isOwner } = useSelector((state: RootState) => state.user);
  const router = useRouter();
  const pathname = usePathname();
  const params = useParams();

  const [isDeleting, setIsDeleting] = useState(false);
  const [isDeletingAllRooms, setIsDeletingAllRooms] = useState(false);
  const [isDeletingAllUsers, setIsDeletingAllUsers] = useState(false);
  const [isDeletingAllTasks, setIsDeletingAllTasks] = useState(false);
  const [activeTab, setActiveTab] = useState(0);

  const accentColor = "blue.500";
  // Define custom colors using useColorModeValue for dark mode support
  const bgColor = useColorModeValue("bg.subtle", "gray.800");
  const borderColor = useColorModeValue("gray.200", "gray.700");
  const hoverBg = useColorModeValue("gray.50", "gray.700");
  const textColor = useColorModeValue("gray.800", "gray.100");
  const cardBg = useColorModeValue("white", "gray.800");
  const dangerZoneBg = useColorModeValue("red.50", "red.900");
  const dangerZoneBorder = useColorModeValue("red.200", "red.700");
  const dangerZoneText = useColorModeValue("red.700", "red.200");
  const dangerZoneHeading = useColorModeValue("red.600", "red.300");
  const textColorHeading = useColorModeValue("gray.800", "gray.100");

  // Get current locale from params
  const currentLocale = params.locale as string;

  // Language options collection
  const languageOptions = createListCollection({
    items: [
      { label: "English", value: "en" },
      { label: "中文(繁體)", value: "zh-HK" },
      { label: "한국어 (Korean)", value: "ko" },
      { label: "日本語 (Japanese)", value: "ja" },
    ],
  });

  // Handle language change
  const handleLanguageChange = (valueObj: any) => {
    // Extract the value from the object structure
    const value = valueObj?.value?.[0] || currentLocale;

    // Get current path without locale prefix
    const pathParts = pathname.split('/');
    pathParts.splice(1, 1); // Remove the locale part
    const pathWithoutLocale = pathParts.join('/');

    // Redirect to the same page with new locale
    router.push(`/${value}${pathWithoutLocale}`);
  };

  if (!session) {
    return <Loading />;
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

  // TODO: after delete, clear current user redux state & signOut.
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
            <Icon as={FaCog} mr={3} color={accentColor} />
            {t("settings")}
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
            {[
              { icon: FaUserCircle, label: t("general"), id: 0 },
              // { icon: FaDatabase, label: t("system"), id: 1 },
              {
                icon: FaTrash,
                label: t("danger_zone"),
                id: 2,
                color: "red.500",
                disabled: !isOwner
              },
            ].map((item) => (
              <motion.div key={item.id} variants={tabVariants}>
                <Box
                  as="button"
                  py={3}
                  px={4}
                  borderRadius="md"
                  bg={activeTab === item.id ? hoverBg : "transparent"}
                  color={item.color || textColor}
                  fontWeight="medium"
                  fontSize="sm"
                  width="100%"
                  textAlign="left"
                  _hover={{ bg: item.disabled ? "transparent" : hoverBg }}
                  _active={{ bg: activeTab === item.id ? hoverBg : "gray.100" }}
                  onClick={() => !item.disabled && setActiveTab(item.id)}
                  opacity={item.disabled ? 0.5 : 1}
                  cursor={item.disabled ? "not-allowed" : "pointer"}
                  pointerEvents={item.disabled ? "none" : "auto"}
                >
                  <Flex align="center">
                    <Icon
                      as={item.icon}
                      color={item.color || textColor}
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
            bg={cardBg}
            borderRadius="md"
            borderWidth="1px"
            borderColor={borderColor}
            p={6}
            boxShadow="sm"
            variants={itemVariants}
            overflow="auto"
          >
            {/* Add persistent save button at the top */}
            <Flex justifyContent="space-between" alignItems="center" mb={4}>
              <Heading size="md" color={textColor}>
                {activeTab === 0 && t("general")}
                {activeTab === 1 && t("system")}
                {activeTab === 2 && (
                  <Text color="red.500">{t("danger_zone")}</Text>
                )}
              </Heading>

              {/* {activeTab !== 2 && (
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
                >
                  {t("save_changes")}
                </Box>
              )} */}
            </Flex>
            <Separator mb={6} />

            <Box>
              {/* General Settings */}
              {activeTab === 0 && (
                <Box>
                  <VStack align="stretch" gap={4}>
                    <Box>
                      <Text fontWeight="medium" mb={1} color={textColor}>
                        {t("display_name")}
                        <Icon
                          as={FiLock}
                          ml={2}
                          fontSize="sm"
                          color="gray.500"
                        />
                      </Text>
                      <Input
                        color={textColor}
                        placeholder={t("your_display_name")}
                        maxW="400px"
                        defaultValue={session?.user?.name || ""}
                        disabled={true}
                        _disabled={{ opacity: 0.7, cursor: "not-allowed" }}
                      />
                      <Text fontSize="xs" color="gray.500" mt={1}>
                        {t("managed_by_provider")}
                      </Text>
                    </Box>

                    <Box>
                      <Text fontWeight="medium" mb={1} color={textColor}>
                        {t("email")}
                        <Icon
                          as={FiLock}
                          ml={2}
                          fontSize="sm"
                          color="gray.500"
                        />
                      </Text>
                      <Input
                        color={textColor}
                        placeholder={t("your_email")}
                        maxW="400px"
                        defaultValue={session?.user?.email || ""}
                        disabled={true}
                        _disabled={{ opacity: 0.7, cursor: "not-allowed" }}
                      />
                      <Text fontSize="xs" color="gray.500" mt={1}>
                        {t("managed_by_provider")}
                      </Text>
                    </Box>

                    {/* <Box>
                      <Text fontWeight="medium" mb={1} color={textColor}>
                        {t("bio")}
                      </Text>
                      <Input
                        color={textColor}
                        placeholder={t("tell_us_about_yourself")}
                        maxW="400px"
                      />
                    </Box> */}

                    <Box>
                      <Text fontWeight="medium" mb={1} color={textColor}>
                        {t("theme")}
                      </Text>
                      <ColorModeButton />
                    </Box>

                    <Box>
                      <Text fontWeight="medium" mb={1} color={textColor}>
                        {t("language")}
                      </Text>
                      <Select.Root
                        color={textColor}
                        size="sm"
                        width="200px"
                        collection={languageOptions}
                        defaultValue={[currentLocale]}
                        onValueChange={(valueObj) => {
                          handleLanguageChange(valueObj);
                        }}
                      >
                        <Select.HiddenSelect />
                        <Select.Control>
                          <Select.Trigger>
                            <Select.ValueText placeholder={t("select_language")} />
                          </Select.Trigger>
                          <Select.IndicatorGroup>
                            <Select.Indicator />
                          </Select.IndicatorGroup>
                        </Select.Control>
                        <Portal>
                          <Select.Positioner>
                            <Select.Content>
                              {languageOptions.items.map((option) => (
                                <Select.Item color={textColor} item={option} key={option.value}>
                                  {option.label}
                                  <Select.ItemIndicator />
                                </Select.Item>
                              ))}
                            </Select.Content>
                          </Select.Positioner>
                        </Portal>
                      </Select.Root>
                    </Box>
                  </VStack>
                </Box>
              )}

              {/* System Settings */}
              {/* {activeTab === 1 && (
                <Box>
                  <VStack align="stretch" gap={4}>
                    <Box p={4} borderWidth="1px" borderRadius="md" borderColor={borderColor}>
                      <Heading size="sm" mb={2}>{t("api_configuration")}</Heading>
                      <Text color={textColor} mb={3}>
                        {t("api_configuration_description")}
                      </Text>

                      <Box>
                        <Text fontWeight="medium" mb={1} color={textColor}>
                          {t("api_key")}
                        </Text>
                        <Input
                          color={textColor}
                          placeholder="sk-xxxxxxxxxxxxxxxxxxxxxxxx"
                          maxW="400px"
                          type="password"
                          bg={useColorModeValue("white", "gray.700")}
                          borderColor={borderColor}
                          _hover={{ borderColor: useColorModeValue("gray.300", "gray.600") }}
                          _focus={{ borderColor: "blue.500", boxShadow: "0 0 0 1px var(--chakra-colors-blue-500)" }}
                        />
                      </Box>
                    </Box>

                    <Box p={4} borderWidth="1px" borderRadius="md" borderColor={borderColor}>
                      <Heading size="sm" mb={2} color={textColorHeading}>{t("mcp_integration")}</Heading>
                      <Text color={textColor} mb={3}>
                        {t("mcp_integration_description")}
                      </Text>

                      <VStack align="stretch" gap={4}>
                        <Box>
                          <Text fontWeight="medium" mb={1} color={textColor}>
                            {t("mcp_endpoint")}
                          </Text>
                          <Input
                            color={textColor}
                            placeholder="https://api.example.com/mcp"
                            maxW="400px"
                            bg={useColorModeValue("white", "gray.700")}
                            borderColor={borderColor}
                            _hover={{ borderColor: useColorModeValue("gray.300", "gray.600") }}
                            _focus={{ borderColor: "blue.500", boxShadow: "0 0 0 1px var(--chakra-colors-blue-500)" }}
                          />
                        </Box>

                        <Box>
                          <Text fontWeight="medium" mb={1} color={textColor}>
                            {t("mcp_api_key")}
                          </Text>
                          <Input
                            color={textColor}
                            placeholder="mcp-xxxxxxxxxxxxxxxxxxxxxxxx"
                            maxW="400px"
                            type="password"
                            bg={useColorModeValue("white", "gray.700")}
                            borderColor={borderColor}
                            _hover={{ borderColor: useColorModeValue("gray.300", "gray.600") }}
                            _focus={{ borderColor: "blue.500", boxShadow: "0 0 0 1px var(--chakra-colors-blue-500)" }}
                          />
                        </Box>

                        <Box>
                          <Text fontWeight="medium" mb={1} color={textColor}>
                            {t("mcp_version")}
                          </Text>
                          <Input
                            color={textColor}
                            placeholder="v1"
                            maxW="400px"
                            bg={useColorModeValue("white", "gray.700")}
                            borderColor={borderColor}
                            _hover={{ borderColor: useColorModeValue("gray.300", "gray.600") }}
                            _focus={{ borderColor: "blue.500", boxShadow: "0 0 0 1px var(--chakra-colors-blue-500)" }}
                          />
                        </Box>

                        <Box
                          p={3}
                          borderRadius="md"
                          bg={useColorModeValue("blue.50", "blue.900")}
                          color={useColorModeValue("blue.600", "blue.200")}
                          fontSize="sm"
                        >
                          <Flex align="center">
                            <Icon as={FiInfo} mr={2} />
                            <Text>{t("mcp_info_message")}</Text>
                          </Flex>
                        </Box>

                        <Box
                          as="button"
                          py={2}
                          px={4}
                          borderRadius="md"
                          bg={useColorModeValue("blue.500", "blue.500")}
                          color="white"
                          fontWeight="medium"
                          fontSize="sm"
                          alignSelf="flex-start"
                          _hover={{ bg: useColorModeValue("blue.600", "blue.400") }}
                          _active={{ bg: useColorModeValue("blue.700", "blue.300") }}
                        >
                          {t("test_connection")}
                        </Box>
                      </VStack>
                    </Box>
                  </VStack>
                </Box>
              )} */}

              {/* Danger Zone */}
              {activeTab === 2 && (
                <Box>
                  {isOwner ? (
                    <>
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
                              // disabled={true}
                              onClick={handleDeleteAllUsers}
                              // @ts-ignore
                              // disabled={isDeletingAllUsers}
                              disabled={true}
                            >
                              {isDeletingAllUsers ? t("deleting") : t("delete_all_users")}
                            </Box>
                          </Box>
                        </HStack>
                      </Box>

                      {/* Add Delete All Tasks section */}
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
                              {t("delete_all_tasks")}
                            </Heading>
                            <Text color={dangerZoneText} fontSize="sm">
                              {t("delete_all_tasks_warning")}
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
                              onClick={handleDeleteAllTasks}
                              // @ts-ignore
                              disabled={isDeletingAllTasks}
                            >
                              {isDeletingAllTasks ? t("deleting") : t("delete_all_tasks")}
                            </Box>
                          </Box>
                        </HStack>
                      </Box>
                    </>
                  ) : (
                    <Box
                      p={4}
                      borderWidth="1px"
                      borderRadius="md"
                      borderColor={borderColor}
                      bg={cardBg}
                    >
                      <Flex align="center" justify="center" direction="column" py={6}>
                        <Icon as={FiInfo} color="gray.400" boxSize={8} mb={3} />
                        <Text color={textColor} fontWeight="medium">
                          {t("admin_only_access")}
                        </Text>
                        <Text color="gray.500" fontSize="sm" textAlign="center" mt={2}>
                          {t("admin_only_access_description")}
                        </Text>
                      </Flex>
                    </Box>
                  )}
                </Box>
              )}
            </Box>
          </MotionBox>
        </MotionFlex>
      </MotionBox>
    </Container>
  );
}
