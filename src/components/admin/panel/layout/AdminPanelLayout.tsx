"use client";

import React from "react";
import { Box, Heading, Flex, Icon, Container } from "@chakra-ui/react";
import { motion } from "framer-motion";
import { IconType } from "react-icons";

// Create motion components
const MotionBox = motion.create(Box);
const MotionFlex = motion.create(Flex);
const MotionVStack = motion.create(Box);

interface TabItem {
    icon: IconType;
    label: string;
    id: number;
}

interface AdminPanelLayoutProps {
    title: string;
    titleIcon: IconType;
    tabItems: TabItem[];
    activeTab: number;
    setActiveTab: (id: number) => void;
    children: React.ReactNode;
    textColorHeading: string;
    textColor: string;
    hoverBg: string;
}

export default function AdminPanelLayout({
    title,
    titleIcon,
    tabItems,
    activeTab,
    setActiveTab,
    children,
    textColorHeading,
    textColor,
    hoverBg,
}: AdminPanelLayoutProps) {
    // Animation variants
    const containerVariants = {
        hidden: { opacity: 0 },
        visible: {
            opacity: 1,
            transition: {
                duration: 0.4,
                when: "beforeChildren",
                staggerChildren: 0.1,
            },
        },
    };

    const itemVariants = {
        hidden: { opacity: 0, y: 20 },
        visible: { opacity: 1, y: 0, transition: { duration: 0.3 } },
    };

    const tabVariants = {
        hidden: { opacity: 0, x: -20 },
        visible: { opacity: 1, x: 0, transition: { duration: 0.3 } },
    };

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
                initial="hidden"
                animate="visible"
                variants={containerVariants}
                display="flex"
                flexDirection="column"
                overflow="hidden"
                position="relative"
            >
                <MotionBox variants={itemVariants}>
                    <Heading size="lg" mb={6} display="flex" alignItems="center" color={textColorHeading}>
                        <Icon as={titleIcon} mr={3} color="blue.500" />
                        {title}
                    </Heading>
                </MotionBox>

                <MotionFlex
                    direction={{ base: "column", md: "row" }}
                    gap={6}
                    variants={itemVariants}
                    height="calc(100% - 60px)"
                    overflow="hidden"
                >
                    {/* Left sidebar */}
                    <MotionVStack
                        width={{ base: "100%", md: "250px" }}
                        display="flex"
                        flexDirection="column"
                        height="fit-content"
                        variants={itemVariants}
                    >
                        {tabItems.map((item) => (
                            <motion.div key={item.id} variants={tabVariants}>
                                <Box
                                    as="button"
                                    py={3}
                                    px={4}
                                    borderRadius="md"
                                    bg={activeTab === item.id ? hoverBg : "transparent"}
                                    color={textColor}
                                    fontWeight="medium"
                                    fontSize="sm"
                                    width="100%"
                                    textAlign="left"
                                    _hover={{ bg: hoverBg }}
                                    _active={{ bg: activeTab === item.id ? hoverBg : "gray.100" }}
                                    onClick={() => setActiveTab(item.id)}
                                >
                                    <Flex align="center">
                                        <Icon as={item.icon} color={textColor} mr={2} />
                                        {item.label}
                                    </Flex>
                                </Box>
                            </motion.div>
                        ))}
                    </MotionVStack>

                    {/* Main content */}
                    <MotionBox flex={1} variants={itemVariants} overflow="hidden" height="100%">
                        {children}
                    </MotionBox>
                </MotionFlex>
            </MotionBox>
        </Container>
    );
} 