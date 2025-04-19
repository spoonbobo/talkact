"use client"

import {
    Box,
    Flex,
    Text,
    Icon,
    VStack,
    HStack,
    Table,
    Badge,
    Code
} from '@chakra-ui/react';
import { FaTools } from 'react-icons/fa';
import { FiServer } from 'react-icons/fi';
import { ITask } from "@/types/plan";

interface TaskSkillInfoProps {
    task: ITask;
    colors: any;
    t: any; // Translation function
    showDetails?: boolean;
}

export default function SkillInfo({ task, colors, t, showDetails = false }: TaskSkillInfoProps) {
    if (!task) return null;

    // Support both skill and tool properties for backward compatibility
    const skillData = task.skill || task.skill;

    return (
        <Flex direction="column" gap={2} mt={3}>
            <Box>
                {skillData && (
                    <Box>
                        <Flex align="center" mb={2}>
                            {task.mcp_server && (
                                <Flex
                                    align="center"
                                    fontSize="xs"
                                    color={colors.textColorMuted}
                                    bg={`${colors.accentColor}10`}
                                    p={2}
                                    borderRadius="md"
                                    width="fit-content"
                                    mr={3}
                                >
                                    <Icon as={FiServer} mr={1} />
                                    {t("server")}: {task.mcp_server}
                                </Flex>
                            )}
                        </Flex>

                        {Array.isArray(skillData) ? (
                            // Handle array of skill calls with improved styling
                            <VStack align="flex-start" gap={2}>
                                {skillData.map((skillCall, idx) => (
                                    <Box
                                        key={idx}
                                        p={3}
                                        borderRadius="md"
                                        bg={`${colors.accentColor}10`}
                                        border="1px"
                                        borderColor={colors.borderColor}
                                        boxShadow="sm"
                                        width="100%"
                                    >
                                        <Flex justifyContent="space-between" mb={2} alignItems="center">
                                            <HStack gap={2}>
                                                <Icon as={FaTools} color="blue.500" />
                                                <Text fontWeight="semibold" fontSize="sm" color={colors.textColorHeading}>
                                                    {skillCall.skill_name || skillCall.tool_name || t("not_specified")}
                                                </Text>
                                            </HStack>
                                        </Flex>

                                        {skillCall.description && (
                                            <Text fontSize="xs" color={colors.textColor} mb={2}>
                                                {skillCall.description}
                                            </Text>
                                        )}

                                        {skillCall.args && Object.keys(skillCall.args).length > 0 && (
                                            <Box
                                                mt={2}
                                                p={2}
                                                bg={colors.bgSubtle}
                                                borderRadius="md"
                                                borderWidth="1px"
                                                borderColor={colors.borderColor}
                                            >
                                                <Text fontSize="xs" fontWeight="bold" color={colors.textColorMuted} mb={1}>
                                                    {t("parameters")}:
                                                </Text>
                                                <Table.Root size="sm" variant="line" colorScheme="blue">
                                                    <Table.Header bg={colors.bgSubtle} position="sticky" top={0} zIndex={1}>
                                                        <Table.Row>
                                                            <Table.ColumnHeader width="25%" fontWeight="semibold" fontSize="xs">{t("parameter")}</Table.ColumnHeader>
                                                            <Table.ColumnHeader width="15%" fontWeight="semibold" fontSize="xs">{t("type")}</Table.ColumnHeader>
                                                            <Table.ColumnHeader width="60%" fontWeight="semibold" fontSize="xs">{t("value")}</Table.ColumnHeader>
                                                        </Table.Row>
                                                    </Table.Header>
                                                    <Table.Body>
                                                        {Object.entries(skillCall.args).map(([paramName, paramValue]) => {
                                                            // Handle both old format and new augmented format
                                                            const isAugmented = paramValue && typeof paramValue === 'object' && 'value' in paramValue && 'type' in paramValue;
                                                            const displayValue = isAugmented ? paramValue.value : paramValue;
                                                            const paramType = isAugmented ? paramValue.type : 'unknown';

                                                            return (
                                                                <Table.Row key={paramName} _hover={{ bg: colors.cardBg }}>
                                                                    <Table.Cell fontWeight="medium" fontSize="xs" color={colors.textColor}>{paramName}</Table.Cell>
                                                                    <Table.Cell fontSize="xs" color={colors.textColorMuted}>
                                                                        <Badge size="sm" colorScheme="blue" variant="subtle">
                                                                            {String(paramType)}
                                                                        </Badge>
                                                                    </Table.Cell>
                                                                    <Table.Cell fontSize="xs" color={colors.textColor}>
                                                                        <Code colorScheme="blue" px={1} py={0}>
                                                                            {typeof displayValue === 'object'
                                                                                ? JSON.stringify(displayValue)
                                                                                : String(displayValue)
                                                                            }
                                                                        </Code>
                                                                    </Table.Cell>
                                                                </Table.Row>
                                                            );
                                                        })}
                                                    </Table.Body>
                                                </Table.Root>
                                            </Box>
                                        )}
                                    </Box>
                                ))}
                            </VStack>
                        ) : (
                            // Fallback for legacy single skill object format with improved styling
                            <Box
                                p={3}
                                borderRadius="md"
                                bg={`${colors.accentColor}10`}
                                border="1px"
                                borderColor={colors.borderColor}
                                boxShadow="sm"
                                width="100%"
                            >
                                <Flex justifyContent="space-between" mb={2} alignItems="center">
                                    <HStack gap={2}>
                                        <Icon as={FaTools} color="blue.500" />
                                        <Text fontWeight="semibold" fontSize="sm" color={colors.textColorHeading}>
                                            {skillData.skill_name || skillData.tool_name || t("not_specified")}
                                        </Text>
                                    </HStack>
                                </Flex>

                                {skillData.description && (
                                    <Text fontSize="xs" color={colors.textColor} mb={2}>
                                        {skillData.description}
                                    </Text>
                                )}

                                {skillData.args && Object.keys(skillData.args).length > 0 && (
                                    <Box
                                        mt={2}
                                        p={2}
                                        bg={colors.bgSubtle}
                                        borderRadius="md"
                                        borderWidth="1px"
                                        borderColor={colors.borderColor}
                                    >
                                        <Text fontSize="xs" fontWeight="bold" color={colors.textColorMuted} mb={1}>
                                            {t("parameters")}:
                                        </Text>
                                        <Table.Root size="sm" variant="line" colorScheme="blue">
                                            <Table.Header bg={colors.bgSubtle} position="sticky" top={0} zIndex={1}>
                                                <Table.Row>
                                                    <Table.ColumnHeader width="25%" fontWeight="semibold" fontSize="xs">{t("parameter")}</Table.ColumnHeader>
                                                    <Table.ColumnHeader width="15%" fontWeight="semibold" fontSize="xs">{t("type")}</Table.ColumnHeader>
                                                    <Table.ColumnHeader width="60%" fontWeight="semibold" fontSize="xs">{t("value")}</Table.ColumnHeader>
                                                </Table.Row>
                                            </Table.Header>
                                            <Table.Body>
                                                {Object.entries(skillData.args).map(([paramName, paramValue]) => {
                                                    // Handle both old format and new augmented format
                                                    const isAugmented = paramValue && typeof paramValue === 'object' && 'value' in paramValue && 'type' in paramValue;
                                                    const displayValue = isAugmented ? paramValue.value : paramValue;
                                                    const paramType = isAugmented ? paramValue.type : 'unknown';

                                                    return (
                                                        <Table.Row key={paramName} _hover={{ bg: colors.cardBg }}>
                                                            <Table.Cell fontWeight="medium" fontSize="xs" color={colors.textColor}>{paramName}</Table.Cell>
                                                            <Table.Cell fontSize="xs" color={colors.textColorMuted}>
                                                                <Badge size="sm" colorScheme="blue" variant="subtle">
                                                                    {String(paramType)}
                                                                </Badge>
                                                            </Table.Cell>
                                                            <Table.Cell fontSize="xs" color={colors.textColor}>
                                                                <Code colorScheme="blue" px={1} py={0}>
                                                                    {typeof displayValue === 'object'
                                                                        ? JSON.stringify(displayValue)
                                                                        : String(displayValue)
                                                                    }
                                                                </Code>
                                                            </Table.Cell>
                                                        </Table.Row>
                                                    );
                                                })}
                                            </Table.Body>
                                        </Table.Root>
                                    </Box>
                                )}
                            </Box>
                        )}
                    </Box>
                )}

                {/* Show server info alone if no skills */}
                {!skillData && task.mcp_server && (
                    <Flex
                        align="center"
                        fontSize="xs"
                        color={colors.textColorMuted}
                        bg={`${colors.accentColor}10`}
                        p={2}
                        borderRadius="md"
                        width="fit-content"
                    >
                        <Icon as={FiServer} mr={1} />
                        {t("server")}: {task.mcp_server}
                    </Flex>
                )}
            </Box>
        </Flex>
    );
} 