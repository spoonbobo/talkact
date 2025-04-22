"use client";

import React, { useEffect, useState } from "react";
import { Box, Container, Flex, Heading, Icon, Text, Separator, Portal, Popover, CloseButton, Button, Link } from "@chakra-ui/react";
import { motion } from "framer-motion";
import { FiHome, FiServer, FiBook, FiMessageSquare, FiBell, FiTool, FiPlus, FiArrowRight, FiLoader, FiAlertTriangle, FiRefreshCw } from "react-icons/fi";
import { FaComments, FaComment } from "react-icons/fa";
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
import { GuestHomePage } from "@/components/home";
import { GitHubIssue } from '@/types/github';

const MotionBox = motion.create(Box);


// Add interface for GitHub releases
interface GitHubRelease {
  id: number;
  name: string;
  tag_name: string;
  body: string;
  created_at: string;
  published_at: string;
  html_url: string;
  assets: Array<{
    id: number;
    name: string;
    browser_download_url: string;
  }>;
}

export default function HomePage() {
  const t = useTranslations("Home");
  const { data: session } = useSession();
  console.log(session);
  const router = useRouter();
  const { currentUser, isAuthenticated, isLoading, isSigningOut } = useSelector(
    (state: RootState) => state.user
  );
  // Update state for GitHub issues
  const [githubIssues, setGithubIssues] = useState<GitHubIssue[]>([]);
  // Add state for GitHub issue counts
  const [issueCounts, setIssueCounts] = useState({
    bugs: { open: 0, closed: 0 },
    enhancements: { open: 0, closed: 0 },
    announcements: { open: 0, closed: 0 }
  });
  // Add state for GitHub releases
  const [githubReleases, setGithubReleases] = useState<GitHubRelease[]>([]);
  // Add these new state variables for loading states
  const [isLoadingIssues, setIsLoadingIssues] = useState(true);
  const [isLoadingReleases, setIsLoadingReleases] = useState(true);
  // Add these state variables for tracking fetch failures
  const [issuesFetchFailed, setIssuesFetchFailed] = useState(false);
  const [releasesFetchFailed, setReleasesFetchFailed] = useState(false);

  // Define all color mode values at the top of the component
  const textColor = useColorModeValue("gray.700", "gray.200");
  const textColorSecondary = useColorModeValue("gray.600", "gray.400");
  const borderColor = useColorModeValue("gray.100", "gray.700");
  const sectionBgColor = useColorModeValue("gray.50", "gray.900");
  const cardBgColor = useColorModeValue("white", "gray.800");
  const cardBorderColor = useColorModeValue("gray.100", "gray.700");
  const cardHoverBorderColor = useColorModeValue("gray.200", "gray.600");
  const dividerColor = useColorModeValue("gray.200", "gray.700");
  const highlightColor = useColorModeValue("blue.50", "blue.900");
  const accentColor = useColorModeValue("purple.500", "purple.300");
  const accentColorLight = useColorModeValue("purple.50", "purple.900");
  const gradientStart = useColorModeValue("rgba(138,43,226,0.05)", "rgba(138,43,226,0.2)");
  const gradientEnd = useColorModeValue("rgba(0,191,255,0.05)", "rgba(0,191,255,0.2)");
  const cardShadow = useColorModeValue("0 4px 12px rgba(0,0,0,0.05)", "0 4px 12px rgba(0,0,0,0.3)");
  const hoverCardShadow = useColorModeValue("0 8px 20px rgba(0,0,0,0.1)", "0 8px 20px rgba(0,0,0,0.4)");
  // Additional color values that might be used conditionally
  const grayBgLight = useColorModeValue("gray.100", "gray.700");
  const purpleHoverLight = useColorModeValue("purple.600", "purple.300");
  const whiteOrGray750 = useColorModeValue("white", "gray.750");

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

  // Update useEffect to fetch GitHub issues and counts
  useEffect(() => {
    const fetchGithubIssues = async () => {
      setIsLoadingIssues(true);
      setIssuesFetchFailed(false);
      try {
        const response = await fetch('/api/github/issue');
        if (response.ok) {
          const data = await response.json();
          setGithubIssues(data.issues || []);
          setIssueCounts(data.counts || {
            bugs: { open: 0, closed: 0 },
            enhancements: { open: 0, closed: 0 },
            announcements: { open: 0, closed: 0 }
          });
        } else {
          throw new Error(`Failed to fetch: ${response.status}`);
        }
      } catch (error) {
        setIssuesFetchFailed(true);
        toaster.create({
          title: "Failed to fetch GitHub issues",
          description: "Please try again later",
          type: "error"
        });
      } finally {
        setIsLoadingIssues(false);
      }
    };

    if (isAuthenticated) {
      fetchGithubIssues();
    }
  }, [isAuthenticated]);

  // Add useEffect to fetch GitHub releases
  useEffect(() => {
    const fetchGithubReleases = async () => {
      setIsLoadingReleases(true);
      setReleasesFetchFailed(false);
      try {
        const response = await fetch('/api/github/release');
        if (response.ok) {
          const data = await response.json();
          setGithubReleases(data);
        } else {
          throw new Error(`Failed to fetch: ${response.status}`);
        }
      } catch (error) {
        setReleasesFetchFailed(true);
        toaster.create({
          title: "Failed to fetch GitHub releases",
          description: "Please try again later",
          type: "error"
        });
      } finally {
        setIsLoadingReleases(false);
      }
    };

    if (isAuthenticated) {
      fetchGithubReleases();
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
      id: "chatroom",
      title: t("chatroom_title") || "Chatroom",
      description: t("chatroom_description") || "Chat with your team and AI agents to create executable plans",
      icon: FaComments,
      color: "pink.500",
      path: "/chat",
    },
    {
      id: "plans",
      title: t("plans_title"),
      description: t("plans_description"),
      icon: FiMessageSquare,
      color: "green.500",
      path: "/plans",
    },
    {
      id: "learn",
      title: t("learn_title"),
      description: t("learn_description"),
      icon: FiBook,
      color: "blue.500",
      path: "/workbench/learn",
    },
    {
      id: "ai-assistant",
      title: t("ai_assistant_title") || "AI Assistant",
      description: t("ai_assistant_description") || "Answer questions based on growing knowledge, globally persisted across the app.",
      icon: FaComment,
      color: "teal.500",
      path: null,
    },
  ];

  // Function to truncate and format issue body for preview
  const formatIssueBody = (body: string, maxLength: number = 120) => {
    if (!body) return "";
    // Remove markdown formatting and extra whitespace
    const cleanBody = body
      .replace(/\r?\n|\r/g, ' ')  // Replace newlines with spaces
      .replace(/\s+/g, ' ')       // Replace multiple spaces with single space
      .replace(/\[.*?\]\(.*?\)/g, '') // Remove markdown links
      .replace(/[#*_~`]/g, '');   // Remove markdown formatting characters

    return cleanBody.length > maxLength
      ? cleanBody.substring(0, maxLength) + '...'
      : cleanBody;
  };

  // Add this spinning loader component
  const SpinningLoader = ({ size = "md", color = accentColor }) => (
    <MotionBox
      animate={{ rotate: 360 }}
      transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
      display="flex"
      justifyContent="center"
      alignItems="center"
      width={size === "sm" ? "24px" : size === "md" ? "40px" : "60px"}
      height={size === "sm" ? "24px" : size === "md" ? "40px" : "60px"}
    >
      <Icon
        as={FiLoader}
        fontSize={size === "sm" ? "lg" : size === "md" ? "2xl" : "3xl"}
        color={color}
      />
    </MotionBox>
  );

  return (
    <Box
      width="100%"
      overflowX="hidden"
      overflowY="visible"
      bgGradient={`linear(to-br, ${gradientStart}, ${gradientEnd})`}
    >
      <Container maxW="1400px" px={{ base: 4, md: 6 }} py={8}>
        <MotionBox
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.4 }}
          width="100%"
        >
          {/* Enhanced Header with Gradient Underline */}
          <MotionBox
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1, duration: 0.3 }}
            mb={10}
            pb={4}
            borderBottom="1px solid"
            borderColor={borderColor}
            position="relative"
            _after={{
              content: '""',
              position: "absolute",
              bottom: "-1px",
              left: "0",
              width: "150px",
              height: "3px",
              bgGradient: `linear(to-r, ${accentColor}, transparent)`,
              borderRadius: "full"
            }}
          >
            <Heading
              as="h1"
              size="lg"
              mb={3}
              display="flex"
              alignItems="center"
              color={textColor}
              letterSpacing="tight"
            >
              <Icon as={FiHome} mr={3} color={accentColor} />
              {t("welcome")}
            </Heading>
            <Text
              color={textColorSecondary}
              fontSize="lg"
              maxW="800px"
              lineHeight="1.6"
            >
              {t("welcome_message")}
            </Text>
          </MotionBox>

          {/* Main Content Grid with Enhanced Spacing */}
          <Flex
            direction={{ base: "column", lg: "row" }}
            gap={10}
          >
            {/* Left Column - Navigation Cards with Enhanced Styling */}
            <Box flex="2" mb={{ base: 8, lg: 0 }}>
              <Box className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-1 gap-6 mb-6">
                {navigationCards.map((card, index) => (
                  <MotionBox
                    key={card.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 * (index + 1), duration: 0.4 }}
                    onClick={() => card.path && router.push(card.path)}
                    cursor="pointer"
                    p={5}
                    borderRadius="xl"
                    bg={cardBgColor}
                    border="1px solid"
                    borderColor={cardBorderColor}
                    boxShadow={cardShadow}
                    _hover={{
                      transform: "translateY(-5px)",
                      boxShadow: hoverCardShadow,
                      borderColor: card.color,
                      transition: "all 0.3s ease"
                    }}
                    position="relative"
                    overflow="hidden"
                  >
                    {/* Subtle background gradient for cards */}
                    <Box
                      position="absolute"
                      top={0}
                      left={0}
                      right={0}
                      bottom={0}
                      bgGradient={`linear(to-br, ${card.color}10, transparent)`}
                      opacity={0.8}
                      borderRadius="xl"
                    />

                    <Flex align="center" mb={3} position="relative" zIndex={1}>
                      <Flex
                        align="center"
                        justify="center"
                        bg={`${card.color}20`}
                        color={card.color}
                        borderRadius="lg"
                        p={3}
                        mr={4}
                        boxShadow="0 2px 8px rgba(0,0,0,0.1)"
                      >
                        <Icon as={card.icon} fontSize="xl" />
                      </Flex>
                      <Heading as="h3" size="md" fontWeight="bold" color={textColor}>
                        {card.title}
                      </Heading>
                    </Flex>
                    <Text color={textColorSecondary} fontSize="md" position="relative" zIndex={1}>
                      {card.description}
                    </Text>
                  </MotionBox>
                ))}
              </Box>
            </Box>

            {/* Right Column - Releases and Features with Enhanced Styling */}
            <Flex direction="column" flex="3" gap={8}>
              {/* Releases Section with Improved Visual Design */}
              <MotionBox
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2, duration: 0.3 }}
                p={6}
                borderRadius="xl"
                bg={highlightColor}
                border="1px solid"
                borderColor={borderColor}
                boxShadow={cardShadow}
                position="relative"
                overflow="hidden"
              >
                {/* Decorative element */}
                <Box
                  position="absolute"
                  top={0}
                  right={0}
                  width="150px"
                  height="150px"
                  bgGradient={`radial(${accentColorLight}, transparent)`}
                  opacity={0.6}
                  borderRadius="full"
                  transform="translate(30%, -30%)"
                />

                <Flex align="center" justify="space-between" mb={4} position="relative" zIndex={1}>
                  <Flex align="center">
                    <Icon
                      as={FiBell}
                      fontSize="2xl"
                      color={accentColor}
                      mr={3}
                      p={1}
                      bg={`${accentColor}15`}
                      borderRadius="md"
                    />
                    <Heading as="h2" size="md" color={textColor} fontWeight="bold">
                      {t("latest_releases") || "Latest Releases"}
                    </Heading>
                  </Flex>
                  <Text color={textColorSecondary} fontSize="sm" fontWeight="medium">
                    {githubReleases.length > 0
                      ? `${githubReleases[0].tag_name} · ${new Date(githubReleases[0].published_at).toLocaleDateString()}`
                      : ""}
                  </Text>
                </Flex>

                <Box role="list" mt={3} display="flex" flexDirection="column" gap={4}>
                  {isLoadingReleases ? (
                    <Flex justify="center" align="center" py={8}>
                      <SpinningLoader />
                    </Flex>
                  ) : releasesFetchFailed ? (
                    <Flex direction="column" align="center" justify="center" py={6}>
                      <Icon as={FiAlertTriangle} fontSize="3xl" color="red.500" mb={3} />
                      <Text color={textColorSecondary} fontWeight="medium" textAlign="center">
                        {t("failed_to_load") || "Failed to load releases"}
                      </Text>
                      <Button
                        mt={4}
                        size="sm"
                        colorScheme="blue"
                        // leftIcon={<FiRefreshCw />}
                        onClick={() => {
                          setIsLoadingReleases(true);
                          fetch('/api/github/release')
                            .then(res => res.json())
                            .then(data => {
                              setGithubReleases(data);
                              setReleasesFetchFailed(false);
                            })
                            .catch(() => setReleasesFetchFailed(true))
                            .finally(() => setIsLoadingReleases(false));
                        }}
                      >
                        {t("retry") || "Retry"}
                      </Button>
                    </Flex>
                  ) : githubReleases.length > 0 ? (
                    <MotionBox
                      key={githubReleases[0].id}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.1, duration: 0.3 }}
                      p={4}
                      borderRadius="lg"
                      border="1px solid"
                      borderColor={cardBorderColor}
                      bg={cardBgColor}
                      _hover={{
                        borderColor: accentColor,
                        bg: cardBgColor,
                        transform: "translateY(-2px)",
                        boxShadow: "md"
                      }}
                      position="relative"
                      zIndex={1}
                    >
                      <Flex justify="space-between" align="center" mb={2}>
                        <Text color={textColor} fontWeight="semibold" fontSize="md">
                          {githubReleases[0].name || githubReleases[0].tag_name}
                        </Text>
                        <Text color={textColorSecondary} fontSize="xs" bg={grayBgLight} px={2} py={1} borderRadius="md">
                          {new Date(githubReleases[0].published_at).toLocaleDateString()}
                        </Text>
                      </Flex>
                      <Text color={textColorSecondary} fontSize="sm" mb={3} lineHeight="1.6">
                        {formatIssueBody(githubReleases[0].body)}
                      </Text>
                      <Link
                        href={githubReleases[0].html_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        color={accentColor}
                        fontSize="sm"
                        fontWeight="medium"
                        display="flex"
                        alignItems="center"
                        _hover={{ textDecoration: "none", color: accentColor }}
                      >
                        View release
                        <Icon as={FiArrowRight} ml={1} fontSize="xs" />
                      </Link>
                    </MotionBox>
                  ) : (
                    <Text color={textColorSecondary}>{t("no_data") || "No releases available at this time."}</Text>
                  )}
                </Box>

                <Box mt={4} textAlign="center">
                  <Link
                    href="https://github.com/spoonbobo/onlysaid/releases"
                    target="_blank"
                    rel="noopener noreferrer"
                    color={accentColor}
                    fontSize="sm"
                    fontWeight="semibold"
                    display="inline-flex"
                    alignItems="center"
                    p={2}
                    borderRadius="md"
                    _hover={{
                      bg: `${accentColor}15`,
                      textDecoration: "none"
                    }}
                  >
                    View more releases
                    <Icon as={FiArrowRight} ml={1} fontSize="xs" />
                  </Link>
                </Box>
              </MotionBox>

              {/* Known Issues Section with Enhanced Visual Design */}
              <MotionBox
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.25, duration: 0.3 }}
                p={6}
                borderRadius="xl"
                bg={sectionBgColor}
                border="1px solid"
                borderColor={borderColor}
                boxShadow={cardShadow}
              >
                <Flex align="center" justify="space-between" mb={4}>
                  <Flex align="center">
                    <Icon
                      as={FiTool}
                      fontSize="2xl"
                      color="red.500"
                      mr={3}
                      p={1}
                      bg="red.50"
                      borderRadius="md"
                    />
                    <Heading as="h2" size="md" color={textColor} fontWeight="bold">
                      {t("known_issues") || "Known Issues"}
                    </Heading>
                  </Flex>
                  <Link
                    href="https://github.com/spoonbobo/onlysaid/issues/new?labels=bug&template=bug_report.md"
                    target="_blank"
                    rel="noopener noreferrer"
                    _hover={{ textDecoration: "none" }}
                  >
                    <Button
                      colorScheme="red"
                      size="sm"
                      borderRadius="md"
                      boxShadow="sm"
                      _hover={{ transform: "translateY(-2px)", boxShadow: "md" }}
                      transition="all 0.2s ease-in-out"
                    >
                      {t("report_issue") || "Report Issue"}
                    </Button>
                  </Link>
                </Flex>

                <Box mt={6} p={5} borderRadius="lg" bg={cardBgColor} border="1px solid" borderColor={cardBorderColor}>
                  {isLoadingIssues ? (
                    <Flex justify="center" align="center" py={8}>
                      <SpinningLoader />
                    </Flex>
                  ) : issuesFetchFailed ? (
                    <Flex direction="column" align="center" justify="center" py={6}>
                      <Icon as={FiAlertTriangle} fontSize="3xl" color="red.500" mb={3} />
                      <Text color={textColorSecondary} fontWeight="medium" textAlign="center">
                        {t("failed_to_load") || "Failed to load issues"}
                      </Text>
                      <Button
                        mt={4}
                        size="sm"
                        colorScheme="blue"
                        // leftIcon={<FiRefreshCw />}
                        onClick={() => {
                          setIsLoadingIssues(true);
                          fetch('/api/github/issue')
                            .then(res => res.json())
                            .then(data => {
                              setGithubIssues(data.issues || []);
                              setIssueCounts(data.counts || {
                                bugs: { open: 0, closed: 0 },
                                enhancements: { open: 0, closed: 0 },
                                announcements: { open: 0, closed: 0 }
                              });
                              setIssuesFetchFailed(false);
                            })
                            .catch(() => setIssuesFetchFailed(true))
                            .finally(() => setIsLoadingIssues(false));
                        }}
                      >
                        {t("retry") || "Retry"}
                      </Button>
                    </Flex>
                  ) : (
                    <Flex direction={{ base: "column", md: "row" }} justify="space-around" align="center" gap={6}>
                      <Box textAlign="center" p={4}>
                        <Text fontSize="4xl" fontWeight="bold" color="red.500" mb={2}>
                          {issueCounts.bugs.open}
                        </Text>
                        <Text color={textColorSecondary} fontWeight="medium">
                          {t("open_issues") || "Open Issues"}
                        </Text>
                      </Box>

                      <Box textAlign="center" p={4}>
                        <Text fontSize="4xl" fontWeight="bold" color="green.500" mb={2}>
                          {issueCounts.bugs.closed}
                        </Text>
                        <Text color={textColorSecondary} fontWeight="medium">
                          {t("resolved_issues") || "Resolved Issues"}
                        </Text>
                      </Box>
                    </Flex>
                  )}

                  <Box mt={6} textAlign="center">
                    <Link
                      href="https://github.com/spoonbobo/onlysaid/issues?q=is%3Aissue+is%3Aopen+label%3Abug"
                      target="_blank"
                      rel="noopener noreferrer"
                      color="red.500"
                      fontSize="sm"
                      fontWeight="semibold"
                      display="inline-flex"
                      alignItems="center"
                      p={2}
                      borderRadius="md"
                      _hover={{
                        bg: "red.50",
                        textDecoration: "none"
                      }}
                    >
                      {t("view_all_issues") || "View all issues"}
                      <Icon as={FiArrowRight} ml={1} fontSize="xs" />
                    </Link>
                  </Box>
                </Box>
              </MotionBox>

              {/* Features Implementing Section with Enhanced Visual Design */}
              <MotionBox
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3, duration: 0.3 }}
                p={6}
                borderRadius="xl"
                bg={sectionBgColor}
                border="1px solid"
                borderColor={borderColor}
                boxShadow={cardShadow}
              >
                <Flex align="center" justify="space-between" mb={4}>
                  <Flex align="center">
                    <Icon
                      as={FiTool}
                      fontSize="2xl"
                      color="purple.500"
                      mr={3}
                      p={1}
                      bg="purple.50"
                      borderRadius="md"
                    />
                    <Heading as="h2" size="md" color={textColor} fontWeight="bold">
                      {t("features_implementing") || "Features Implementing"}
                    </Heading>
                  </Flex>
                  <Link
                    href="https://github.com/spoonbobo/onlysaid/issues/new?labels=enhancement&template=feature_request.md"
                    target="_blank"
                    rel="noopener noreferrer"
                    _hover={{ textDecoration: "none" }}
                  >
                    <Button
                      colorScheme="purple"
                      size="sm"
                      borderRadius="md"
                      boxShadow="sm"
                      _hover={{ transform: "translateY(-2px)", boxShadow: "md" }}
                      transition="all 0.2s ease-in-out"
                    >
                      {t("suggest_feature") || "Suggest Feature"}
                    </Button>
                  </Link>
                </Flex>

                <Box mt={6} p={5} borderRadius="lg" bg={cardBgColor} border="1px solid" borderColor={cardBorderColor}>
                  {isLoadingIssues ? (
                    <Flex justify="center" align="center" py={8}>
                      <SpinningLoader />
                    </Flex>
                  ) : issuesFetchFailed ? (
                    <Flex direction="column" align="center" justify="center" py={6}>
                      <Icon as={FiAlertTriangle} fontSize="3xl" color="red.500" mb={3} />
                      <Text color={textColorSecondary} fontWeight="medium" textAlign="center">
                        {t("failed_to_load") || "Failed to load features"}
                      </Text>
                      <Button
                        mt={4}
                        size="sm"
                        colorScheme="blue"
                        // leftIcon={<FiRefreshCw />}
                        onClick={() => {
                          setIsLoadingIssues(true);
                          fetch('/api/github/issue')
                            .then(res => res.json())
                            .then(data => {
                              setGithubIssues(data.issues || []);
                              setIssueCounts(data.counts || {
                                bugs: { open: 0, closed: 0 },
                                enhancements: { open: 0, closed: 0 },
                                announcements: { open: 0, closed: 0 }
                              });
                              setIssuesFetchFailed(false);
                            })
                            .catch(() => setIssuesFetchFailed(true))
                            .finally(() => setIsLoadingIssues(false));
                        }}
                      >
                        {t("retry") || "Retry"}
                      </Button>
                    </Flex>
                  ) : (
                    <Flex direction={{ base: "column", md: "row" }} justify="space-around" align="center" gap={6}>
                      <Box textAlign="center" p={4}>
                        <Text fontSize="4xl" fontWeight="bold" color="purple.500" mb={2}>
                          {issueCounts.enhancements.open}
                        </Text>
                        <Text color={textColorSecondary} fontWeight="medium">
                          {t("in_progress") || "In Progress"}
                        </Text>
                      </Box>

                      <Box textAlign="center" p={4}>
                        <Text fontSize="4xl" fontWeight="bold" color="green.500" mb={2}>
                          {issueCounts.enhancements.closed}
                        </Text>
                        <Text color={textColorSecondary} fontWeight="medium">
                          {t("completed") || "Completed"}
                        </Text>
                      </Box>
                    </Flex>
                  )}

                  <Box mt={6} textAlign="center">
                    <Link
                      href="https://github.com/spoonbobo/onlysaid/issues?q=is%3Aissue+label%3Aenhancement"
                      target="_blank"
                      rel="noopener noreferrer"
                      color="purple.500"
                      fontSize="sm"
                      fontWeight="semibold"
                      display="inline-flex"
                      alignItems="center"
                      p={2}
                      borderRadius="md"
                      _hover={{
                        bg: "purple.50",
                        textDecoration: "none"
                      }}
                    >
                      {t("view_all_features") || "View all features"}
                      <Icon as={FiArrowRight} ml={1} fontSize="xs" />
                    </Link>
                  </Box>
                </Box>
              </MotionBox>
            </Flex>
          </Flex>
        </MotionBox>
      </Container>
    </Box>
  );
}
