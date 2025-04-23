"use client";

import {
    Box,
    Container,
    Flex,
    Heading,
    Icon,
    Link,
    Text,
} from "@chakra-ui/react";
import { motion } from "framer-motion";
import { FaDiagramProject, FaFolderTree } from "react-icons/fa6";
import { FaBookOpen, FaTools } from "react-icons/fa";
import { useTranslations } from "next-intl";
import { useSelector, useDispatch } from 'react-redux';
import { RootState } from '@/store/store';
import { useRouter, usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import Loading from "@/components/loading";
import { useSession } from "next-auth/react";
import { useColorModeValue } from "@/components/ui/color-mode";
import { Global, css } from '@emotion/react';
import { setSidebarWidth } from '@/store/features/workbenchSlice';

const MotionBox = motion(Box);

export default function WorkbenchLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const t = useTranslations("Workbench");
    const { isAuthenticated, isLoading, isOwner } = useSelector((state: RootState) => state.user);
    const storedSidebarWidth = useSelector((state: RootState) =>
        state.workbench?.ui?.sidebarWidth || 300);
    const dispatch = useDispatch();
    const router = useRouter();
    const pathname = usePathname();
    const { data: session } = useSession();

    // Refs for resizable elements
    const sidebarRef = useRef<HTMLDivElement>(null);

    // State for resizing
    const [sidebarWidth, setSidebarWidthState] = useState(storedSidebarWidth);
    const [sidebarResizing, setSidebarResizing] = useState(false);
    const [resizeStartPosition, setResizeStartPosition] = useState(0);

    // Constants for min/max widths
    const MIN_SIDEBAR_WIDTH = 200;
    const MAX_SIDEBAR_WIDTH = 400;

    // Color mode values
    const textColorHeading = useColorModeValue("gray.800", "gray.100");
    const bgColor = useColorModeValue("gray.50", "gray.800");
    const borderColor = useColorModeValue("gray.200", "gray.700");
    const tabBg = useColorModeValue("white", "gray.700");
    const activeTabBg = useColorModeValue("blue.50", "blue.900");
    const activeTabColor = useColorModeValue("blue.600", "blue.200");
    const sidebarBg = useColorModeValue(
        "linear-gradient(to right, rgba(255, 255, 255, 0.9), rgba(255, 255, 255, 0.7))",
        "linear-gradient(to right, rgba(26, 32, 44, 0.9), rgba(26, 32, 44, 0.7))"
    );
    const mainBg = useColorModeValue("gray.50", "gray.800");
    const sidebarShadow = useColorModeValue("md", "dark-lg");

    // Sidebar navigation items
    const navItems = [
        {
            icon: FaFolderTree,
            label: t("file_explorer"),
            path: "/workbench/file_explorer",
        },
        // {
        //     icon: FaDiagramProject,
        //     label: t("workflow"),
        //     path: "/workbench/workflow",
        // },
        {
            icon: FaBookOpen,
            label: t("learn"),
            path: "/workbench/learn",
        },
    ];

    // Handle sidebar resize start
    const handleSidebarResizeStart = (e: React.MouseEvent) => {
        e.preventDefault();
        setSidebarResizing(true);
        setResizeStartPosition(e.clientX);
    };

    // Effect for sidebar resizing
    useEffect(() => {
        const handleMouseMove = (e: MouseEvent) => {
            if (sidebarResizing && sidebarRef.current) {
                const deltaX = e.clientX - resizeStartPosition;
                const newWidth = Math.max(
                    MIN_SIDEBAR_WIDTH,
                    Math.min(MAX_SIDEBAR_WIDTH, sidebarWidth + deltaX)
                );

                // Update local state
                setSidebarWidthState(newWidth);

                // Update DOM directly
                sidebarRef.current.style.width = `${newWidth}px`;

                setResizeStartPosition(e.clientX);
            }
        };

        const handleMouseUp = () => {
            setSidebarResizing(false);
            // Save to Redux when resize is complete
            try {
                dispatch(setSidebarWidth(sidebarWidth));
            } catch (error) {
                console.error("Failed to save sidebar width to Redux:", error);
            }
        };

        if (sidebarResizing) {
            document.addEventListener('mousemove', handleMouseMove);
            document.addEventListener('mouseup', handleMouseUp);
            document.body.style.userSelect = 'none';
        }

        return () => {
            document.removeEventListener('mousemove', handleMouseMove);
            document.removeEventListener('mouseup', handleMouseUp);
            document.body.style.userSelect = '';
        };
    }, [sidebarResizing, resizeStartPosition, sidebarWidth, dispatch]);

    // Use useEffect for navigation instead of doing it during render
    useEffect(() => {
        // if (!isLoading && !isOwner) {
        //     router.push('/redirect/no_access?reason=Not available for UAT');
        // }
    }, [isLoading, isOwner, router]);

    // Show loading state while checking authentication
    if (isLoading || !session) {
        return <Loading />;
    }

    // Redirect if not authenticated
    if (!isAuthenticated && !session) {
        return <Loading />; // Show loading instead of direct navigation
    }


    return (
        <>
            {/* Global styles to override parent constraints */}
            <Global
                styles={css`
                    body > div, 
                    #__next, 
                    #__next > div, 
                    main, 
                    main > div, 
                    main > div > div {
                        overflow: hidden !important;
                        max-width: none !important;
                        height: 100vh !important;
                    }
                    
                    .chakra-container {
                        max-width: none !important;
                        overflow: hidden !important;
                        padding: 0 !important;
                    }
                `}
            />

            <Container
                maxW="100vw"
                px={0}
                py={0}
                height="100vh"
                minW="100vw"
                position="relative"
                overflow="hidden"
            >
                <Flex
                    width="100%"
                    height="100%"
                    align="stretch"
                    bg={mainBg}
                    overflow="hidden"
                >
                    {/* Sidebar */}
                    <Box
                        ref={sidebarRef}
                        width={`${sidebarWidth}px`}
                        minWidth={`${sidebarWidth}px`}
                        bg="transparent"
                        boxShadow={sidebarShadow}
                        borderRightWidth="1px"
                        borderRightColor={borderColor}
                        py={{ base: 2, md: 3, lg: 4 }}
                        px={0}
                        display="flex"
                        flexDirection="column"
                        gap={4}
                        zIndex={2}
                        position="relative"
                        transition={sidebarResizing ? 'none' : 'width 0.2s'}
                        overflowY="auto"
                        overflowX="hidden"
                        height="100%"
                    >
                        <Box px={4} width="100%">
                            <Heading size="md" mb={8} display="flex" alignItems="center" color={textColorHeading}>
                                <Icon as={FaTools} mr={3} color="blue.500" fontSize="2xl" />
                                {t("workbench")}
                            </Heading>
                            {navItems.map((item) => (
                                <Link
                                    key={item.path}
                                    href={item.path}
                                    borderRadius="lg"
                                    py={4}
                                    px={4}
                                    bg={pathname === item.path ? activeTabBg : "transparent"}
                                    color={pathname === item.path ? activeTabColor : textColorHeading}
                                    fontWeight={pathname === item.path ? "bold" : "medium"}
                                    display="flex"
                                    alignItems="center"
                                    fontSize="lg"
                                    _hover={{ bg: activeTabBg, color: activeTabColor, textDecoration: "none" }}
                                    transition="background 0.2s, color 0.2s"
                                    boxShadow={pathname === item.path ? "sm" : undefined}
                                >
                                    <Icon as={item.icon} mr={4} fontSize="xl" />
                                    <Text>{item.label}</Text>
                                </Link>
                            ))}
                        </Box>
                        {/* Resize handle for sidebar */}
                        <Box
                            position="absolute"
                            top="0"
                            right="-4px"
                            width="8px"
                            height="100%"
                            cursor="col-resize"
                            onMouseDown={handleSidebarResizeStart}
                            _hover={{
                                bg: borderColor,
                                opacity: 0.5
                            }}
                            zIndex={2}
                        />
                    </Box>

                    {/* Main Content */}
                    <Box
                        flex="1"
                        height="100%"
                        p={0}
                        bg={mainBg}
                        display="flex"
                        flexDirection="column"
                        alignItems="flex-start"
                        justifyContent="flex-start"
                        pr={{ base: 8, md: 12, lg: 16 }}
                    >
                        <Box
                            width="calc(100% - 32px)"
                            bg={sidebarBg}
                            mt={{ base: 8, md: 12, lg: 16 }}
                            mb={{ base: 8, md: 12, lg: 16 }}
                            ml={{ base: 4, md: 6, lg: 8 }}
                            p={{ base: 3, md: 4, lg: 6 }}
                            minHeight="calc(100vh - 64px)"
                            height="auto"
                            display="flex"
                            flexDirection="column"
                            alignItems="center"
                            justifyContent="center"
                            backdropFilter="blur(10px)"
                        >
                            {children}
                        </Box>
                    </Box>
                </Flex>
            </Container>
        </>
    );
}
