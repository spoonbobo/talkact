"use client";

import React, { useState, useEffect } from "react";
import {
    Box,
    Heading,
    Text,
    Flex,
    Button,
    Separator,
} from "@chakra-ui/react";
import { useTranslations } from "next-intl";
import { useSelector, useDispatch } from 'react-redux';
import { RootState } from "@/store/store";
import { setUserSettings } from '@/store/features/userSlice';
import { toaster } from "@/components/ui/toaster";
import { useColorModeValue } from "@/components/ui/color-mode";
import MCPSettings from "@/components/settings/mcp";

export default function MCPSettingsPage() {
    const t = useTranslations("Settings");
    const userSettings = useSelector((state: RootState) => state.user.currentUser?.settings);
    const dispatch = useDispatch();
    const textColor = useColorModeValue("gray.800", "gray.100");

    const [isSaving, setIsSaving] = useState(false);
    const [settings, setSettings] = useState({
        defaultModel: "claude-3-opus",
        temperature: 0.7,
        enableStreaming: false,
        responseStyle: "balanced",
    });
    const [hasChanges, setHasChanges] = useState(false);

    // Initialize settings
    useEffect(() => {
        setSettings({
            defaultModel: userSettings?.mcp?.defaultModel || "claude-3-opus",
            temperature: userSettings?.mcp?.temperature || 0.7,
            enableStreaming: userSettings?.mcp?.enableStreaming || false,
            responseStyle: userSettings?.mcp?.responseStyle || "balanced",
        });
    }, [userSettings]);

    // Handle settings changes from child components
    const handleSettingsChange = (newSettings: any) => {
        setSettings(prev => {
            const updated = { ...prev, ...newSettings };
            // Check if anything changed
            const changed = JSON.stringify(updated) !== JSON.stringify(prev);
            setHasChanges(changed);
            return updated;
        });
    };

    // Handle save button click
    const handleSave = async () => {
        setIsSaving(true);
        try {
            // Create a properly structured user settings object
            const updatedUserSettings = {
                ...userSettings,
                mcp: {
                    defaultModel: settings.defaultModel,
                    temperature: settings.temperature,
                    enableStreaming: settings.enableStreaming,
                    responseStyle: settings.responseStyle,
                }
            };

            // Save user settings to the database
            const response = await fetch('/api/user/update_user', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ settings: updatedUserSettings }),
            });

            if (!response.ok) {
                throw new Error('Failed to save settings');
            }

            // Update Redux store with properly structured settings
            dispatch(setUserSettings(updatedUserSettings));

            toaster.create({
                title: t("settings_saved"),
                description: t("settings_saved_description"),
                duration: 3000,
            });

            setHasChanges(false);
        } catch (error) {
            console.error("Error saving settings:", error);
            toaster.create({
                title: t("error"),
                description: error instanceof Error ? error.message : "An unknown error occurred",
                duration: 5000,
            });
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <>
            <Flex justifyContent="space-between" alignItems="center" mb={4}>
                <Heading size="md" color={textColor}>
                    {t("mcp")}
                </Heading>
                <Button
                    colorScheme="blue"
                    size="sm"
                    loading={isSaving}
                    disabled={!hasChanges}
                    onClick={handleSave}
                >
                    {t("save_changes")}
                </Button>
            </Flex>
            <Separator mb={6} />

            <Box>
                <MCPSettings
                    onSettingsChange={handleSettingsChange}
                    settings={settings}
                />
            </Box>
        </>
    );
}