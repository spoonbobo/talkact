"use client";

import React from "react";
import { Box, Container, Flex, useBreakpointValue } from "@chakra-ui/react";
import Navbar from "@/components/navbar";
import Footer from "@/components/footer";

export default function AppLayout({
    children
}: {
    children: React.ReactNode;
}) {
    const [navExpanded, setNavExpanded] = React.useState(false);
    const isMobile = useBreakpointValue({ base: true, md: false });

    // Function to handle navbar expansion state
    const handleNavExpansion = (expanded: boolean) => {
        setNavExpanded(expanded);
    };

    return (
        <Flex
            direction={{ base: "column", md: "row" }}
            minH="100vh"
            position="relative"
            bg="bg.subtle"
        >
            {/* Navbar component */}
            <Navbar onExpansionChange={handleNavExpansion} />

            {/* Main content area */}
            <Flex
                direction="column"
                flex="1"
                marginLeft={{ base: 0, md: "60px" }} // Fixed margin based on collapsed navbar width
                marginTop={{ base: "60px", md: 0 }} // Add top margin on mobile
                transition="margin-left 0.4s cubic-bezier(0.22, 1, 0.36, 1), margin-top 0.4s cubic-bezier(0.22, 1, 0.36, 1)"
                position="relative"
                minH={{ base: "calc(100vh - 60px)", md: "100vh" }}
            >
                {/* Overlay for when navbar is expanded */}
                <Box
                    position="fixed"
                    top={{ base: "60px", md: 0 }}
                    left={{ base: 0, md: "60px" }}
                    right={0}
                    bottom={0}
                    background={{
                        base: "linear-gradient(to right, rgba(255, 255, 255, 0.08), rgba(255, 255, 255, 0.02) 50%)",
                        _dark: "linear-gradient(to right, rgba(30, 30, 30, 0.3), rgba(15, 15, 15, 0.1) 50%)"
                    }}
                    backdropFilter={navExpanded ? "blur(12px)" : "blur(0px)"}
                    zIndex="5"
                    pointerEvents="none"
                    opacity={navExpanded ? 1 : 0}
                    transform={navExpanded ? "translateX(0)" : "translateX(-10px)"}
                    transition="opacity 0.4s ease, transform 0.4s ease, backdrop-filter 0.4s ease"
                />

                {/* Content container */}
                <Box
                    as="main"
                    flex="1"
                    overflow="auto"
                    position="relative"
                    zIndex="1"
                    maxH={{ base: "calc(100vh - 120px)", md: "calc(100vh - 60px)" }}
                >
                    <Container
                        maxW="container.xl"
                        py={4}
                        height="100%"
                        display="flex"
                        flexDirection="column"
                    >
                        {children}
                    </Container>
                </Box>

                {/* Footer positioned at the bottom of the content area */}
                <Footer />
            </Flex>
        </Flex>
    );
} 