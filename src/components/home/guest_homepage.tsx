"use client";

import React from "react";
import { Box, Container, Flex, Heading, Icon, Text, SimpleGrid, Image, Avatar } from "@chakra-ui/react";
import { motion } from "framer-motion";
import { FiMessageSquare } from "react-icons/fi";
import { FaBook, FaTasks, FaQuoteLeft } from "react-icons/fa";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";

const MotionBox = motion(Box);
const MotionFlex = motion(Flex);
const MotionHeading = motion(Heading);
const MotionText = motion(Text);

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
            id: "chatroom",
            title: t("chatroom_title") || "Chatroom",
            description: t("chatroom_description") || "Chat with your team and AI agents to create executable plans",
            icon: FiMessageSquare,
            color: "pink.500",
        },
        {
            id: "plans",
            title: t("plans_title") || "Plans",
            description: t("plans_description") || "Organizing and tracking tasks efficiently",
            icon: FaTasks,
            color: "green.500",
        },
        {
            id: "learn",
            title: t("learn_title") || "Learn",
            description: t("learn_description") || "Accessing resources and tutorials for skill development",
            icon: FaBook,
            color: "blue.500",
        },
        {
            id: "ai-assistant",
            title: t("ai_assistant_title") || "AI Assistant",
            description: t("ai_assistant_description") || "Answer questions based on growing knowledge, globally persisted across the app",
            icon: FaQuoteLeft,
            color: "teal.500",
        },
    ];

    // @ts-ignore
    const testimonials = [
        // do not add anything yet
    ];

    // Animation variants for consistent effects
    const fadeInUp = {
        hidden: { opacity: 0, y: 20 },
        visible: (i: number) => ({
            opacity: 1,
            y: 0,
            transition: {
                delay: 0.1 * i,
                duration: 0.5,
                ease: "easeOut"
            }
        })
    };

    return (
        <Box width="100%" overflowX="hidden" overflowY="visible">
            <Container
                maxWidth="1400px"
                paddingX={{ base: 4, md: 6 }}
                paddingY={6}
                position="relative"
            >
                <MotionBox
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.6 }}
                    width="100%"
                >
                    {/* Hero Section with Enhanced Visual Design */}
                    <MotionBox
                        initial={{ opacity: 0, y: 0 }}
                        animate={{ opacity: 1, y: 0 }}
                        position="relative"
                        borderRadius="2xl"
                        overflow="hidden"
                        mb={12}
                        p={{ base: 8, md: 12 }}
                        bg="white"
                        minHeight={{ base: "auto", md: "400px" }}
                        display="flex"
                        alignItems="center"
                        justifyContent="center"
                        boxShadow="none"
                        _before={{
                            content: '""',
                            position: "absolute",
                            top: 0,
                            left: 0,
                            right: 0,
                            bottom: 0,
                            borderRadius: "2xl",
                            padding: "2px",
                            background: "linear-gradient(45deg, rgba(138,43,226,0.5), rgba(0,191,255,0.5), rgba(138,43,226,0))",
                            mask: "linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)",
                            maskComposite: "exclude",
                            pointerEvents: "none"
                        }}
                        width="100%"
                    >
                        {/* Subtle pattern background */}
                        <Box
                            position="absolute"
                            top={0}
                            left={0}
                            right={0}
                            bottom={0}
                            opacity={0.08}
                            zIndex={0}
                            bgImage="url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciPjxkZWZzPjxwYXR0ZXJuIGlkPSJwYXR0ZXJuIiB4PSIwIiB5PSIwIiB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHBhdHRlcm5Vbml0cz0idXNlclNwYWNlT25Vc2UiIHBhdHRlcm5UcmFuc2Zvcm09InJvdGF0ZSgzMCkiPjxyZWN0IHg9IjAiIHk9IjAiIHdpZHRoPSIyMCIgaGVpZ2h0PSIyMCIgZmlsbD0iIzAwMCIgZmlsbC1vcGFjaXR5PSIwLjEiLz48L3BhdHRlcm4+PC9kZWZzPjxyZWN0IHdpZHRoPSIxMDAlIiBoZWlnaHQ9IjEwMCUiIGZpbGw9InVybCgjcGF0dGVybikiLz48L3N2Zz4=')"
                        />

                        {/* Animated particles with harmonized colors */}
                        <Box
                            position="absolute"
                            top={0}
                            left={0}
                            right={0}
                            bottom={0}
                            opacity={0.3}
                            zIndex={0}
                            overflow="hidden"
                        >
                            {[...Array(15)].map((_, i) => (
                                <Box
                                    key={i}
                                    position="absolute"
                                    borderRadius="full"
                                    bg={i % 3 === 0 ? "purple.100" : i % 3 === 1 ? "blue.100" : "cyan.100"}
                                    width={`${Math.random() * 8 + 4}px`}
                                    height={`${Math.random() * 8 + 4}px`}
                                    left={`${Math.random() * 100}%`}
                                    top={`${Math.random() * 100}%`}
                                    as={motion.div}
                                    transition={{
                                        duration: Math.random() * 5 + 3,
                                        repeat: Infinity,
                                        repeatType: "loop",
                                        delay: Math.random() * 2
                                    } as any}
                                />
                            ))}
                        </Box>

                        <MotionFlex
                            direction="column"
                            align="center"
                            position="relative"
                            zIndex={1}
                            maxWidth="800px"
                        >
                            <MotionHeading
                                as="h1"
                                size={{ base: "lg", md: "xl", lg: "2xl" }}
                                color="black"
                                textAlign="center"
                                mb={4}
                                initial={{ opacity: 0, y: -20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{
                                    duration: 0.5,
                                    ease: "easeOut"
                                } as any}
                                letterSpacing="tight"
                                fontWeight="extrabold"
                                lineHeight="1.2"
                            >
                                {t("guest_welcome") || "Welcome to MCP Platform"}
                            </MotionHeading>

                            <MotionText
                                color="gray.700"
                                fontSize={{ base: "md", md: "lg", lg: "xl" }}
                                maxWidth="700px"
                                textAlign="center"
                                mb={8}
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                transition={{
                                    duration: 0.5,
                                    ease: "easeOut"
                                } as any}
                                fontWeight="medium"
                                letterSpacing="wide"
                                lineHeight="1.6"
                            >
                                {t("guest_welcome_message") || "The open protocol that standardizes how applications provide context to LLMs"}
                            </MotionText>

                            {/* Button group with improved visibility */}
                            <Flex
                                gap={4}
                                flexDirection={{ base: "column", sm: "row" }}
                                as={motion.div}
                                transition={{
                                    duration: 0.5,
                                    ease: "easeOut"
                                } as any}
                            >
                                <MotionBox
                                    as="button"
                                    paddingX={8}
                                    paddingY={4}
                                    borderRadius="full"
                                    bg="purple.600"
                                    color="white"
                                    fontWeight="bold"
                                    fontSize="lg"
                                    boxShadow="0 4px 10px rgba(0,0,0,0.1)"
                                    _hover={{
                                        transform: "translateY(-2px)",
                                        bg: "purple.700",
                                        boxShadow: "0 6px 15px rgba(0,0,0,0.15)"
                                    }}
                                    onClick={() => router.push("/signin")}
                                    whileHover={{ scale: 1.05 }}
                                    whileTap={{ scale: 0.95 }}
                                    transition={{ duration: 0.2 }}
                                >
                                    {t("get_started") || "Get Started Now"}
                                </MotionBox>

                                <MotionBox
                                    as="button"
                                    paddingX={8}
                                    paddingY={4}
                                    borderRadius="full"
                                    bg="transparent"
                                    color="gray.700"
                                    fontWeight="bold"
                                    fontSize="lg"
                                    border="1px solid"
                                    borderColor="gray.300"
                                    _hover={{
                                        bg: "gray.50",
                                        transform: "translateY(-2px)",
                                        borderColor: "gray.400"
                                    }}
                                    // onClick={() => router.push("/learn-more")}
                                    whileHover={{ scale: 1.05 }}
                                    whileTap={{ scale: 0.95 }}
                                    transition={{ duration: 0.2 }}
                                >
                                    {t("learn_more") || "Learn More"}
                                </MotionBox>
                            </Flex>
                        </MotionFlex>
                    </MotionBox>

                    {/* Feature Cards with Harmonized Design */}
                    <Box marginBottom={16}>
                        <MotionHeading
                            as="h2"
                            size={{ base: "lg", md: "xl" }}
                            marginBottom={8}
                            color="black"
                            textAlign="center"
                            custom={2}
                            variants={fadeInUp}
                            initial="hidden"
                            animate="visible"
                            fontWeight="bold"
                        >
                            {t("guest_features_title") || "Why Choose MCP?"}
                        </MotionHeading>

                        <SimpleGrid columns={{ base: 1, md: 2, lg: 4 }} gap={{ base: "28px", md: "36px" }}>
                            {featureCards.map((card, index) => (
                                <MotionBox
                                    key={card.id}
                                    bg={cardBgColor}
                                    padding={8}
                                    borderRadius="xl"
                                    boxShadow="lg"
                                    border="1px solid"
                                    borderColor={cardBorderColor}
                                    height="100%"
                                    custom={index + 4}
                                    variants={fadeInUp}
                                    initial="hidden"
                                    animate="visible"
                                    whileHover={{
                                        y: -10,
                                        boxShadow: "2xl",
                                        borderColor: card.color,
                                        transition: { duration: 0.3 }
                                    }}
                                    position="relative"
                                    overflow="hidden"
                                >
                                    {/* Subtle background gradient */}
                                    <Box
                                        position="absolute"
                                        top={0}
                                        left={0}
                                        right={0}
                                        bottom={0}
                                        bgGradient={`linear(to-br, ${card.color}15, transparent)`}
                                        opacity={0.8}
                                        borderRadius="xl"
                                    />

                                    <Flex direction="column" height="100%" position="relative">
                                        <Flex align="center" marginBottom={5}>
                                            <Box
                                                padding={4}
                                                borderRadius="full"
                                                bg={`${card.color}20`}
                                                color={card.color}
                                                marginRight={4}
                                                display="flex"
                                                alignItems="center"
                                                justifyContent="center"
                                                boxShadow="0 4px 12px rgba(0,0,0,0.1)"
                                            >
                                                <Icon as={card.icon} fontSize="2xl" />
                                            </Box>
                                            <Heading size="md" color={textColor} fontWeight="bold">{card.title}</Heading>
                                        </Flex>
                                        <Text color={textColorSecondary} fontSize="md" flex="1">
                                            {card.description}
                                        </Text>
                                    </Flex>
                                </MotionBox>
                            ))}
                        </SimpleGrid>
                    </Box>

                    {/* Testimonials Section with Improved Design */}
                    <MotionBox
                        custom={8}
                        variants={fadeInUp}
                        initial="hidden"
                        animate="visible"
                        marginBottom={16}
                    >
                        <Heading
                            as="h2"
                            size={{ base: "lg", md: "xl" }}
                            marginBottom={8}
                            color="black"
                            textAlign="center"
                            fontWeight="bold"
                        >
                            {t("trusted_by") || "Trusted By Users"}
                        </Heading>

                        <Flex
                            direction={{ base: "column", md: "row" }}
                            gap={8}
                            justifyContent="center"
                            overflowX={{ base: "visible", md: "auto" }}
                            pb={4}
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
                            {/* @ts-ignore */}
                            {testimonials.map((testimonial, index) => (
                                <MotionBox
                                    key={testimonial.id}
                                    custom={index + 9}
                                    variants={fadeInUp}
                                    initial="hidden"
                                    animate="visible"
                                    bg={cardBgColor}
                                    p={8}
                                    borderRadius="xl"
                                    boxShadow="lg"
                                    border="1px solid"
                                    borderColor={cardBorderColor}
                                    minWidth={{ base: "100%", md: "320px" }}
                                    maxWidth={{ base: "100%", md: "380px" }}
                                    flex="1"
                                    position="relative"
                                    whileHover={{
                                        y: -8,
                                        boxShadow: "xl",
                                        borderColor: "purple.300",
                                    }}
                                >
                                    <Icon
                                        as={FaQuoteLeft}
                                        position="absolute"
                                        top={4}
                                        right={4}
                                        color="purple.200"
                                        fontSize="2xl"
                                    />

                                    <Text
                                        color={textColor}
                                        fontSize="md"
                                        fontStyle="italic"
                                        mb={5}
                                        lineHeight="1.7"
                                    >
                                        "{testimonial.content}"
                                    </Text>

                                    <Flex align="center">
                                        {/* <Avatar
                                            src={testimonial.avatar}
                                            name={testimonial.name}
                                            size="md"
                                            mr={4}
                                            border="2px solid"
                                            borderColor="purple.300"
                                        /> */}
                                        <Box>
                                            <Text
                                                color={textColor}
                                                fontWeight="bold"
                                                fontSize="md"
                                            >
                                                {testimonial.name}
                                            </Text>
                                            <Text
                                                color={textColorSecondary}
                                                fontSize="sm"
                                            >
                                                {testimonial.role}, {testimonial.company}
                                            </Text>
                                        </Box>
                                    </Flex>
                                </MotionBox>
                            ))}
                        </Flex>
                    </MotionBox>

                    {/* Footer info with animation - Made more compact */}
                    <MotionFlex
                        direction="column"
                        align="center"
                        custom={13}
                        variants={fadeInUp}
                        initial="hidden"
                        animate="visible"
                        mb={4}
                    >
                        <Text
                            textAlign="center"
                            fontSize="md"
                            color="gray.700"
                            marginTop={4}
                            fontWeight="medium"
                        >
                            {t("guest_footer") || "Making AI context standardization simple and powerful"}
                        </Text>
                    </MotionFlex>
                </MotionBox>
            </Container>
        </Box>
    );
} 