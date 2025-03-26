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
} from "@chakra-ui/react";
import { useTranslations } from "next-intl";
import { useSession } from "next-auth/react";
import { FaCog, FaGlobe, FaTrash, FaUserCircle } from "react-icons/fa";
import { FiInfo, FiLock } from "react-icons/fi";
import { motion } from "framer-motion";
import Loading from "@/components/loading";

// Create motion components
const MotionBox = motion(Box);
const MotionFlex = motion(Flex);
const MotionVStack = motion(VStack);

export default function SettingsPage() {
  const t = useTranslations("Settings");
  const { data: session } = useSession();

  const [isDeleting, setIsDeleting] = useState(false);
  const [activeTab, setActiveTab] = useState(0);

  if (!session) {
    return <Loading />;
  }
  // Define custom colors
  const bgColor = "white";
  const borderColor = "gray.200";
  const hoverBg = "gray.50";
  const accentColor = "blue.500";
  const textColor = "gray.800";

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
          <Heading size="lg" mb={6} display="flex" alignItems="center">
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
              {
                icon: FaTrash,
                label: t("danger_zone"),
                id: 1,
                color: "red.500",
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
                  _hover={{ bg: hoverBg }}
                  _active={{ bg: activeTab === item.id ? hoverBg : "gray.100" }}
                  onClick={() => setActiveTab(item.id)}
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
            bg={bgColor}
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
                {activeTab === 1 && (
                  <Text color="red.500">{t("danger_zone")}</Text>
                )}
              </Heading>

              {activeTab !== 1 && (
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
              )}
            </Flex>
            <Separator mb={6} />

            <Box>
              {/* General Settings */}
              {activeTab === 0 && (
                <Box>
                  <VStack align="stretch">
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

                    <Box>
                      <Text fontWeight="medium" mb={1} color={textColor}>
                        {t("bio")}
                      </Text>
                      <Input
                        placeholder={t("tell_us_about_yourself")}
                        maxW="400px"
                      />
                    </Box>
                  </VStack>
                </Box>
              )}

              {/* Danger Zone */}
              {activeTab === 1 && (
                <Box>
                  <Box
                    p={4}
                    borderWidth="1px"
                    borderColor="red.200"
                    borderRadius="md"
                    bg="red.50"
                    mb={6}
                  >
                    <HStack align="flex-start">
                      <Icon as={FiInfo} color="red.500" boxSize={5} mt={0.5} />
                      <Box>
                        <Heading size="sm" color="red.600" mb={1}>
                          {t("delete_all_rooms")}
                        </Heading>
                        <Text color="red.700" fontSize="sm">
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
                          onClick={() => setIsDeleting(true)}
                          aria-disabled={isDeleting}
                        >
                          {isDeleting ? t("deleting") : t("delete_all_rooms")}
                        </Box>
                      </Box>
                    </HStack>
                  </Box>
                </Box>
              )}
            </Box>
          </MotionBox>
        </MotionFlex>
      </MotionBox>
    </Container>
  );
}
