"use client";

import { useTranslations } from "next-intl";
import { useSearchParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Box, Heading, Icon, Container, Center, Text, VStack, Button, IconButton } from "@chakra-ui/react";
import { FaExclamationTriangle, FaHome } from "react-icons/fa";
import { useColorModeValue } from "@/components/ui/color-mode";
import { useSelector } from "react-redux";
import { RootState } from "@/store/store";

const MotionBox = motion.create(Box);

export default function NoAccessPage() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const t = useTranslations("Errors");
    const reason = searchParams.get("reason") || t("default_no_access");
    const [countdown, setCountdown] = useState(5);

    const { currentUser, isAuthenticated, isLoading, isOwner } = useSelector((state: RootState) => state.user);


    // Color mode values
    const textColorHeading = useColorModeValue("gray.800", "gray.100");
    const textColor = useColorModeValue("gray.600", "gray.400");
    const bgColor = useColorModeValue("gray.50", "gray.800");
    const borderColor = useColorModeValue("gray.200", "gray.700");
    const warningColor = useColorModeValue("orange.500", "orange.300");

    // Countdown and redirect
    useEffect(() => {
        let timer: NodeJS.Timeout;

        // Only set up the timer if we're not already at 0
        if (countdown > 0) {
            timer = setInterval(() => {
                setCountdown((prev) => {
                    if (prev <= 1) {
                        clearInterval(timer);
                        // We'll handle the navigation in a separate effect
                        return 0;
                    }
                    return prev - 1;
                });
            }, 1000);
        }

        return () => {
            if (timer) clearInterval(timer);
        };
    }, [countdown]);

    // Separate effect for navigation
    useEffect(() => {
        if (countdown === 0) {
            // Use a timeout to ensure this happens after render
            const redirectTimeout = setTimeout(() => {
                router.push(`/${currentUser?.lastOpenedTeam || ""}`);
            }, 100);

            return () => clearTimeout(redirectTimeout);
        }
    }, [countdown, router]);

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
                    <Icon as={FaExclamationTriangle} mr={3} color={warningColor} />
                    {t("access_denied")}
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
                        <Icon as={FaExclamationTriangle} fontSize="6xl" color={warningColor} />
                        <Text fontSize="2xl" fontWeight="bold" color={textColorHeading}>
                            {t("no_permission")}
                        </Text>
                        <Text color={textColor} textAlign="center" maxW="md">
                            {reason}
                        </Text>
                        <Text color={textColor} fontSize="sm">
                            {t("redirecting_in")} {countdown} {t("seconds")} {t("to_home")}...
                        </Text>
                        <IconButton
                            size="xs"
                            variant="ghost"
                            onClick={() => router.push("/")}
                            aria-label="Copy tool name"
                        // _hover={{ bg: buttonHoverBg, color: buttonHoverColor }}
                        >
                            <Icon as={FaHome} />
                        </IconButton>
                    </VStack>
                </Center>
            </MotionBox>
        </Container>
    );
}
