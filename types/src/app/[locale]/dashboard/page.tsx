"use client";

import React, { useState, useEffect } from "react";
import {
    Box,
    Typography,
    Stack,
    Button,
    Divider,
} from "@mui/material";
import { useTranslations } from "next-intl";
import { useSession } from "next-auth/react";
import { useSelector, useDispatch } from 'react-redux';
import { RootState } from "@/store/store";
import { useRouter, useParams } from "next/navigation";
import { setUserSettings } from '@/store/features/userSlice';
import { useToast } from "@/components/ui/mui-toaster";
import GeneralSettings from "@/components/dashboard/general";

export default function SettingsPage() {
    const t = useTranslations("Settings");
    const { data: session } = useSession();
    const { isAuthenticated } = useSelector((state: RootState) => state.user);
    const userSettings = useSelector((state: RootState) => state.user.currentUser?.settings);
    const router = useRouter();
    const params = useParams();
    const dispatch = useDispatch();
    const { showToast } = useToast();

    const [isSaving, setIsSaving] = useState(false);
    const [settings, setSettings] = useState({
        language: "",
        theme: "",
    });
    const [hasChanges, setHasChanges] = useState(false);

    // Get current locale from params
    const currentLocale = params.locale as string;

    // Initialize settings
    useEffect(() => {
        setSettings({
            language: currentLocale,
            theme: localStorage.getItem("theme") || "light",
        });
    }, [currentLocale, userSettings]);

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
                general: {
                    language: settings.language,
                    theme: settings.theme,
                }
            };

            // If language changed, redirect to new locale
            if (settings.language && settings.language !== currentLocale) {
                // Get current path without locale prefix
                const pathParts = window.location.pathname.split('/');
                pathParts.splice(1, 1); // Remove the locale part
                const pathWithoutLocale = pathParts.join('/');

                // Create the new URL with the selected locale
                const newPath = `/${settings.language}${pathWithoutLocale}`;

                // Update Redux store with properly structured settings
                dispatch(setUserSettings(updatedUserSettings));

                // Save to database before redirecting
                await fetch('/api/user/update_user', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({ settings: updatedUserSettings }),
                });

                // Use window.location for a hard refresh instead of router.push
                window.location.href = newPath;
                return; // Stop execution since we're redirecting
            }

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

            showToast(t("settings_saved_description"), 'success', 3000);

            setHasChanges(false);
        } catch (error) {
            console.error("Error saving settings:", error);
            showToast(error instanceof Error ? error.message : "An unknown error occurred", 'error', 5000);
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <Box>
            <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
                <Typography variant="h5" color="text.primary">
                    {t("general")}
                </Typography>
                <Button
                    variant="contained"
                    size="small"
                    disabled={!hasChanges || isSaving}
                    onClick={handleSave}
                    sx={{ minWidth: 120 }}
                >
                    {isSaving ? "Saving..." : t("save_changes")}
                </Button>
            </Stack>
            <Divider sx={{ mb: 3 }} />

            <Box>
                <GeneralSettings
                    isAuthenticated={isAuthenticated}
                    currentLocale={currentLocale}
                    onSettingsChange={handleSettingsChange}
                    settings={settings}
                />
            </Box>
        </Box>
    );
} 