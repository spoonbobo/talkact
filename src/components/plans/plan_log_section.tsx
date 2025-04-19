import { Card, CardHeader, CardBody, Flex, Text, Stack, Box, Badge, Link } from "@chakra-ui/react";
import NextLink from "next/link";
import { useParams } from "next/navigation";

interface PlanLogSectionProps {
    logs: Array<{
        id: string;
        created_at: Date | string;
        type: string;
        content: string;
        planName?: string;
        planShortId?: string;
        task_id?: string;
        plan_id?: string; // Full plan ID for navigation
        planNavId?: string;
    }>;
    colors: any;
    t: any;
}

const getShortId = (uuid?: string) => uuid ? uuid.split('-')[0] : '';

const PlanLogSection = ({ logs, colors, t }: PlanLogSectionProps) => {
    const params = useParams();
    const locale = params.locale as string || 'en';

    // If logs array is empty, show a message
    if (!logs || logs.length === 0) {
        return (
            <div>
                <Text fontSize="sm" fontWeight="bold" color={colors.planLabelText} mb={2}>
                    {t("plan_logs")}
                </Text>
                <Text fontSize="xs" color="gray.400">
                    {t("no_logs_found")}
                </Text>
            </div>
        );
    }

    return (
        <div>
            <Text fontSize="sm" fontWeight="bold" color={colors.planLabelText} mb={2}>
                {t("plan_logs")}
            </Text>
            <Stack gap={2}>
                {logs.map(log => (
                    <Card.Root size="sm" key={log.id} borderColor={colors.planItemBorder} bg={colors.planItemBg}>
                        <CardHeader pb={0} pt={2} px={3}>
                            <Flex align="center" justify="space-between">
                                <Flex align="center" gap={1}>
                                    {log.type === "plan_created" ? (
                                        <Link
                                            as={NextLink}
                                            href={`/${locale}/plans/${log.planNavId}`}
                                            _hover={{ textDecoration: 'none' }}
                                        >
                                            <Badge
                                                colorScheme="gray"
                                                fontSize="xs"
                                                px={1.5}
                                                py={0.5}
                                                borderRadius="md"
                                                fontFamily="monospace"
                                                fontWeight="bold"
                                                cursor="pointer"
                                                _hover={{ bg: 'gray.300' }}
                                            >
                                                {t("open_plan")}
                                            </Badge>
                                        </Link>
                                    ) : (
                                        <Badge
                                            colorScheme="gray"
                                            fontSize="xs"
                                            px={1.5}
                                            py={0.5}
                                            borderRadius="md"
                                            fontFamily="monospace"
                                            fontWeight="bold"
                                        >
                                            {getShortId(log.planShortId)}
                                        </Badge>
                                    )}
                                    <Text fontSize="xs" color="gray.500">
                                        {new Date(log.created_at).toLocaleString()}
                                    </Text>
                                </Flex>
                                <Badge colorScheme="blue" fontSize="xs" px={2} py={0.5} borderRadius="md" textTransform="uppercase" fontWeight="bold">
                                    {log.type.replace(/_/g, " ")}
                                </Badge>
                            </Flex>
                        </CardHeader>
                        <CardBody pt={1} pb={2} px={3}>
                            <Text
                                fontSize="sm"
                                color={colors.textColor}
                                lineClamp={2}
                            >
                                {log.content}
                            </Text>
                        </CardBody>
                    </Card.Root>
                ))}
            </Stack>
        </div>
    );
};

export default PlanLogSection;
