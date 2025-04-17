"use client";

import React from "react";
import { Box, Icon, Tabs, Container, Heading } from "@chakra-ui/react";
import { motion } from "framer-motion";
import { FiServer, FiBook } from "react-icons/fi";
import { FaBookOpen } from "react-icons/fa";
import { useTranslations } from "next-intl";
// import { useSession } from "next-auth/react";
// import Loading from "@/components/loading";
import { useColorModeValue } from "@/components/ui/color-mode";
import { KnowledgeBase } from "@/components/learn/knowledge_base";
import { MCPResourceExplorer } from "@/components/learn/mcp_explorer";
import { useSelector } from "react-redux";
import { RootState } from "@/store/store";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

const MotionBox = motion.create(Box);

export default function LearnPage() {
  const { isAuthenticated } = useSelector((state: RootState) => state.user);
  const router = useRouter();

  useEffect(() => {
    if (!isAuthenticated) {
      router.push("/signin");
    }
  }, [isAuthenticated, router]);

  if (!isAuthenticated) {
    return null;
  }

  return <LearnPageContent />;
}

function LearnPageContent() {
  const t = useTranslations("Learn");

  // Dark mode adaptive colors
  const textColorHeading = useColorModeValue("gray.800", "gray.100");
  const bgSubtle = useColorModeValue("white", "gray.800");
  const borderColor = useColorModeValue("gray.200", "gray.700");
  const scrollbarColor = useColorModeValue("rgba(0,0,0,0.1)", "rgba(255,255,255,0.1)");
  const tabContentBg = useColorModeValue("white", "gray.800");

  // Define tabs with placeholder components
  const tabsToRender = [
    {
      id: "kb",
      label: t("knowledge_base"),
      icon: FaBookOpen,
      component: <KnowledgeBase />,
    },
    {
      id: "mcp",
      label: t("mcp_explorer"),
      icon: FiServer,
      component: <MCPResourceExplorer />,
    },
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
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5 }}
        display="flex"
        flexDirection="column"
        overflow="hidden"
        position="relative"
      >
        <Heading size="lg" mb={6} display="flex" alignItems="center" color={textColorHeading}>
          <Icon as={FiBook} mr={3} color="blue.500" />
          {t("learn")}
        </Heading>

        <Tabs.Root
          defaultValue="kb"
          variant="line"
          style={{
            display: "flex",
            flexDirection: "column",
            height: "calc(100% - 80px)",
            overflow: "hidden",
          }}
        >
          <Tabs.List>
            {tabsToRender.map((tab) => (
              <Tabs.Trigger key={tab.id} value={tab.id}>
                <Icon as={tab.icon} mr={2} />
                {tab.label}
              </Tabs.Trigger>
            ))}
          </Tabs.List>

          <Box
            flex="1"
            position="relative"
            overflow="hidden"
            width="100%"
            bg={bgSubtle}
            borderWidth="1px"
            borderColor={borderColor}
            borderRadius="md"
            mt={2}
          >
            {tabsToRender.map((tab) => (
              <Tabs.Content
                key={tab.id}
                value={tab.id}
                style={{
                  position: "absolute",
                  top: 0,
                  left: 0,
                  right: 0,
                  bottom: 0,
                  padding: "8px 0",
                  overflowY: "auto",
                  overflowX: "hidden",
                  height: "100%",
                  width:
                    "calc(100% - 6px)" /* Subtract scrollbar width to prevent layout shift */,
                  scrollbarWidth: "thin",
                  scrollbarColor: `${scrollbarColor} transparent`,
                  msOverflowStyle: "-ms-autohiding-scrollbar",
                  background: tabContentBg,
                }}
              >
                {tab.component}
              </Tabs.Content>
            ))}
          </Box>
        </Tabs.Root>
      </MotionBox>
    </Container>
  );
}
