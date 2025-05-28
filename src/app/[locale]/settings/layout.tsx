"use client";

import React from "react";
import {
    Box,
    Heading,
    Flex,
    Icon,
    Container,
    VStack,
} from "@chakra-ui/react";
import { useTranslations } from "next-intl";
import { useSession } from "next-auth/react";
import { FaCog, FaUserCircle, FaTrash } from "react-icons/fa";
import { FiBookOpen, FiServer } from "react-icons/fi";
import { motion } from "framer-motion";
import { useSelector } from 'react-redux';
import { RootState } from "@/store/store";
import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import { useColorModeValue } from "@/components/ui/color-mode";
// Create motion components
const MotionBox = motion.create(Box);
const MotionFlex = motion.create(Flex);
const MotionVStack = motion.create(VStack);

export default function SettingsLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const t = useTranslations("Settings");
    const { isOwner, isAuthenticated } = useSelector((state: RootState) => state.user);
    const pathname = usePathname();

    // Define custom colors using useColorModeValue for dark mode support
    const bgColor = useColorModeValue("bg.subtle", "gray.800");
    const borderColor = useColorModeValue("gray.200", "gray.700");
    const hoverBg = useColorModeValue("gray.50", "gray.700");
    const textColor = useColorModeValue("gray.800", "gray.100");
    const cardBg = useColorModeValue("white", "gray.800");
    const accentColor = "blue.500";
    const activeHighlight = useColorModeValue("blue.200", "blue.700");
    const activeBorderColor = "blue.500";

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

    // Navigation items with categories
    const navItems = [
        {
            category: "general",
            items: [
                {
                    icon: FaUserCircle,
                    label: t("general"),
                    path: "/settings",
                    visible: true,
                    color: undefined
                }
            ]
        },
        {
            category: "danger",
            items: [
                {
                    icon: FaTrash,
                    label: t("danger_zone"),
                    path: "/settings/danger_zone",
                    visible: isAuthenticated && isOwner,
                    color: "red.500"
                }
            ]
        }
    ];

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
                    <Heading size="lg" mb={6} display="flex" alignItems="center" color={textColor}>
                        <Icon as={FaCog} mr={3} color={accentColor} />
                        {t("settings")}
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
                        align="stretch"
                        height="fit-content"
                        variants={itemVariants}
                        gap={4}
                    >
                        {navItems.map((category, idx) => (
                            <Box key={category.category}>
                                {/* Category title */}
                                <Box
                                    px={4}
                                    mb={2}
                                    fontWeight="bold"
                                    fontSize="xs"
                                    textTransform="uppercase"
                                    color={useColorModeValue("gray.500", "gray.400")}
                                >
                                    {t(category.category)}
                                </Box>

                                {/* Category items */}
                                <VStack align="stretch" gap={1}>
                                    {category.items.filter(item => item.visible).map((item) => (
                                        <motion.div key={item.path} variants={tabVariants}>
                                            <Link href={item.path} passHref>
                                                <Box
                                                    py={3}
                                                    px={4}
                                                    borderRadius="md"
                                                    bg={pathname === item.path ? activeHighlight : "transparent"}
                                                    color={item.color || (pathname === item.path ? accentColor : textColor)}
                                                    fontWeight={pathname === item.path ? "semibold" : "medium"}
                                                    fontSize="sm"
                                                    width="100%"
                                                    textAlign="left"
                                                    _hover={{ bg: hoverBg }}
                                                    display="block"
                                                    borderLeft={pathname === item.path ? "3px solid" : "none"}
                                                    borderLeftColor={activeBorderColor}
                                                >
                                                    <Flex align="center">
                                                        <Icon
                                                            as={item.icon}
                                                            color={item.color || (pathname === item.path ? accentColor : textColor)}
                                                            mr={2}
                                                        />
                                                        {item.label}
                                                    </Flex>
                                                </Box>
                                            </Link>
                                        </motion.div>
                                    ))}
                                </VStack>

                                {/* Add separator if not the last category */}
                                {idx < navItems.length - 1 && (
                                    <Box
                                        height="1px"
                                        bg={borderColor}
                                        my={3}
                                        width="90%"
                                        mx="auto"
                                    />
                                )}
                            </Box>
                        ))}
                    </MotionVStack>

                    {/* Main content */}
                    <MotionBox
                        flex={1}
                        bg={cardBg}
                        borderRadius="md"
                        borderWidth="1px"
                        borderColor={borderColor}
                        p={6}
                        boxShadow="sm"
                        variants={itemVariants}
                        overflow="auto"
                    >
                        {children}
                    </MotionBox>
                </MotionFlex>
            </MotionBox>
        </Container>
    );
}