"use client"

import {
    Box,
    Heading,
    Flex,
    Text,
    Grid,
    GridItem,
    HStack,
    Progress
} from '@chakra-ui/react';
import { useTranslations } from "next-intl";
import { IPlan } from "@/types/plan";
import StatusBadge, { getStatusColorScheme } from "@/components/ui/StatusBadge";

// Format date for display
const formatDate = (date: Date | null): string => {
    if (!date) return 'N/A';
    return new Date(date).toLocaleString(undefined, {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
};

interface PlanHeaderProps {
    plan: IPlan;
    colors: any;
}

export default function PlanHeader({ plan, colors }: PlanHeaderProps) {
    const t = useTranslations("Plans");

    return (
        <Box>
            <Heading size="md" mb={2} color={colors.textColorHeading}>{plan.plan_name}</Heading>
            <Flex align="center" mb={2}>
                <StatusBadge status={plan.status} mr={3} />
                <HStack width="200px" mr={2} flex="1">
                    <Progress.Root
                        value={plan.progress}
                        size="sm"
                        colorScheme={getStatusColorScheme(plan.status)}
                        borderRadius="full"
                    >
                        <Progress.Track>
                            <Progress.Range />
                        </Progress.Track>
                    </Progress.Root>
                    <Text fontSize="sm" fontWeight="bold" color={colors.textColor}>
                        {plan.progress}%
                    </Text>
                </HStack>
            </Flex>

            <Box mb={3}>
                <Text fontSize="xs" color={colors.textColorMuted}>{t("plan_overview")}:</Text>
                <Text fontSize="sm" color={colors.textColor}>{plan.plan_overview}</Text>
            </Box>

            <Grid templateColumns="repeat(2, 1fr)" gap={4} mt={4}>
                <GridItem>
                    <Text fontSize="xs" color={colors.textColorMuted}>{t("assigner")}:</Text>
                    <Text fontSize="sm">{plan.assigner}</Text>
                </GridItem>
                <GridItem>
                    <Text fontSize="xs" color={colors.textColorMuted}>{t("assignee")}:</Text>
                    <Text fontSize="sm">{plan.assignee}</Text>
                </GridItem>
                <GridItem>
                    <Text fontSize="xs" color={colors.textColorMuted}>{t("created")}:</Text>
                    <Text fontSize="sm">{formatDate(plan.created_at)}</Text>
                </GridItem>
                <GridItem>
                    <Text fontSize="xs" color={colors.textColorMuted}>{t("updated")}:</Text>
                    <Text fontSize="sm">{formatDate(plan.updated_at)}</Text>
                </GridItem>
            </Grid>
        </Box>
    );
} 