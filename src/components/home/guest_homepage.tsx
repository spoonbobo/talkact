"use client";

import React from "react";
import { Box, Container, Flex, Heading, Icon, Text, SimpleGrid, Image, Avatar } from "@chakra-ui/react";
import { motion } from "framer-motion";
import { FiMessageSquare } from "react-icons/fi";
import { FaBook, FaTasks, FaQuoteLeft } from "react-icons/fa";
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

    // Add testimonials data
    const testimonials = [
        // {
        //     id: "testimonial1",
        //     name: "Sarah Johnson",
        //     role: "AI Engineer",
        //     company: "TechCorp",
        //     content: t("testimonial_1") || "MCP has revolutionized how we build context-aware AI applications. The standardized protocol saves us countless development hours.",
        //     avatar: "https://randomuser.me/api/portraits/women/44.jpg"
        // },
        // {
        //     id: "testimonial2",
        //     name: "Michael Chen",
        //     role: "CTO",
        //     company: "AI Innovations",
        //     content: t("testimonial_2") || "Implementing MCP into our workflow has improved our AI models' performance by 40%. The context handling is simply unmatched.",
        //     avatar: "https://randomuser.me/api/portraits/men/32.jpg"
        // },
        // {
        //     id: "testimonial3",
        //     name: "Elena Rodriguez",
        //     role: "Product Manager",
        //     company: "DataSense",
        //     content: t("testimonial_3") || "Our team was able to integrate MCP in just days. The documentation is excellent and the community support is outstanding.",
        //     avatar: "https://randomuser.me/api/portraits/women/68.jpg"
        // }
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
                        <MotionBox
                            initial={{ opacity: 0, scale: 0.8, rotate: -5 }}
                            animate={{ opacity: 1, scale: 1, rotate: 0 }}
                            transition={{
                                delay: 0.3,
                                duration: 0.5,
                                type: "spring",
                                stiffness: 100
                            }}
                            whileHover={{
                                scale: 1.05,
                                rotate: 2,
                                transition: { duration: 0.2 }
                            }}
                        >
                            <Image
                                src="https://openrouter.ai/images/icons/DeepSeek.png"
                                alt="DeepSeekV3"
                                height="60px"
                            />
                        </MotionBox>
                        <MotionBox
                            initial={{ opacity: 0, scale: 0.8, rotate: 5 }}
                            animate={{ opacity: 1, scale: 1, rotate: 0 }}
                            transition={{
                                delay: 0.4,
                                duration: 0.5,
                                type: "spring",
                                stiffness: 100
                            }}
                            whileHover={{
                                scale: 1.05,
                                rotate: -2,
                                transition: { duration: 0.2 }
                            }}
                        >
                            <Image
                                src="https://ai.google.dev/static/gemma/images/gemma3.png"
                                alt="Gemma3"
                                height="60px"
                            />
                        </MotionBox>
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

                {/* Testimonials Section */}
                <MotionBox
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3, duration: 0.3 }}
                    marginBottom={16}
                >
                    <Heading as="h2" size="lg" marginBottom={8} color={textColor} textAlign="center">
                        {t("trusted_by") || "Trusted By Users"}
                    </Heading>
                    <Flex
                        direction={{ base: "column", md: "row" }}
                        gap={6}
                        justifyContent="center"
                        overflowX={{ base: "visible", md: "auto" }}
                        pb={2}
                        css={{
                            "&::-webkit-scrollbar": {
                                height: "8px",
                            },
                            "&::-webkit-scrollbar-track": {
                                background: "transparent",
                            },
                            "&::-webkit-scrollbar-thumb": {
                                background: dividerColor,
                                borderRadius: "4px",
                            },
                        }}
                    >
                        {testimonials.map((testimonial, index) => (
                            <MotionBox
                                key={testimonial.id}
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.1 * (index + 1), duration: 0.3 }}
                                bg={cardBgColor}
                                p={5}
                                borderRadius="lg"
                                boxShadow="sm"
                                border="1px solid"
                                borderColor={cardBorderColor}
                                minWidth={{ base: "100%", md: "300px" }}
                                maxWidth={{ base: "100%", md: "350px" }}
                                flex="1"
                                position="relative"
                                _hover={{
                                    transform: "translateY(-3px)",
                                    boxShadow: "md",
                                    transition: "all 0.2s ease"
                                }}
                            >
                                <Icon
                                    as={FaQuoteLeft}
                                    position="absolute"
                                    top={3}
                                    right={3}
                                    color="gray.200"
                                    fontSize="xl"
                                />

                                <Text
                                    color={textColor}
                                    fontSize="md"
                                    fontStyle="italic"
                                    mb={4}
                                    lineHeight="1.6"
                                >
                                    "{testimonial.content}"
                                </Text>

                                <Flex align="center">
                                    {/* <Avatar
                                        src={testimonial.avatar}
                                        name={testimonial.name}
                                        size="sm"
                                        mr={3}
                                    /> */}
                                    <Box>
                                        <Text
                                            color={textColor}
                                            fontWeight="medium"
                                            fontSize="sm"
                                        >
                                            {testimonial.name}
                                        </Text>
                                        <Text
                                            color={textColorSecondary}
                                            fontSize="xs"
                                        >
                                            {testimonial.role}, {testimonial.company}
                                        </Text>
                                    </Box>
                                </Flex>
                            </MotionBox>
                        ))}
                    </Flex>
                </MotionBox>

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