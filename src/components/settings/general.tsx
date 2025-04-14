"use client"

import React, { useState } from "react";
import {
    Box,
    Text,
    VStack,
    Input,
    Icon,
    Button,
    Select,
    Portal,
} from "@chakra-ui/react";
import { FiLock } from "react-icons/fi";
import { useTranslations } from "next-intl";
import { useSession } from "next-auth/react";
import { useColorMode, useColorModeValue } from "@/components/ui/color-mode";
import { createListCollection } from "@chakra-ui/react";

interface GeneralSettingsProps {
    isAuthenticated: boolean;
    currentLocale: string;
    onSettingsChange: (settings: any) => void;
    settings: {
        language?: string;
        theme?: string;
        [key: string]: any;
    };
}

export default function GeneralSettings({
    isAuthenticated,
    currentLocale,
    onSettingsChange,
    settings
}: GeneralSettingsProps) {
    const t = useTranslations("Settings");
    const { data: session } = useSession();
    const textColor = useColorModeValue("gray.800", "gray.100");
    const { toggleColorMode } = useColorMode();

    // Language options collection
    const languageOptions = createListCollection({
        items: [
            { label: "English", value: "en" },
            { label: "中文(繁體)", value: "zh-HK" },
            { label: "中文(简体)", value: "zh-CN" },
            { label: "한국어 (Korean)", value: "ko" },
            { label: "日本語 (Japanese)", value: "ja" },
            { label: "ไทย (Thai)", value: "th-TH" },
            { label: "Tiếng Việt (Vietnamese)", value: "vi-VN" },
        ],
    });

    // Handle language change
    const handleLanguageChange = (valueObj: any) => {
        // Extract the value from the object structure
        const value = valueObj?.value?.[0] || currentLocale;

        // Update the settings in the parent component
        onSettingsChange({
            ...settings,
            language: value
        });
    };

    // Handle theme change - fixed to properly use the toggleColorMode hook
    const handleThemeChange = () => {
        // Toggle the color mode using the hook
        toggleColorMode();

        // Get the new theme after toggling
        const newTheme = localStorage.getItem("chakra-ui-color-mode") || "light";

        // Update the settings in the parent component
        onSettingsChange({
            ...settings,
            theme: newTheme
        });
    };

    return (
        <Box>
            <VStack align="stretch" gap={4}>
                {/* Only show user info if authenticated */}
                {isAuthenticated && session && (
                    <>
                        <Box>
                            <Text fontWeight="medium" mb={1} color={textColor}>
                                {t("display_name")}
                                <Icon
                                    as={FiLock}
                                    ml={2}
                                    fontSize="sm"
                                    color="gray.500"
                                />
                            </Text>
                            <Input
                                color={textColor}
                                placeholder={t("your_display_name")}
                                maxW="400px"
                                defaultValue={session?.user?.name || ""}
                                disabled={true}
                                _disabled={{ opacity: 0.7, cursor: "not-allowed" }}
                            />
                            <Text fontSize="xs" color="gray.500" mt={1}>
                                {t("managed_by_provider")}
                            </Text>
                        </Box>

                        <Box>
                            <Text fontWeight="medium" mb={1} color={textColor}>
                                {t("email")}
                                <Icon
                                    as={FiLock}
                                    ml={2}
                                    fontSize="sm"
                                    color="gray.500"
                                />
                            </Text>
                            <Input
                                color={textColor}
                                placeholder={t("your_email")}
                                maxW="400px"
                                defaultValue={session?.user?.email || ""}
                                disabled={true}
                                _disabled={{ opacity: 0.7, cursor: "not-allowed" }}
                            />
                            <Text fontSize="xs" color="gray.500" mt={1}>
                                {t("managed_by_provider")}
                            </Text>
                        </Box>
                    </>
                )}

                <Box>
                    <Text fontWeight="medium" mb={1} color={textColor}>
                        {t("theme")}
                    </Text>
                    <Button variant="outline" onClick={handleThemeChange}>
                        {t("toggle_theme")}
                    </Button>
                </Box>

                <Box>
                    <Text fontWeight="medium" mb={1} color={textColor}>
                        {t("language")}
                    </Text>
                    <Select.Root
                        color={textColor}
                        size="sm"
                        width="200px"
                        collection={languageOptions}
                        defaultValue={[settings.language || currentLocale]}
                        onValueChange={(valueObj) => {
                            handleLanguageChange(valueObj);
                        }}
                    >
                        <Select.HiddenSelect />
                        <Select.Control>
                            <Select.Trigger>
                                <Select.ValueText placeholder={t("select_language")} />
                            </Select.Trigger>
                            <Select.IndicatorGroup>
                                <Select.Indicator />
                            </Select.IndicatorGroup>
                        </Select.Control>
                        <Portal>
                            <Select.Positioner>
                                <Select.Content>
                                    {languageOptions.items.map((option) => (
                                        <Select.Item color={textColor} item={option} key={option.value}>
                                            {option.label}
                                            <Select.ItemIndicator />
                                        </Select.Item>
                                    ))}
                                </Select.Content>
                            </Select.Positioner>
                        </Portal>
                    </Select.Root>
                </Box>
            </VStack>
        </Box>
    );
}