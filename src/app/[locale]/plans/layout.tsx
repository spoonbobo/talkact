"use client";

import { useTranslations } from "next-intl";
import { useSession } from "next-auth/react";
import Loading from "@/components/loading";
import { useSelector, useDispatch } from 'react-redux';
import { RootState, AppDispatch } from "@/store/store";
import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { motion } from "framer-motion";
import { Box, Heading, Icon, Container, Text, VStack, Flex, Spinner, Badge, Input, HStack, Button, IconButton } from "@chakra-ui/react";
import { FaTasks, FaSearch } from "react-icons/fa";
import { FiChevronRight, FiChevronLeft } from "react-icons/fi";
import { fetchPlans } from "@/store/features/planSlice";
import { usePlansColors } from "@/utils/colors";
import Link from "next/link";
import { IPlan, PlanStatus } from "@/types/plan";
import StatusBadge, { getStatusColorScheme } from "@/components/ui/StatusBadge";

const MotionBox = motion(Box);

// Use typed dispatch
const useAppDispatch = () => useDispatch<AppDispatch>();

// Format date for display
const formatDate = (date: Date | null): string => {
    if (!date) return 'N/A';
    return new Date(date).toLocaleString(undefined, {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
};

export default function PlansLayout({ children }: { children: React.ReactNode }) {
    const t = useTranslations("Plans");
    const router = useRouter();
    const pathname = usePathname();
    const { data: session } = useSession();
    const dispatch = useAppDispatch();

    const { isAuthenticated, isLoading: userLoading, isOwner } = useSelector(
        (state: RootState) => state.user
    );

    const { plans, loading } = useSelector(
        (state: RootState) => state.plan
    );

    const colors = usePlansColors();

    // Add state for search, filter, and pagination
    const [searchQuery, setSearchQuery] = useState("");
    const [statusFilter, setStatusFilter] = useState<PlanStatus | "all">("all");
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 10; // Number of plans per page

    // Fetch plans on component mount
    useEffect(() => {
        if (isAuthenticated && isOwner) {
            console.log("Fetching plans...");
            dispatch(fetchPlans());
        }
    }, [isAuthenticated, isOwner, dispatch]);

    // Reset to first page when filters change
    useEffect(() => {
        setCurrentPage(1);
    }, [searchQuery, statusFilter]);

    // Show loading state while checking authentication
    if (userLoading || !session) {
        return <Loading />;
    }

    // Redirect if not authenticated
    if (!isAuthenticated && !session) {
        return <Loading />; // Show loading instead of direct navigation
    }

    // Add a check to not render the content if not owner
    if (!isOwner) {
        return <Loading />;
    }

    // Extract the current plan ID from the pathname
    const currentPlanId = pathname.split('/').pop();
    const isDetailView = pathname !== '/plans' && pathname !== '/plans/';

    // Filter plans based on search query and status filter
    const filteredPlans = plans
        .filter((plan: any) => {
            const matchesSearch = plan.plan_overview.toLowerCase().includes(searchQuery.toLowerCase());
            const matchesStatus = statusFilter === "all" || plan.status === statusFilter;
            return matchesSearch && matchesStatus;
        })
        .sort((a: any, b: any) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime());

    // Calculate pagination
    const totalPages = Math.ceil(filteredPlans.length / itemsPerPage);
    const paginatedPlans = filteredPlans.slice(
        (currentPage - 1) * itemsPerPage,
        currentPage * itemsPerPage
    );

    // Status filter options with their respective colors
    const statusOptions: Array<{ value: PlanStatus | "all", label: string }> = [
        { value: "all", label: "All" },
        { value: "pending", label: "Pending" },
        { value: "running", label: "Running" },
        { value: "success", label: "Success" },
        { value: "failure", label: "Failure" },
        { value: "terminated", label: "Terminated" }
    ];

    return (
        <Container
            maxW="1400px"
            px={{ base: 4, md: 6, lg: 8 }}
            py={4}
            height="calc(100% - 10px)"
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
                <Heading size="lg" mb={6} display="flex" alignItems="center" color={colors.textColorHeading}>
                    <Icon as={FaTasks} mr={3} color={colors.accentColor} />
                    {t("plans")}
                </Heading>

                <Flex
                    bg={colors.cardBg}
                    borderRadius="lg"
                    boxShadow="sm"
                    height="calc(100vh - 160px)"
                    borderWidth="1px"
                    borderColor={colors.borderColor}
                    overflow="hidden"
                >
                    {/* Sidebar with plans list */}
                    <Box
                        width="300px"
                        borderRightWidth="1px"
                        borderRightColor={colors.borderColor}
                        overflowY="auto"
                        p={4}
                        display="flex"
                        flexDirection="column"
                    >
                        <Text fontSize="lg" fontWeight="bold" mb={4}>
                            {t("available_plans")} {plans.length > 0 && `(${plans.length})`}
                        </Text>

                        {/* Search bar with Chakra UI v3 syntax */}
                        <Flex position="relative" mb={3}>
                            <Box position="absolute" left={3} top="50%" transform="translateY(-50%)" zIndex={1}>
                                <Icon as={FaSearch} color={colors.textColorMuted} />
                            </Box>
                            <Input
                                placeholder={t("search_plans")}
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                borderColor={colors.borderColor}
                                _focus={{ borderColor: colors.accentColor }}
                                pl={10}
                                size="sm"
                            />
                        </Flex>

                        {/* Status filter */}
                        <Box mb={4} overflowX="auto">
                            <HStack gap={2} py={1}>
                                {statusOptions.map(option => (
                                    <Button
                                        key={option.value}
                                        size="xs"
                                        variant={statusFilter === option.value ? "solid" : "outline"}
                                        onClick={() => setStatusFilter(option.value)}
                                        colorScheme={option.value !== "all" ? getStatusColorScheme(option.value as PlanStatus) : "gray"}
                                        bg={statusFilter === option.value ? undefined : "transparent"}
                                        borderWidth={1}
                                        borderRadius="full"
                                        px={3}
                                        minW="auto"
                                    >
                                        {option.value !== "all" ? (
                                            <Flex align="center" gap={1}>
                                                <Box
                                                    w={2}
                                                    h={2}
                                                    borderRadius="full"
                                                    bg={`${getStatusColorScheme(option.value as PlanStatus)}.500`}
                                                />
                                                {t(option.value)}
                                            </Flex>
                                        ) : t(option.label)}
                                    </Button>
                                ))}
                            </HStack>
                        </Box>

                        {loading.plans ? (
                            <VStack py={8}>
                                <Spinner size="md" color={colors.accentColor} mb={2} />
                                <Text fontSize="sm">{t("loading_plans")}</Text>
                            </VStack>
                        ) : filteredPlans.length > 0 ? (
                            <VStack align="stretch" gap={3} flex="1">
                                {paginatedPlans.map((plan: any) => {
                                    // Convert string dates to Date objects
                                    const typedPlan: IPlan = {
                                        ...plan,
                                        created_at: plan.created_at ? new Date(plan.created_at) : new Date(),
                                        updated_at: plan.updated_at ? new Date(plan.updated_at) : new Date(),
                                        completed_at: plan.completed_at ? new Date(plan.completed_at) : null
                                    };

                                    return (
                                        <Link
                                            href={`/plans/${typedPlan.id}`}
                                            key={typedPlan.id}
                                            style={{ textDecoration: 'none' }}
                                        >
                                            <Box
                                                p={3}
                                                borderWidth="1px"
                                                borderRadius="md"
                                                borderColor={currentPlanId === typedPlan.id ? colors.accentColor : colors.borderColor}
                                                bg={currentPlanId === typedPlan.id ? `${colors.accentColor}15` : colors.cardBg}
                                                cursor="pointer"
                                                _hover={{
                                                    boxShadow: "sm",
                                                    borderColor: colors.accentColor,
                                                    bg: currentPlanId === typedPlan.id ? `${colors.accentColor}20` : colors.hoverBg
                                                }}
                                                transition="all 0.2s"
                                            >
                                                <Flex justify="space-between" align="center" mb={1}>
                                                    <Text fontWeight="bold" fontSize="md" lineClamp={1}>
                                                        {typedPlan.plan_name.substring(0, 30)}
                                                        {typedPlan.plan_name.length > 30 ? '...' : ''}
                                                    </Text>
                                                    <StatusBadge status={typedPlan.status} size="sm" />
                                                </Flex>
                                                <Flex justify="space-between" align="center">
                                                    <Text fontSize="xs" color={colors.textColorMuted}>
                                                        {t("progress")}: {typedPlan.progress}%
                                                    </Text>
                                                    <Text fontSize="xs" color={colors.textColorMuted}>
                                                        {formatDate(typedPlan.updated_at)}
                                                    </Text>
                                                </Flex>
                                            </Box>
                                        </Link>
                                    );
                                })}
                            </VStack>
                        ) : (
                            <VStack py={8} gap={3}>
                                <Text color={colors.textColorMuted} fontSize="sm" textAlign="center">
                                    {searchQuery || statusFilter !== "all"
                                        ? "No plans match your search criteria"
                                        : t("no_plans_found")}
                                </Text>
                                {(searchQuery || statusFilter !== "all") && (
                                    <Button
                                        size="xs"
                                        variant="outline"
                                        onClick={() => {
                                            setSearchQuery("");
                                            setStatusFilter("all");
                                        }}
                                    >
                                        {t("clear_filters")}
                                    </Button>
                                )}
                            </VStack>
                        )}

                        {/* Pagination Controls */}
                        {totalPages > 1 && (
                            <Flex justify="center" mt={4} align="center" borderTopWidth="1px" borderColor={colors.borderColor} pt={3}>
                                <IconButton
                                    aria-label="Previous Page"
                                    size="sm"
                                    colorScheme="blue"
                                    variant="ghost"
                                    disabled={currentPage === 1}
                                    onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                                    mr={2}
                                >
                                    <Icon as={FiChevronLeft} />
                                </IconButton>

                                <Text fontSize="sm" mx={2} color={colors.textColorMuted}>
                                    {currentPage} / {totalPages}
                                </Text>

                                <IconButton
                                    aria-label="Next Page"
                                    size="sm"
                                    colorScheme="blue"
                                    variant="ghost"
                                    disabled={currentPage === totalPages}
                                    onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                                    ml={2}
                                >
                                    <Icon as={FiChevronRight} />
                                </IconButton>
                            </Flex>
                        )}
                    </Box>

                    {/* Main content area */}
                    <Box flex="1" p={0} position="relative" overflowY="auto">
                        {!isDetailView && !loading.plans ? (
                            <Flex
                                direction="column"
                                align="center"
                                justify="center"
                                height="100%"
                                p={8}
                            >
                                <Icon as={FaTasks} fontSize="6xl" color={colors.accentColor} mb={6} />
                                <Text fontSize="xl" fontWeight="bold" color={colors.textColorHeading} mb={2}>
                                    {t("select_plan")}
                                </Text>
                                <Text color={colors.textColorMuted} textAlign="center" maxW="md">
                                    {t("select_plan_description")}
                                </Text>
                            </Flex>
                        ) : (
                            children
                        )}
                    </Box>
                </Flex>
            </MotionBox>
        </Container>
    );
} 