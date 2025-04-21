"use client";

import { useTranslations } from "next-intl";
import { useSession } from "next-auth/react";
import { useSelector } from 'react-redux';
import { RootState } from "@/store/store";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
    Box,
    Heading,
    Icon,
    Text,
    VStack,
    Flex,
    Center,
    Button,
    HStack,
    Badge,
} from "@chakra-ui/react";
import { FaDiagramProject, FaPlay, FaPlus, FaCode } from "react-icons/fa6";
import { FiActivity, FiSettings } from "react-icons/fi";
import { useColorModeValue } from "@/components/ui/color-mode";

const MotionBox = motion(Box);

export default function WorkflowPage() {
    const { data: session } = useSession();
    const t = useTranslations("Workbench");
    const router = useRouter();
    const { currentUser, isAuthenticated, isLoading, isOwner } = useSelector(
        (state: RootState) => state.user
    );

    // Color mode values
    const textColorHeading = useColorModeValue("gray.800", "gray.100");
    const textColor = useColorModeValue("gray.600", "gray.400");
    const bgColor = useColorModeValue("white", "gray.800");
    const borderColor = useColorModeValue("gray.200", "gray.700");
    const cardBg = useColorModeValue("gray.50", "gray.700");
    const highlightBg = useColorModeValue("blue.50", "blue.900");
    const highlightColor = useColorModeValue("blue.700", "blue.200");

    // Use useEffect for navigation instead of doing it during render
    useEffect(() => {
        if (currentUser && !isOwner) {
            router.push('/redirect/no_access?reason=Not available for UAT');
        }
    }, [currentUser, isOwner, router]);

    // Sample workflow data
    const workflows = [
        { id: 1, name: "Data Processing", status: "active", lastRun: "2 hours ago" },
        { id: 2, name: "Content Generation", status: "idle", lastRun: "1 day ago" },
        { id: 3, name: "Image Analysis", status: "draft", lastRun: "Never" }
    ];

    return (
        <Box width="100%" height="100%" overflow="hidden" display="flex" flexDirection="column">
            <Heading size="md" mb={6} color={textColorHeading}>
                <Flex align="center">
                    <Icon as={FaDiagramProject} mr={3} color="blue.500" />
                    {t("workflow")}
                </Flex>
            </Heading>

            <Flex width="100%" height="calc(100% - 50px)" gap={4}>
                {/* Workflow list sidebar */}
                <Box
                    width="300px"
                    bg={cardBg}
                    borderRadius="md"
                    p={4}
                    borderWidth="1px"
                    borderColor={borderColor}
                    height="100%"
                    overflowY="auto"
                >
                    <VStack align="stretch" gap={3}>
                        <Flex justify="space-between" align="center">
                            <Text fontWeight="bold" color={textColorHeading}>
                                {t("my_workflows")}
                            </Text>
                            <Button size="sm" colorScheme="blue">
                                {t("new")}
                            </Button>
                        </Flex>


                        {workflows.map(workflow => (
                            <Box
                                key={workflow.id}
                                p={3}
                                borderRadius="md"
                                bg={workflow.id === 1 ? highlightBg : "transparent"}
                                color={workflow.id === 1 ? highlightColor : textColor}
                                borderWidth="1px"
                                borderColor={workflow.id === 1 ? "blue.300" : borderColor}
                                _hover={{ bg: workflow.id === 1 ? highlightBg : cardBg }}
                                cursor="pointer"
                            >
                                <Flex justify="space-between" align="center" mb={2}>
                                    <Flex align="center">
                                        <Icon as={FiActivity} mr={2} />
                                        <Text fontWeight="medium">{workflow.name}</Text>
                                    </Flex>
                                    <Badge
                                        colorScheme={
                                            workflow.status === "active" ? "green" :
                                                workflow.status === "idle" ? "yellow" : "gray"
                                        }
                                    >
                                        {workflow.status}
                                    </Badge>
                                </Flex>
                                <Text fontSize="xs" color={workflow.id === 1 ? highlightColor : textColor}>
                                    {t("last_run")}: {workflow.lastRun}
                                </Text>
                            </Box>
                        ))}
                    </VStack>
                </Box>

                {/* Main content area */}
                <Box
                    flex="1"
                    bg={bgColor}
                    borderRadius="md"
                    p={6}
                    borderWidth="1px"
                    borderColor={borderColor}
                    height="100%"
                    overflowY="auto"
                >
                    {workflows.length > 0 ? (
                        <VStack align="stretch" gap={6}>
                            <Flex justify="space-between" align="center">
                                <Heading size="md" color={textColorHeading}>Data Processing</Heading>
                                <HStack>
                                    <Button size="sm" variant="outline">
                                        {t("configure")}
                                    </Button>
                                    <Button size="sm" colorScheme="green">
                                        {t("run")}
                                    </Button>
                                </HStack>
                            </Flex>


                            <Box>
                                <Text fontWeight="medium" mb={2} color={textColorHeading}>
                                    {t("workflow_description")}
                                </Text>
                                <Text color={textColor}>
                                    This workflow processes data from multiple sources, cleans it, and prepares it for analysis.
                                    It runs automatically every 6 hours or can be triggered manually.
                                </Text>
                            </Box>

                            <Box>
                                <Text fontWeight="medium" mb={3} color={textColorHeading}>
                                    {t("workflow_steps")}
                                </Text>

                                <VStack align="stretch" gap={3}>
                                    {[1, 2, 3, 4].map(step => (
                                        <Flex
                                            key={step}
                                            p={3}
                                            borderRadius="md"
                                            borderWidth="1px"
                                            borderColor={borderColor}
                                            bg={cardBg}
                                            align="center"
                                        >
                                            <Flex
                                                justify="center"
                                                align="center"
                                                bg="blue.500"
                                                color="white"
                                                borderRadius="full"
                                                w="24px"
                                                h="24px"
                                                mr={3}
                                            >
                                                {step}
                                            </Flex>
                                            <Box flex="1">
                                                <Text fontWeight="medium" color={textColorHeading}>
                                                    {step === 1 ? "Data Collection" :
                                                        step === 2 ? "Data Cleaning" :
                                                            step === 3 ? "Data Transformation" : "Data Export"}
                                                </Text>
                                                <Text fontSize="sm" color={textColor}>
                                                    {step === 1 ? "Collect data from API endpoints" :
                                                        step === 2 ? "Remove duplicates and normalize values" :
                                                            step === 3 ? "Apply business rules and transformations" : "Export to database and notify users"}
                                                </Text>
                                            </Box>
                                            <Icon as={FaCode} color="blue.500" />
                                        </Flex>
                                    ))}
                                </VStack>
                            </Box>
                        </VStack>
                    ) : (
                        <Center height="100%" flexDirection="column" gap={4}>
                            <Icon as={FaDiagramProject} fontSize="6xl" color="blue.400" />
                            <Text fontSize="xl" fontWeight="bold" color={textColorHeading}>
                                {t("no_workflows")}
                            </Text>
                            <Text color={textColor} textAlign="center" maxW="md">
                                {t("workflow_description")}
                            </Text>
                            <Button colorScheme="blue" mt={4}>
                                {t("create_workflow")}
                            </Button>
                        </Center>
                    )}
                </Box>
            </Flex>
        </Box>
    );
}
