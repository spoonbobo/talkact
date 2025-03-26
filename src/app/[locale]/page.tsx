"use client";

import React from "react";
import { Box, Container, Flex, Heading, Icon, Text, SimpleGrid } from "@chakra-ui/react";
import { motion } from "framer-motion";
import { FiHome, FiServer, FiBook, FiMessageSquare } from "react-icons/fi";
import { useTranslations } from "next-intl";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Loading from "@/components/loading";

const MotionBox = motion(Box);
const MotionFlex = motion(Flex);

export default function HomePage() {
  const t = useTranslations("Home");
  const { data: session } = useSession();
  const router = useRouter();

  if (!session) {
    return <Loading />;
  }

  // Navigation cards for main sections
  const navigationCards = [
    {
      id: "learn",
      title: t("learn_title"),
      description: t("learn_description"),
      icon: FiBook,
      color: "blue.500",
      path: "/learn",
    },
    {
      id: "tasks",
      title: t("tasks_title"),
      description: t("tasks_description"),
      icon: FiMessageSquare,
      color: "green.500",
      path: "/tasks",
    },
    {
      id: "mcp",
      title: t("mcp_title"),
      description: t("mcp_description"),
      icon: FiServer,
      color: "purple.500",
      path: "/mcp",
    },
  ];

  return (
    <Container maxW="1400px" px={{ base: 4, md: 6 }} py={6}>
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
          mb={8}
        >
          <Heading as="h1" size="lg" mb={2} display="flex" alignItems="center">
            <Icon as={FiHome} mr={3} color="blue.500" />
            {t("welcome")}
          </Heading>
          <Text color="gray.600">{t("welcome_message")}</Text>
        </MotionBox>

        {/* Navigation Cards */}
        <SimpleGrid 
          columns={{ base: 1, md: 2, xl: 3 }} 
          mb={8}
        >
          {navigationCards.map((card, index) => (
            <NavigationCard 
              key={card.id}
              card={card}
              index={index}
              onClick={() => router.push(card.path)}
            />
          ))}
        </SimpleGrid>
      </MotionBox>
    </Container>
  );
}

// Extracted card component for better organization
function NavigationCard({ card, index, onClick }: { card: any; index: any; onClick: any }) {
  return (
    <MotionFlex
      direction="column"
      bg="white"
      p={5}
      borderRadius="lg"
      boxShadow="sm"
      border="1px solid"
      borderColor="gray.100"
      cursor="pointer"
      height="100%"
      onClick={onClick}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.1 * (index + 1), duration: 0.3 }}
      _hover={{ 
        transform: "translateY(-3px)", 
        boxShadow: "md",
        borderColor: "gray.200",
        transition: "all 0.2s ease"
      }}
    >
      <Flex align="flex-start" mb={4}>
        <Box 
          p={2.5}
          borderRadius="md" 
          bg={`${card.color}10`} 
          color={card.color}
          mr={3}
          display="flex"
          alignItems="center"
          justifyContent="center"
        >
          <Icon as={card.icon} fontSize="xl" />
        </Box>
        <Heading size="md">{card.title}</Heading>
      </Flex>
      <Text color="gray.600" fontSize="sm" flex="1">
        {card.description}
      </Text>
    </MotionFlex>
  );
}
