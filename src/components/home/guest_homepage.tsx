"use client";

import React from "react";
import { Box, Container, Flex, Heading, Icon, Text, SimpleGrid, Image } from "@chakra-ui/react";
import { motion } from "framer-motion";
import { FiMessageSquare } from "react-icons/fi";
import { FaBook, FaTasks } from "react-icons/fa";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";

const MotionBox = motion.create(Box);

interface GuestHomePageProps {
    textColor: string;
    textColorSecondary: string;
    borderColor: string;
    sectionBgColor: string;
    cardBgColor: string;
    cardBorderColor: string;
    cardHoverBorderColor: string;
    dividerColor: string;
    highlightColor: string;
}

export function GuestHomePage({
    textColor,
    textColorSecondary,
    borderColor,
    sectionBgColor,
    cardBgColor,
    cardBorderColor,
    cardHoverBorderColor,
    dividerColor,
    highlightColor
}: GuestHomePageProps) {
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

                {/* Powered By Section */}
                <MotionBox
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2, duration: 0.3 }}
                    marginBottom={8}
                    textAlign="center"
                >
                    <Heading as="h2" size="lg" marginBottom={4} color={textColor}>
                        {t("powered_by") || "Powered By"}
                    </Heading>
                    <Flex justifyContent="center" gap="16px">
                        <Image
                            src="https://openrouter.ai/images/icons/DeepSeek.png"
                            alt="DeepSeekV3"
                            height="60px"
                        />
                        <Image
                            src="https://ai.google.dev/static/gemma/images/gemma3.png"
                            alt="Gemma3"
                            height="60px"
                        />
                    </Flex>
                </MotionBox>

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
        </Container>
    );
} 