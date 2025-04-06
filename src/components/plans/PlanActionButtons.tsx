"use client"

import {
    HStack,
    IconButton,
    Icon
} from '@chakra-ui/react';
import { FaCheck, FaStop } from 'react-icons/fa';
import { FiRefreshCw } from 'react-icons/fi';
import { Tooltip } from "@/components/ui/tooltip";
import { useTranslations } from "next-intl";
import { IPlan, ITask } from "@/types/plan";

interface PlanActionButtonsProps {
    plan: IPlan;
    currentTask: ITask | null;
    isLoading: boolean;
    loadingTasks: boolean;
    colors: any;
    onApprove: () => Promise<void>;
    onDeny: () => Promise<void>;
    onRefresh: () => void;
}

export default function PlanActionButtons({
    plan,
    currentTask,
    isLoading,
    loadingTasks,
    colors,
    onApprove,
    onDeny,
    onRefresh
}: PlanActionButtonsProps) {
    const t = useTranslations("Plans");

    return (
        <HStack
            gap={2}
            position="absolute"
            top={6}
            right={6}
            zIndex={10}
            bg={colors.cardBg}
            p={2}
            borderRadius="md"
            boxShadow="sm"
        >
            <Tooltip content={t("approve_plan")}>
                <IconButton
                    aria-label="approve"
                    size="sm"
                    colorScheme="green"
                    variant="ghost"
                    loading={isLoading || loadingTasks}
                    disabled={plan.status === 'success' || plan.status === 'terminated'}
                    onClick={onApprove}
                    _hover={{ bg: "green.50", color: colors.greenBgColor }}
                >
                    <Icon as={FaCheck} color={colors.textColor} />
                </IconButton>
            </Tooltip>
            <Tooltip content={t("deny_plan")}>
                <IconButton
                    aria-label="deny"
                    size="sm"
                    colorScheme="red"
                    variant="ghost"
                    loading={isLoading || loadingTasks}
                    disabled={plan.status === 'success' || plan.status === 'terminated'}
                    onClick={onDeny}
                    _hover={{ bg: "red.50", color: colors.redBgColor }}
                >
                    <Icon as={FaStop} color={colors.textColor} />
                </IconButton>
            </Tooltip>
            <Tooltip content={t("refresh")}>
                <IconButton
                    aria-label="synchronize"
                    size="sm"
                    colorScheme="blue"
                    variant="ghost"
                    loading={isLoading || loadingTasks}
                    onClick={onRefresh}
                    _hover={{ bg: "blue.50", color: colors.blueBgColor }}
                >
                    <Icon as={FiRefreshCw} color={colors.textColor} />
                </IconButton>
            </Tooltip>
        </HStack>
    );
} 