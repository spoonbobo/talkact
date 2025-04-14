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
import KnowledgeBaseSettings from "@/components/settings/knowledge_base";

export default function KnowledgeBasePage() {
    const t = useTranslations("Settings");
    const userSettings = useSelector((state: RootState) => state.user.currentUser?.settings);
    const dispatch = useDispatch();
    const textColor = useColorModeValue("gray.800", "gray.100");

    const [isSaving, setIsSaving] = useState(false);
    const [settings, setSettings] = useState({
        enableKnowledgeBase: false,
        source: "",
        apiKey: "",
        apiUrl: "",
        relevanceThreshold: 0.7,
        maxResults: 5,
        knowledgeBases: [],
    });
    const [hasChanges, setHasChanges] = useState(false);

    // Initialize settings
    useEffect(() => {
        setSettings({
            // Knowledge base settings - use structured format if available
            enableKnowledgeBase: userSettings?.knowledgeBase?.enableKnowledgeBase || false,
            source: userSettings?.knowledgeBase?.source || "",
            apiKey: userSettings?.knowledgeBase?.apiKey || "",
            apiUrl: userSettings?.knowledgeBase?.apiUrl || "",
            // For backward compatibility, also check the flat structure
            ...(userSettings?.source && {
                source: userSettings.source,
                apiKey: userSettings.apiKey,
                apiUrl: userSettings.apiUrl,
                enableKnowledgeBase: userSettings.enableKnowledgeBase || false,
            }),
            // Additional properties for the knowledge base UI
            relevanceThreshold: 0.7,
            maxResults: 5,
            knowledgeBases: userSettings?.knowledgeBases || [],
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
                knowledgeBase: {
                    enableKnowledgeBase: settings.enableKnowledgeBase,
                    source: settings.source,
                    apiKey: settings.apiKey,
                    apiUrl: settings.apiUrl,
                },
                // Store the knowledgeBases array at the top level for backward compatibility
                knowledgeBases: settings.knowledgeBases || [],
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
                    {t("knowledge_base")}
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
                <KnowledgeBaseSettings
                    onSettingsChange={handleSettingsChange}
                    settings={settings}
                />
            </Box>
        </>
    );
}