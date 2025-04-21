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
import { Box, Heading, Icon, Container, Center, Text, VStack } from "@chakra-ui/react";
import { FaHome, FaTools } from "react-icons/fa";
import { useColorModeValue } from "@/components/ui/color-mode";

const MotionBox = motion.create(Box);

export default function DashboardPage() {
  const { data: session } = useSession();
  const t = useTranslations("Workbench");
  const router = useRouter();
  const { currentUser, isAuthenticated, isLoading, isOwner } = useSelector(
    (state: RootState) => state.user
  );

  // Color mode values
  const textColorHeading = useColorModeValue("gray.800", "gray.100");
  const textColor = useColorModeValue("gray.600", "gray.400");
  const bgColor = useColorModeValue("gray.50", "gray.800");
  const borderColor = useColorModeValue("gray.200", "gray.700");

  // If user data is available, log it
  useEffect(() => {
    if (currentUser) {
      console.log("User data from Redux:", currentUser);
    }
  }, [currentUser]);

  // Use useEffect for navigation instead of doing it during render
  useEffect(() => {
    if (currentUser && !isOwner) {
      router.push('/redirect/no_access?reason=Not available for UAT');
    }
  }, [currentUser, isOwner, router]);

  // Show loading state while checking authentication
  if (isLoading || !session) {
    return <Loading />;
  }

  // Redirect if not authenticated
  if (!isAuthenticated && !session) {
    return <Loading />; // Show loading instead of direct navigation
  }

  // Add a check to not render the dashboard content if not owner
  if (!isOwner) {
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
          <Icon as={FaHome} mr={3} color="blue.500" />
          {t("workbench")}
        </Heading>

        <Center
          p={8}
          bg={bgColor}
          borderRadius="lg"
          boxShadow="sm"
          height="calc(100vh - 200px)"
          borderWidth="1px"
          borderColor={borderColor}
        >
          <VStack gap={6}>
            <Icon as={FaTools} fontSize="6xl" color="blue.400" />
            <Text fontSize="2xl" fontWeight="bold" color={textColorHeading}>
              {t("under_development")}
            </Text>
            <Text color={textColor} textAlign="center" maxW="md">
              {t("workbench_coming_soon")}
            </Text>
            <Box pt={4}>
              <ColorModeButton />
            </Box>
          </VStack>
        </Center>
      </MotionBox>
    </Container>
  );
}
