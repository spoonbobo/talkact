"use client";

import React, { useEffect } from "react";
import { Box, Container, Flex, Heading, Icon, Text, SimpleGrid, Separator } from "@chakra-ui/react";
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
import { FaBook } from "react-icons/fa";
import { FaTasks } from "react-icons/fa";

const MotionBox = motion(Box);
const MotionFlex = motion(Flex);

export default function HomePage() {
  const t = useTranslations("Home");
  const { data: session } = useSession();
  const router = useRouter();
  const { currentUser, isAuthenticated, isLoading, isSigningOut } = useSelector(
    (state: RootState) => state.user
  );

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
              <Flex align="center" mb={3}>
                <Icon as={FiBell} fontSize="2xl" color="orange.500" mr={3} />
                <Heading as="h2" size="md" color={textColor}>
                  {t("announcement") || "Announcement"}
                </Heading>
              </Flex>
              <Text color={textColor} fontSize="md" fontWeight="medium" mb={3}>
                {t("announcement_message") || "Welcome to the MCP platform! We're constantly improving our services."}
              </Text>
              <Text color={textColorSecondary} fontSize="sm">
                {t("announcement_date") || "Last updated: June 15, 2023"}
              </Text>
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
                <FeatureItem
                  color="yellow.400"
                  title={t("feature_1_title") || "Chat Room"}
                  description={t("feature_1_description") || "A dedicated space for real-time communication."}
                  textColor={textColor}
                  textColorSecondary={textColorSecondary}
                />

                <Separator my={4} borderColor={dividerColor} />

                <FeatureItem
                  color="green.400"
                  title={t("feature_2_title") || "Task Management"}
                  description={t("feature_2_description") || "Organizing and tracking tasks efficiently."}
                  textColor={textColor}
                  textColorSecondary={textColorSecondary}
                />

                <Separator my={4} borderColor={dividerColor} />

                <FeatureItem
                  color="blue.400"
                  title={t("feature_3_title") || "Learn"}
                  description={t("feature_3_description") || "Accessing resources and tutorials for skill development."}
                  textColor={textColor}
                  textColorSecondary={textColorSecondary}
                />
              </Box>
            </MotionBox>
          </Flex>
        </Flex>
      </MotionBox>
    </Container>
  );
}

// Extracted feature item component
function FeatureItem({
  color,
  title,
  description,
  textColor,
  textColorSecondary
}: {
  color: string;
  title: string;
  description: string;
  textColor: string;
  textColorSecondary: string;
}) {
  return (
    <MotionBox
      initial={{ opacity: 0, x: -5 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.3 }}
    >
      <Flex align="center" mb={2}>
        <Box w="14px" h="14px" borderRadius="full" bg={color} mr={3}></Box>
        <Text fontWeight="semibold" color={textColor}>
          {title}
        </Text>
      </Flex>
      <Text ml="24px" mb={1} color={textColorSecondary} fontSize="sm">
        {description}
      </Text>
    </MotionBox>
  );
}

// Extracted card component for better organization
function NavigationCard({
  card,
  index,
  onClick,
  bgColor,
  borderColor,
  hoverBorderColor,
  textColor,
  textColorSecondary
}: {
  card: any;
  index: any;
  onClick: any;
  bgColor: string;
  borderColor: string;
  hoverBorderColor: string;
  textColor: string;
  textColorSecondary: string;
}) {
  return (
    <MotionFlex
      direction="column"
      bg={bgColor}
      p={6}
      borderRadius="xl"
      boxShadow="sm"
      border="1px solid"
      borderColor={borderColor}
      cursor="pointer"
      height="100%"
      onClick={onClick}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.1 * (index + 1), duration: 0.3 }}
      _hover={{
        transform: "translateY(-3px)",
        boxShadow: "md",
        borderColor: hoverBorderColor,
        transition: "all 0.2s ease"
      }}
    >
      <Flex align="flex-start" mb={4}>
        <Box
          p={3}
          borderRadius="lg"
          bg={`${card.color}15`}
          color={card.color}
          mr={3}
          display="flex"
          alignItems="center"
          justifyContent="center"
        >
          <Icon as={card.icon} fontSize="xl" />
        </Box>
        <Heading size="md" color={textColor}>{card.title}</Heading>
      </Flex>
      <Text color={textColorSecondary} fontSize="sm" flex="1">
        {card.description}
      </Text>
    </MotionFlex>
  );
}

// Guest Home Page Component
function GuestHomePage({
  textColor,
  textColorSecondary,
  borderColor,
  sectionBgColor,
  cardBgColor,
  cardBorderColor,
  cardHoverBorderColor,
  dividerColor,
  highlightColor
}: {
  textColor: string;
  textColorSecondary: string;
  borderColor: string;
  sectionBgColor: string;
  cardBgColor: string;
  cardBorderColor: string;
  cardHoverBorderColor: string;
  dividerColor: string;
  highlightColor: string;
}) {
  const t = useTranslations("Home");
  const router = useRouter();

  const featureCards = [
    {
      id: "chat_room",
      title: t("feature_chat_room") || "Chat Room",
      description: t("feature_chat_room_desc") || "A dedicated space for real-time communication.",
      icon: FiMessageSquare,
      color: "blue.500",
    },
    {
      id: "task_management",
      title: t("feature_task_management") || "Task Management",
      description: t("feature_task_management_desc") || "Organizing and tracking tasks efficiently.",
      icon: FaTasks,
      color: "green.500",
    },
    {
      id: "learn",
      title: t("feature_learn") || "Learn",
      description: t("feature_learn_desc") || "Accessing resources and tutorials for skill development.",
      icon: FaBook,
      color: "purple.500",
    },
  ];

  return (
    <Container maxWidth="1400px" paddingX={{ base: 4, md: 6 }} paddingY={6}>
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
          marginBottom={8}
          textAlign="center"
        >
          <Heading as="h1" size="xl" marginBottom={3} color={textColor}>
            {t("guest_welcome") || "Welcome to MCP Platform"}
          </Heading>
          <Text color={textColorSecondary} fontSize="lg" maxWidth="800px" marginX="auto">
            {t("guest_welcome_message") || "The open protocol that standardizes how applications provide context to LLMs"}
          </Text>
        </MotionBox>

        {/* Hero Section */}


        {/* Feature Cards */}
        <Box marginBottom={16}>
          <Heading as="h2" size="lg" marginBottom={8} color={textColor} textAlign="center">
            {t("guest_features_title") || "Why Choose MCP?"}
          </Heading>
          <SimpleGrid columns={{ base: 1, md: 3 }} gap="32px">
            {featureCards.map((card, index) => (
              <MotionBox
                key={card.id}
                bg={cardBgColor}
                padding={6}
                borderRadius="xl"
                boxShadow="sm"
                border="1px solid"
                borderColor={cardBorderColor}
                height="100%"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 * (index + 1), duration: 0.3 }}
                _hover={{
                  transform: "translateY(-3px)",
                  boxShadow: "md",
                  borderColor: cardHoverBorderColor,
                  transition: "all 0.2s ease"
                }}
              >
                <Flex direction="column" height="100%">
                  <Flex align="center" marginBottom={4}>
                    <Box
                      padding={3}
                      borderRadius="lg"
                      bg={`${card.color}15`}
                      color={card.color}
                      marginRight={3}
                      display="flex"
                      alignItems="center"
                      justifyContent="center"
                    >
                      <Icon as={card.icon} fontSize="xl" />
                    </Box>
                    <Heading size="md" color={textColor}>{card.title}</Heading>
                  </Flex>
                  <Text color={textColorSecondary} fontSize="sm" flex="1">
                    {card.description}
                  </Text>
                </Flex>
              </MotionBox>
            ))}
          </SimpleGrid>
        </Box>

        {/* Call to Action */}
        <MotionBox
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4, duration: 0.3 }}
          padding={8}
          borderRadius="xl"
          bg={sectionBgColor}
          border="1px solid"
          borderColor={borderColor}
          boxShadow="sm"
          textAlign="center"
          marginBottom={8}
        >
          <Heading as="h3" size="md" marginBottom={4} color={textColor}>
            {t("guest_cta_title") || "Ready to get started with MCP?"}
          </Heading>
          <Text color={textColorSecondary} marginBottom={6} maxWidth="600px" marginX="auto">
            {t("guest_cta_description") || "Join our community of developers building the future of AI applications with standardized context protocols."}
          </Text>
          <MotionBox
            as="button"
            paddingX={6}
            paddingY={3}
            borderRadius="lg"
            bg="purple.500"
            color="white"
            fontWeight="semibold"
            _hover={{ bg: "purple.600" }}
            onClick={() => router.push("/signin")}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            {t("get_started") || "Get Started Now"}
          </MotionBox>
        </MotionBox>

        {/* Footer info */}
        <Text textAlign="center" fontSize="sm" color={textColorSecondary} marginTop={12}>
          {t("guest_footer") || "MCP — Making AI context standardization simple and powerful"}
        </Text>
      </MotionBox>
    </Container >
  );
}
