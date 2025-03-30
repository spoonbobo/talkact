"use client";

import React, { useEffect, useState } from "react";
import { Box, Container, Flex, Heading, Icon, Text, Separator, Portal, Popover, CloseButton } from "@chakra-ui/react";
import { motion } from "framer-motion";
import { FiHome, FiServer, FiBook, FiMessageSquare, FiBell, FiTool } from "react-icons/fi";
import { useTranslations } from "next-intl";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Loading from "@/components/loading";
import { useColorModeValue } from "@/components/ui/color-mode";
import { useSelector } from "react-redux";
import { RootState } from "@/store/store";
// @ts-ignore
import { debounce } from 'lodash';
import { toaster } from "@/components/ui/toaster";
import { FeatureItem, NavigationCard, GuestHomePage } from "@/components/home";

const MotionBox = motion.create(Box);

// Update the interface for the notice data structure to match the YAML format
interface NoticeData {
  announcement?: Array<{
    value: string;
    date: string;
  }>;
  known_issues?: Array<{
    value: string;
    description: string;
  }>;
  features_implementing?: Array<{
    value: string;
    description: string;
  }>;
}

export default function HomePage() {
  const t = useTranslations("Home");
  const { data: session } = useSession();
  const router = useRouter();
  const { currentUser, isAuthenticated, isLoading, isSigningOut } = useSelector(
    (state: RootState) => state.user
  );
  // Add state for notice data
  const [noticeData, setNoticeData] = useState<NoticeData | null>(null);

  const textColor = useColorModeValue("gray.700", "gray.200");
  const textColorSecondary = useColorModeValue("gray.600", "gray.400");
  const borderColor = useColorModeValue("gray.100", "gray.700");
  const sectionBgColor = useColorModeValue("gray.50", "gray.900");
  const cardBgColor = useColorModeValue("white", "gray.800");
  const cardBorderColor = useColorModeValue("gray.100", "gray.700");
  const cardHoverBorderColor = useColorModeValue("gray.200", "gray.600");
  const dividerColor = useColorModeValue("gray.200", "gray.700");
  const highlightColor = useColorModeValue("blue.50", "blue.900");

  const debouncedSetSigningOut = React.useCallback(
    debounce((value: boolean) => {
      import('@/store/store').then(({ store }) => {
        const { setSigningOut } = require('@/store/features/userSlice');
        store.dispatch(setSigningOut(value));
      });
    }, 300),
    []
  );

  // Handle sign out state
  useEffect(() => {
    if (!isAuthenticated && isSigningOut) {
      debouncedSetSigningOut(false);
    }
  }, [isAuthenticated, isSigningOut, debouncedSetSigningOut]);

  // Add useEffect to fetch notice data
  useEffect(() => {
    const fetchNoticeData = async () => {
      try {
        const response = await fetch('/api/notice');
        if (response.ok) {
          const data = await response.json();
          setNoticeData(data);
        }
      } catch (error) {
        toaster.create({
          title: "Failed to fetch notice data",
          description: "Please try again later",
          type: "error"
        });
      }
    };

    if (isAuthenticated) {
      fetchNoticeData();
    }
  }, [isAuthenticated]);

  if (isSigningOut) {
    return <Loading />;
  }

  if (!isSigningOut && !isAuthenticated) {
    return <GuestHomePage
      textColor={textColor}
      textColorSecondary={textColorSecondary}
      borderColor={borderColor}
      sectionBgColor={sectionBgColor}
      cardBgColor={cardBgColor}
      cardBorderColor={cardBorderColor}
      cardHoverBorderColor={cardHoverBorderColor}
      dividerColor={dividerColor}
      highlightColor={highlightColor}
    />;
  }

  // Navigation cards for main sections
  const navigationCards = [
    {
      id: "learn",
      title: t("learn_title"),
      description: t("learn_description"),
      icon: FiBook,
      color: "blue.500",
      path: "/learn",
    },
    {
      id: "tasks",
      title: t("tasks_title"),
      description: t("tasks_description"),
      icon: FiMessageSquare,
      color: "green.500",
      path: "/tasks",
    },
    {
      id: "mcp",
      title: t("mcp_title"),
      description: t("mcp_description"),
      icon: FiServer,
      color: "purple.500",
      path: "/mcp",
    },
  ];

  return (
    <Container maxW="1400px" px={{ base: 4, md: 6 }} py={6}>
      <MotionBox
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.4 }}
      >
        {/* Header */}
        <MotionBox
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1, duration: 0.3 }}
          mb={8}
        >
          <Heading as="h1" size="lg" mb={2} display="flex" alignItems="center" color={textColor}>
            <Icon as={FiHome} mr={3} color="blue.500" />
            {t("welcome")}
          </Heading>
          <Text color={textColorSecondary}>{t("welcome_message")}</Text>
        </MotionBox>

        {/* Main Content Grid */}
        <Flex
          direction={{ base: "column", lg: "row" }}
          gap={8}
        >
          {/* Left Column - Navigation Cards */}
          <Box flex="2" mb={{ base: 6, lg: 0 }}>
            <Box className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-1 gap-6 mb-6">
              {navigationCards.map((card, index) => (
                <NavigationCard
                  key={card.id}
                  card={card}
                  index={index}
                  onClick={() => router.push(card.path)}
                  bgColor={cardBgColor}
                  borderColor={cardBorderColor}
                  hoverBorderColor={cardHoverBorderColor}
                  textColor={textColor}
                  textColorSecondary={textColorSecondary}
                />
              ))}
            </Box>
          </Box>

          {/* Right Column - Announcement and Features */}
          <Flex direction="column" flex="3" gap={8}>
            {/* Announcement Section */}
            <MotionBox
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2, duration: 0.3 }}
              p={6}
              borderRadius="xl"
              bg={highlightColor}
              border="1px solid"
              borderColor={borderColor}
              boxShadow="sm"
            >
              <Popover.Root>
                <Popover.Trigger asChild>
                  <Flex align="center" mb={3} cursor="pointer" _hover={{ opacity: 0.8 }}>
                    <Icon as={FiBell} fontSize="2xl" color="orange.500" mr={3} />
                    <Heading as="h2" size="md" color={textColor}>
                      {t("announcement") || "Announcement"}
                    </Heading>
                  </Flex>
                </Popover.Trigger>
                <Portal>
                  <Popover.Positioner>
                    <Popover.Content bg={useColorModeValue("white", "gray.800")} borderColor={cardBorderColor}>
                      <Popover.Arrow />
                      <Popover.Body p={3}>
                        <Text color={textColor}>
                          {noticeData?.announcement?.[0]?.value || "Welcome to the MCP platform! We're constantly improving our services."}
                        </Text>
                      </Popover.Body>
                    </Popover.Content>
                  </Popover.Positioner>
                </Portal>
              </Popover.Root>
              <Text color={textColor} fontSize="md" fontWeight="medium" mb={3}>
                {noticeData?.announcement?.[0]?.value
                  ? (noticeData.announcement[0].value.length > 100
                    ? `${noticeData.announcement[0].value.substring(0, 100)}...`
                    : noticeData.announcement[0].value)
                  : "Welcome to the MCP platform! We're constantly improving our services."}
              </Text>
              <Text color={textColorSecondary} fontSize="sm">
                {noticeData?.announcement?.[0]?.date ? `Last updated: ${noticeData.announcement[0].date}` : "Last updated: June 15, 2023"}
              </Text>
            </MotionBox>

            {/* Known Issues Section */}
            <MotionBox
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.25, duration: 0.3 }}
              p={6}
              borderRadius="xl"
              bg={sectionBgColor}
              border="1px solid"
              borderColor={borderColor}
              boxShadow="sm"
            >
              <Flex align="center" mb={5}>
                <Icon as={FiTool} fontSize="2xl" color="red.500" mr={3} />
                <Heading as="h2" size="md" color={textColor}>
                  {t("known_issues") || "Known Issues"}
                </Heading>
              </Flex>

              <Box>
                {noticeData?.known_issues?.map((issue, index) => (
                  <React.Fragment key={index}>
                    {index > 0 && <Separator my={4} borderColor={dividerColor} />}
                    <FeatureItem
                      color="red.400"
                      title={issue.value || t("issue_1_title") || "Connection Stability"}
                      description={issue.description || t("issue_1_description") || "Occasional connection drops when using MCP with large datasets."}
                      textColor={textColor}
                      textColorSecondary={textColorSecondary}
                      cardBorderColor={cardBorderColor}
                    />
                  </React.Fragment>
                ))}

                {/* Fallback if no known issues */}
                {(!noticeData?.known_issues || noticeData.known_issues.length === 0) && (
                  <FeatureItem
                    color="red.400"
                    title={t("issue_1_title") || "Connection Stability"}
                    description={t("issue_1_description") || "Occasional connection drops when using MCP with large datasets."}
                    textColor={textColor}
                    textColorSecondary={textColorSecondary}
                    cardBorderColor={cardBorderColor}
                  />
                )}
              </Box>
            </MotionBox>

            {/* Features Implementing Section */}
            <MotionBox
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3, duration: 0.3 }}
              p={6}
              borderRadius="xl"
              bg={sectionBgColor}
              border="1px solid"
              borderColor={borderColor}
              boxShadow="sm"
            >
              <Flex align="center" mb={5}>
                <Icon as={FiTool} fontSize="2xl" color="purple.500" mr={3} />
                <Heading as="h2" size="md" color={textColor}>
                  {t("features_implementing") || "Features Implementing"}
                </Heading>
              </Flex>

              <Box>
                {noticeData?.features_implementing?.map((feature, index) => (
                  <React.Fragment key={index}>
                    {index > 0 && <Separator my={4} borderColor={dividerColor} />}
                    <FeatureItem
                      color={index % 3 === 0 ? "yellow.400" : index % 3 === 1 ? "green.400" : "blue.400"}
                      title={feature.value || t("feature_1_title") || "Chat Room"}
                      description={feature.description || t("feature_1_description") || "A dedicated space for real-time communication."}
                      textColor={textColor}
                      textColorSecondary={textColorSecondary}
                      cardBorderColor={cardBorderColor}
                    />
                  </React.Fragment>
                ))}

                {/* Fallback if no features implementing */}
                {(!noticeData?.features_implementing || noticeData.features_implementing.length === 0) && (
                  <FeatureItem
                    color="yellow.400"
                    title={t("feature_1_title") || "Chat Room"}
                    description={t("feature_1_description") || "A dedicated space for real-time communication."}
                    textColor={textColor}
                    textColorSecondary={textColorSecondary}
                    cardBorderColor={cardBorderColor}
                  />
                )}
              </Box>
            </MotionBox>
          </Flex>
        </Flex>
      </MotionBox>
    </Container>
  );
}
