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
  const t = useTranslations("Dashboard");
  const router = useRouter();
  const { currentUser, isAuthenticated, isLoading } = useSelector(
    (state: RootState) => state.user
  );

  // Color mode values
  const textColorHeading = useColorModeValue("gray.800", "gray.100");
  const textColor = useColorModeValue("gray.600", "gray.400");
  const bgColor = useColorModeValue("gray.50", "gray.800");

  // If user data is available, log it
  useEffect(() => {
    if (currentUser) {
      console.log("User data from Redux:", currentUser);
    }
  }, [currentUser]);

  // Show loading state while checking authentication
  if (isLoading || !session) {
    return <Loading />;
  }

  // Redirect if not authenticated
  if (!isAuthenticated && !session) {
    router.push('/login');
    return null;
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
          {t("dashboard")}
        </Heading>

        <Center
          p={8}
          bg={bgColor}
          borderRadius="lg"
          boxShadow="sm"
          height="calc(100vh - 200px)"
          borderWidth="1px"
          borderColor={useColorModeValue("gray.200", "gray.700")}
        >
          <VStack gap={6}>
            <Icon as={FaTools} fontSize="6xl" color="blue.400" />
            <Text fontSize="2xl" fontWeight="bold" color={textColorHeading}>
              {t("under_development")}
            </Text>
            <Text color={textColor} textAlign="center" maxW="md">
              {t("dashboard_coming_soon")}
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
