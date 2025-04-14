"use client"

import React from "react";
import {
    Box,
    Text,
    VStack,
    Select,
    Portal,
    Icon,
} from "@chakra-ui/react";
import { useTranslations } from "next-intl";
import { createListCollection } from "@chakra-ui/react";
import { useColorModeValue } from "@/components/ui/color-mode";
import { FiServer } from "react-icons/fi";

interface MCPSettingsProps {
    onSettingsChange: (settings: any) => void;
    settings: {
        defaultModel?: string;
        enableStreaming?: boolean;
        [key: string]: any;
    };
}

export default function MCPSettings({
    onSettingsChange,
    settings
}: MCPSettingsProps) {
    const t = useTranslations("Settings");
    const textColor = useColorModeValue("gray.800", "gray.100");

    // Model options collection
    const modelOptions = createListCollection({
        items: [
            { label: "Claude 3 Opus", value: "claude-3-opus" },
            { label: "Claude 3 Sonnet", value: "claude-3-sonnet" },
            { label: "Claude 3 Haiku", value: "claude-3-haiku" },
            { label: "GPT-4o", value: "gpt-4o" },
            { label: "GPT-4 Turbo", value: "gpt-4-turbo" },
        ],
    });

    // Handle model change
    const handleModelChange = (valueObj: any) => {
        // Extract the value from the object structure
        const value = valueObj?.value?.[0] || "claude-3-opus";

        onSettingsChange({
            ...settings,
            defaultModel: value
        });
    };

    // Handle streaming toggle
    const handleStreamingToggle = () => {
        onSettingsChange({
            ...settings,
            enableStreaming: !settings.enableStreaming
        });
    };

    return (
        <Box>
            <VStack align="stretch" gap={4}>
                <Text fontSize="md" fontWeight="medium" color={textColor}>
                    <Icon as={FiServer} mr={2} />
                    {t("mcp_description") || "Configure AI model settings and response behavior."}
                </Text>

                <Box>
                    <Text fontWeight="medium" mb={1} color={textColor}>
                        {t("default_model") || "Default Model"}
                    </Text>
                    <Select.Root
                        color={textColor}
                        size="sm"
                        width="200px"
                        collection={modelOptions}
                        defaultValue={[settings.defaultModel || "claude-3-opus"]}
                        onValueChange={(valueObj) => {
                            handleModelChange(valueObj);
                        }}
                    >
                        <Select.HiddenSelect />
                        <Select.Control>
                            <Select.Trigger>
                                <Select.ValueText placeholder={t("select_model") || "Select model"} />
                            </Select.Trigger>
                            <Select.IndicatorGroup>
                                <Select.Indicator />
                            </Select.IndicatorGroup>
                        </Select.Control>
                        <Portal>
                            <Select.Positioner>
                                <Select.Content>
                                    {modelOptions.items.map((option) => (
                                        <Select.Item color={textColor} item={option} key={option.value}>
                                            {option.label}
                                            <Select.ItemIndicator />
                                        </Select.Item>
                                    ))}
                                </Select.Content>
                            </Select.Positioner>
                        </Portal>
                    </Select.Root>
                    <Text fontSize="xs" color="gray.500" mt={1}>
                        {t("default_model_description") || "Model used for new conversations."}
                    </Text>
                </Box>

                <Box>
                    <Text fontWeight="medium" mb={1} color={textColor}>
                        {t("enable_streaming") || "Enable Streaming Responses"}
                    </Text>
                    <Box
                        as="button"
                        onClick={handleStreamingToggle}
                        bg={settings.enableStreaming ? "blue.500" : "gray.200"}
                        color={settings.enableStreaming ? "white" : "gray.500"}
                        px={3}
                        py={1}
                        borderRadius="md"
                        fontSize="sm"
                        fontWeight="medium"
                        _hover={{
                            bg: settings.enableStreaming ? "blue.600" : "gray.300"
                        }}
                    >
                        {settings.enableStreaming ? t("enabled") || "Enabled" : t("disabled") || "Disabled"}
                    </Box>
                </Box>

                <Box>
                    <Text fontWeight="medium" mb={1} color={textColor}>
                        {t("model_info") || "Model Information"}
                    </Text>
                    <Text fontSize="sm" color={textColor}>
                        {t("current_model_info") || `Currently using ${settings.defaultModel || "Claude 3 Opus"} with streaming ${settings.enableStreaming ? "enabled" : "disabled"}.`}
                    </Text>
                    <Text fontSize="xs" color="gray.500" mt={1}>
                        {t("model_info_description") || "These settings apply to all new conversations."}
                    </Text>
                </Box>
            </VStack>
        </Box>
    );
}
