"use client";

import { useTranslations } from "next-intl";
import { useSession } from "next-auth/react";
import Loading from "@/components/loading";
import { useSelector } from 'react-redux';
import { ColorModeButton } from "@/components/ui/color-mode"
import { RootState } from "@/store/store";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Box, Heading, Icon, Container, Center, Text, VStack, SimpleGrid, Button, Flex, HStack } from "@chakra-ui/react";
import { FaHome, FaTools, FaFolder, FaCode, FaRocket, FaBookOpen } from "react-icons/fa";
import { FaNetworkWired } from "react-icons/fa6";
import { useColorModeValue } from "@/components/ui/color-mode";
import { useSettingsColors } from "@/utils/colors";

const MotionBox = motion(Box);
const MotionFlex = motion(Flex);

// Feature card component
const FeatureCard = ({ icon, title, description, onClick }: {
  icon: React.ElementType;
  title: string;
  description: string;
  onClick?: () => void;
}) => {
  const colors = useSettingsColors();

  return (
    <MotionBox
      p={6}
      borderWidth="1px"
      borderColor={colors.borderColor}
      borderRadius="lg"
      bg={colors.cardBg}
      boxShadow="sm"
      whileHover={{ y: -5, boxShadow: "0 10px 30px -10px rgba(0,0,0,0.2)" }}
      transition={{ duration: 0.2 }}
      cursor={onClick ? "pointer" : "default"}
      onClick={onClick}
      height="100%"
    >
      <Icon as={icon} fontSize="3xl" color={colors.accentColor} mb={4} />
      <Heading size="md" mb={3} color={colors.textColorHeading}>{title}</Heading>
      <Text fontSize="sm" color={colors.textColorMuted}>{description}</Text>
    </MotionBox>
  );
};

export default function DashboardPage() {
  const { data: session } = useSession();
  const t = useTranslations("Workbench");
  const router = useRouter();
  const { currentUser, isAuthenticated, isLoading, isOwner } = useSelector(
    (state: RootState) => state.user
  );

  // Use the colors utility
  const colors = useSettingsColors();

  // Gradient background
  const gradientBg = useColorModeValue(
    "linear-gradient(135deg, #f5f7fa 0%, #e4e7eb 100%)",
    "linear-gradient(135deg, #2d3748 0%, #1a202c 100%)"
  );

  // If user data is available, log it
  useEffect(() => {
    if (currentUser) {
      console.log("User data from Redux:", currentUser);
    }
  }, [currentUser]);

  // Use useEffect for navigation instead of doing it during render
  useEffect(() => {
    // Removing the access restriction that redirects non-owner users
    // Previously had:
    // if (currentUser && !isOwner) {
    //   router.push('/redirect/no_access?reason=Not available for UAT');
    // }
  }, [currentUser, isOwner, router]);

  // Navigation handlers
  const navigateToFileExplorer = () => router.push('/workbench/file_explorer');
  const navigateToLearn = () => router.push('/workbench/learn');

  // Removed workflow navigation since it's not available yet

  // Show loading state while checking authentication
  if (isLoading || !session) {
    return <Loading />;
  }

  // Redirect if not authenticated
  if (!isAuthenticated && !session) {
    return <Loading />; // Show loading instead of direct navigation
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
        <Heading size="lg" mb={6} display="flex" alignItems="center" color={colors.textColorHeading}>
          <Icon as={FaTools} mr={3} color={colors.accentColor} />
          {t("workbench")}
        </Heading>

        <Box
          p={8}
          bg={colors.bgColor}
          borderRadius="lg"
          boxShadow="sm"
          height="calc(100vh - 200px)"
          borderWidth="1px"
          borderColor={colors.borderColor}
          overflow="auto"
          position="relative"
        >
          {/* Hero section */}
          <MotionBox
            mb={12}
            p={8}
            borderRadius="xl"
            bg={gradientBg}
            boxShadow="md"
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.2, duration: 0.5 }}
          >
            <Flex direction={{ base: "column", md: "row" }} align="center">
              <Box flex="1" pr={{ base: 0, md: 8 }} mb={{ base: 6, md: 0 }}>
                <Heading size="xl" mb={4} lineHeight="1.2" color={colors.textColorHeading}>
                  {t("welcome_to_workbench")}
                </Heading>
                <Text fontSize="lg" mb={6} color={colors.textColorMuted}>
                  {t("workbench_description")}
                </Text>
                <Flex gap={4} flexWrap="wrap">
                  <Button
                    colorScheme="blue"
                    size="lg"
                    onClick={navigateToFileExplorer}
                  >
                    {t("explore_files")}
                  </Button>
                  {/* Removed workflow button since it's not available yet */}
                </Flex>
              </Box>
              <Center flex="1">
                <Icon as={FaRocket} fontSize="9xl" color={colors.accentColor} />
              </Center>
            </Flex>
          </MotionBox>

          {/* Features section */}
          <Heading size="md" mb={6} color={colors.textColorHeading}>
            {t("available_tools")}
          </Heading>

          <HStack gap={1} mb={12} flexWrap="wrap" alignItems="stretch">
            <MotionFlex
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3, duration: 0.5 }}
              flex="1"
              minW={{ base: "100%", md: "280px" }}
              maxW={{ base: "100%", md: "400px" }}
            >
              <FeatureCard
                icon={FaFolder}
                title={t("file_explorer")}
                description={t("file_explorer_description")}
                onClick={navigateToFileExplorer}
              />
            </MotionFlex>

            <MotionFlex
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4, duration: 0.5 }}
              flex="1"
              minW={{ base: "100%", md: "280px" }}
              maxW={{ base: "100%", md: "400px" }}
            >
              <FeatureCard
                icon={FaBookOpen}
                title={t("learn")}
                description={t("learn_description")}
                onClick={navigateToLearn}
              />
            </MotionFlex>

            {/* Commented out unavailable features
            <MotionFlex
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5, duration: 0.5 }}
            >
              <FeatureCard
                icon={FaCode}
                title={`${t("code_editor")} (${t("coming_soon")})`}
                description={t("code_editor_description")}
              />
            </MotionFlex>
            */}
          </HStack>

          {/* Development note */}
          <MotionBox
            p={6}
            borderRadius="lg"
            borderWidth="1px"
            borderColor={colors.borderColor}
            bg={colors.subtleSelectedItemBg}
            color={colors.accentColor}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.6, duration: 0.5 }}
          >
            <Flex align="center" mb={2}>
              <Icon as={FaTools} mr={2} />
              <Heading size="sm">{t("under_development")}</Heading>
            </Flex>
            <Text fontSize="sm" color={colors.textColorMuted}>
              {t("currently_only_file_browsing")} {/* You may need to add this translation */}
            </Text>
          </MotionBox>

          {/* Color mode toggle */}
          <Center mt={8}>
            <ColorModeButton />
          </Center>
        </Box>
      </MotionBox>
    </Container>
  );
}
