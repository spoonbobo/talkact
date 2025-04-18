"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
    Box,
    Heading,
    Text,
    Flex,
    Button,
    Separator,
    VStack,
    Input,
    Icon,
    IconButton,
    SimpleGrid,
    Switch,
    HStack,
    CloseButton,
    Dialog,
    Portal,
} from "@chakra-ui/react";
import {
    FormControl,
    FormLabel,
} from "@chakra-ui/form-control";
import { FiDatabase, FiFile, FiShare2, FiSearch, FiCloud, FiGlobe, FiServer, FiHardDrive, FiBox, FiArchive, FiBookmark, FiFolder, FiEdit, FiRefreshCw } from 'react-icons/fi';
import { FaTrash } from "react-icons/fa";
import { v4 as uuidv4 } from 'uuid';
import { useTranslations } from "next-intl";
import { useSelector, useDispatch } from 'react-redux';
import { RootState } from "@/store/store";
import { setUserSettings } from '@/store/features/userSlice';
import { toaster } from "@/components/ui/toaster";
import { useColorModeValue } from "@/components/ui/color-mode";
import { KnowledgeBaseSettings as KnowledgeBaseSettingsType, KnowledgeBaseItem } from "@/types/user";
import { useSettingsColors } from "@/utils/colors";

// Add a new type for KB status
type KBStatus = 'not_found' | 'disabled' | 'initializing' | 'running' | 'error';

export default function KnowledgeBasePage() {
    const t = useTranslations("Settings");
    const userSettings = useSelector((state: RootState) => state.user.currentUser?.settings);
    const isOwner = useSelector((state: RootState) => state.user.isOwner);
    const dispatch = useDispatch();
    const textColor = useColorModeValue("gray.800", "gray.100");
    const cardBg = useColorModeValue("white", "gray.700");
    const cardBorderColor = useColorModeValue("gray.200", "gray.600");
    const headingColor = useColorModeValue("gray.700", "gray.200");
    const textDescColor = useColorModeValue("gray.600", "gray.400");
    const colors = useSettingsColors();
    const formLabelColor = useColorModeValue("black", "white");
    const helpTextColor = useColorModeValue("gray.700", "gray.200");

    const [isSaving, setIsSaving] = useState(false);
    const [configureOpen, setConfigureOpen] = useState(false);
    const [settings, setSettings] = useState<KnowledgeBaseSettingsType>({
        enableKnowledgeBase: false,
        source: "",
        apiKey: "",
        apiUrl: "",
        relevanceThreshold: 0.7,
        maxResults: 5,
        knowledgeBases: [],
    });
    const [initialSettingsString, setInitialSettingsString] = useState('');
    const [connectionStatus, setConnectionStatus] = useState<'disabled' | 'connecting' | 'connected' | 'unconfigured'>('disabled');
    const [isAddingKB, setIsAddingKB] = useState(false);
    const [newKBItem, setNewKBItem] = useState<KnowledgeBaseItem>({
        name: "",
        description: "",
        id: "",
        enabled: true,
        sourceType: "",
    });
    const [sourceSearch, setSourceSearch] = useState("");
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 8;

    // Add state for tracking KB statuses
    const [kbStatuses, setKbStatuses] = useState<Record<string, KBStatus>>({});

    // Add state for confirmation dialog
    const [confirmReinitKbId, setConfirmReinitKbId] = useState<string | null>(null);

    // Initialize settings
    useEffect(() => {
        if (!userSettings) return;

        const newSettings = {
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
            relevanceThreshold: userSettings?.knowledgeBase?.relevanceThreshold || 0.7,
            maxResults: userSettings?.knowledgeBase?.maxResults || 5,
            knowledgeBases: userSettings?.knowledgeBases || [],
        };

        setSettings(newSettings);
        setInitialSettingsString(JSON.stringify(newSettings));

        // Set connection status based on settings
        updateConnectionStatus(newSettings);
    }, [userSettings]);

    // Update connection status when settings change
    const updateConnectionStatus = useCallback((config: KnowledgeBaseSettingsType) => {
        if (!config.enableKnowledgeBase) {
            setConnectionStatus('disabled');
        } else if (!config.apiKey || !config.source) {
            setConnectionStatus('unconfigured');
        } else {
            setConnectionStatus('connected');
        }
    }, []);

    useEffect(() => {
        updateConnectionStatus(settings);
    }, [settings, updateConnectionStatus]);

    // Handle settings changes
    const handleSettingsChange = (newSettings: Partial<KnowledgeBaseSettingsType>) => {
        setSettings(prev => {
            const updated = {
                ...prev,
                ...newSettings,
                knowledgeBases: newSettings.knowledgeBases ?? prev.knowledgeBases ?? [],
            };
            return updated;
        });
    };

    // Handle switch change
    const handleSwitchChange = (e: { checked: boolean }) => {
        if (e.checked && (!settings.apiKey || !settings.source)) {
            // If trying to enable but not configured
            setConnectionStatus('unconfigured');
            // Open configuration dialog
            setConfigureOpen(true);
        } else if (e.checked) {
            // If enabling and already configured
            setConnectionStatus('connecting');
            // Simulate connection process
            setTimeout(() => {
                setConnectionStatus('connected');
                handleSettingsChange({ enableKnowledgeBase: true });
            }, 1000);
        } else {
            // If disabling
            setConnectionStatus('disabled');
            handleSettingsChange({ enableKnowledgeBase: false });
        }
    };

    // Handle save config
    const handleSaveConfig = () => {
        if (settings.apiKey && settings.source && settings.enableKnowledgeBase) {
            setConnectionStatus('connecting');
            // Simulate connection process
            setTimeout(() => {
                setConnectionStatus('connected');
            }, 1000);
        }
        setConfigureOpen(false);
    };

    // Calculate if changes have been made
    const hasChanges = JSON.stringify(settings) !== initialSettingsString;

    // Update the handleSave function to handle field changes properly
    const handleSave = async () => {
        setIsSaving(true);
        try {
            // For non-owners, only allow changes to the enabled status of existing knowledge bases
            if (!isOwner) {
                // Get the initial knowledge bases for comparison
                const initialKBs = JSON.parse(initialSettingsString).knowledgeBases || [];
                const currentKBs = settings.knowledgeBases || [];

                // Check for unauthorized changes
                const hasNewKBs = currentKBs.length > initialKBs.length;
                const hasDeletedKBs = currentKBs.length < initialKBs.length;

                // Check if any knowledge base has been modified other than enable status
                const hasModifiedKBs = currentKBs.some(kb => {
                    const initialKB = initialKBs.find((item: KnowledgeBaseItem) => item.id === kb.id);
                    if (!initialKB) return true; // New KB

                    // Only allow changes to the enabled property
                    return kb.name !== initialKB.name ||
                        kb.description !== initialKB.description ||
                        kb.sourceType !== initialKB.sourceType ||
                        kb.url !== initialKB.url;
                });

                if (hasNewKBs || hasDeletedKBs || hasModifiedKBs) {
                    toaster.create({
                        title: t("error"),
                        description: t("non_owner_limited_changes") || "As a non-owner, you can only enable or disable existing knowledge bases",
                        duration: 3000,
                    });
                    setIsSaving(false);
                    return;
                }
            }

            // Create a properly structured user settings object
            const updatedUserSettings = {
                ...userSettings,
                knowledgeBase: {
                    enableKnowledgeBase: settings.enableKnowledgeBase,
                    source: settings.source,
                    apiKey: settings.apiKey,
                    apiUrl: settings.apiUrl,
                    relevanceThreshold: settings.relevanceThreshold,
                    maxResults: settings.maxResults,
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

            // Process knowledge base operations
            if (settings.knowledgeBases || JSON.parse(initialSettingsString).knowledgeBases) {
                // Get the initial knowledge bases for comparison
                const initialKBs = JSON.parse(initialSettingsString).knowledgeBases || [];
                const currentKBs = settings.knowledgeBases || [];

                // Track KBs that need to be recreated due to significant changes
                const kbsToRecreate = [];

                // For non-owners, only process enable/disable changes
                if (!isOwner) {
                    // Process each knowledge base - only update status
                    for (const kb of currentKBs) {
                        const initialKB = initialKBs.find((item: KnowledgeBaseItem) => item.id === kb.id);
                        if (initialKB && initialKB.enabled !== kb.enabled) {
                            // Only status changed - update it
                            const statusResponse = await fetch(`/api/kb/update_kb_status`, {
                                method: 'POST',
                                headers: {
                                    'Content-Type': 'application/json',
                                },
                                body: JSON.stringify({
                                    id: kb.id,
                                    enabled: kb.enabled
                                })
                            });

                            if (statusResponse.ok) {
                                // Update the status in the UI based on the new enabled state
                                setKbStatuses(prev => ({
                                    ...prev,
                                    [kb.id]: kb.enabled ? 'initializing' : 'disabled'
                                }));

                                // If enabled, start polling for status updates
                                if (kb.enabled) {
                                    pollKnowledgeBaseStatus(kb.id);
                                }
                            }
                        }
                    }
                } else {
                    // For owners, process all changes as before

                    // Check for deleted KBs and KBs with significant changes
                    for (const initialKB of initialKBs) {
                        const currentKB = currentKBs.find(kb => kb.id === initialKB.id);

                        if (!currentKB) {
                            // KB was deleted - remove it from the backend
                            const deleteResponse = await fetch(`/api/kb/delete_kb`, {
                                method: 'POST',
                                headers: {
                                    'Content-Type': 'application/json',
                                },
                                body: JSON.stringify({ id: initialKB.id })
                            });

                            if (deleteResponse.ok) {
                                // Also remove it from the status tracking
                                setKbStatuses(prev => {
                                    const newStatuses = { ...prev };
                                    delete newStatuses[initialKB.id];
                                    return newStatuses;
                                });

                                console.log(`Successfully deleted knowledge base ${initialKB.id}`);
                            } else {
                                console.error(`Failed to delete knowledge base ${initialKB.id}`);
                            }
                        } else {
                            // Check if significant fields have changed (other than description or enabled status)
                            const hasSignificantChanges =
                                initialKB.name !== currentKB.name ||
                                initialKB.sourceType !== currentKB.sourceType ||
                                initialKB.url !== currentKB.url;

                            if (hasSignificantChanges) {
                                // Mark for recreation
                                kbsToRecreate.push({
                                    oldId: initialKB.id,
                                    newKB: currentKB
                                });
                            }
                        }
                    }

                    // Handle KBs that need to be recreated due to significant changes
                    for (const { oldId, newKB } of kbsToRecreate) {
                        // First delete the old KB
                        const deleteResponse = await fetch(`/api/kb/delete_kb`, {
                            method: 'POST',
                            headers: {
                                'Content-Type': 'application/json',
                            },
                            body: JSON.stringify({ id: oldId })
                        });

                        if (deleteResponse.ok) {
                            console.log(`Successfully deleted knowledge base ${oldId} for recreation`);

                            // Remove old status
                            setKbStatuses(prev => {
                                const newStatuses = { ...prev };
                                delete newStatuses[oldId];
                                return newStatuses;
                            });

                            // Then register as new
                            await registerKnowledgeBase(newKB);
                        } else {
                            console.error(`Failed to delete knowledge base ${oldId} for recreation`);
                        }
                    }

                    // Process each remaining knowledge base (new or status change only)
                    for (const kb of currentKBs) {
                        const initialKB = initialKBs.find((item: KnowledgeBaseItem) => item.id === kb.id);
                        const isBeingRecreated = kbsToRecreate.some(item => item.newKB.id === kb.id);

                        // Skip if this KB is being recreated (already handled above)
                        if (isBeingRecreated) continue;

                        // If this is a new KB
                        if (!initialKB) {
                            // New KB - register it
                            await registerKnowledgeBase(kb);
                        } else if (initialKB.enabled !== kb.enabled) {
                            // Only status changed - update it
                            const statusResponse = await fetch(`/api/kb/update_kb_status`, {
                                method: 'POST',
                                headers: {
                                    'Content-Type': 'application/json',
                                },
                                body: JSON.stringify({
                                    id: kb.id,
                                    enabled: kb.enabled
                                })
                            });

                            if (statusResponse.ok) {
                                // Update the status in the UI based on the new enabled state
                                setKbStatuses(prev => ({
                                    ...prev,
                                    [kb.id]: kb.enabled ? 'initializing' : 'disabled'
                                }));

                                // If enabled, start polling for status updates
                                if (kb.enabled) {
                                    pollKnowledgeBaseStatus(kb.id);
                                }
                            }
                        }
                    }
                }
            }

            // Update Redux store with properly structured settings
            dispatch(setUserSettings(updatedUserSettings));

            // Update initial settings string to disable save button
            setInitialSettingsString(JSON.stringify(settings));

            toaster.create({
                title: t("settings_saved"),
                description: t("settings_saved_description"),
                duration: 3000,
            });
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

    // Helper function to get status color
    const getStatusColor = (status: 'disabled' | 'connecting' | 'connected' | 'unconfigured') => {
        switch (status) {
            case 'disabled':
                return colors.statusFailure;
            case 'connecting':
                return colors.statusPending;
            case 'connected':
                return colors.statusSuccess;
            case 'unconfigured':
                return colors.statusRunning;
            default:
                return colors.textColorMuted;
        }
    };

    // Helper function to get status label
    const getStatusLabel = (status: 'disabled' | 'connecting' | 'connected' | 'unconfigured') => {
        switch (status) {
            case 'disabled':
                return t("disabled") || "Disabled";
            case 'connecting':
                return t("connecting") || "Connecting...";
            case 'connected':
                return t("connected") || "Connected";
            case 'unconfigured':
                return t("needsConfiguration") || "Needs Configuration";
            default:
                return t("unknown") || "Unknown";
        }
    };

    // Handle adding a new knowledge base item
    const handleAddKB = () => {
        if (!newKBItem.name || !newKBItem.id) {
            toaster.create({
                title: t("error"),
                description: t("kb_name_id_required") || "Name and ID are required",
                duration: 3000,
            });
            return;
        }

        // Use nullish coalescing to ensure knowledgeBases is an array before spreading
        const updatedKBs = [...(settings.knowledgeBases ?? []), newKBItem];
        handleSettingsChange({ knowledgeBases: updatedKBs });
        setNewKBItem({
            name: "",
            description: "",
            id: "",
            enabled: true,
            sourceType: "",
        });
        setIsAddingKB(false);
    };

    // Define a more extensive list of source types with icons
    const allSourceOptions = [
        { label: "Local Store", value: "local_store", icon: FiDatabase },
        { label: "Notion", value: "notion", icon: FiFile, disabled: true },
        { label: "SharePoint", value: "sharepoint", icon: FiShare2, disabled: true },
        { label: "Google Drive", value: "gdrive", icon: FiCloud, disabled: true },
        { label: "OneDrive", value: "onedrive", icon: FiCloud, disabled: true },
        { label: "Dropbox", value: "dropbox", icon: FiBox, disabled: true },
        { label: "Web Crawler", value: "webcrawler", icon: FiGlobe, disabled: true },
        { label: "S3 Bucket", value: "s3", icon: FiServer, disabled: true },
        { label: "Azure Blob", value: "azure", icon: FiHardDrive, disabled: true },
        { label: "Confluence", value: "confluence", icon: FiBookmark, disabled: true },
        { label: "GitHub", value: "github", icon: FiArchive, disabled: true },
        { label: "Jira", value: "jira", icon: FiFolder, disabled: true },
    ];

    // Filter source options based on search
    const filteredSourceOptions = allSourceOptions.filter(option =>
        option.label.toLowerCase().includes(sourceSearch.toLowerCase())
    );

    // Calculate pagination
    const totalPages = Math.ceil(filteredSourceOptions.length / itemsPerPage);
    const paginatedSourceOptions = filteredSourceOptions.slice(
        (currentPage - 1) * itemsPerPage,
        currentPage * itemsPerPage
    );

    // Add function to register a KB
    const registerKnowledgeBase = async (kbItem: KnowledgeBaseItem) => {
        try {
            const response = await fetch('/api/kb/register_kb', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    id: kbItem.id,
                    name: kbItem.name,
                    description: kbItem.description || "",
                    source_type: kbItem.sourceType,
                    url: kbItem.url || "",
                    enabled: kbItem.enabled
                }),
            });

            if (!response.ok) {
                throw new Error('Failed to register knowledge base');
            }

            const result = await response.json();

            // Start polling for status
            pollKnowledgeBaseStatus(kbItem.id);

            toaster.create({
                title: t("kb_registered"),
                description: t("kb_registered_description"),
                duration: 3000,
            });

            return result;
        } catch (error) {
            console.error("Error registering knowledge base:", error);
            toaster.create({
                title: t("error"),
                description: error instanceof Error ? error.message : "An unknown error occurred",
                duration: 5000,
            });
            return null;
        }
    };

    // Add function to poll KB status
    const pollKnowledgeBaseStatus = (kbId: string) => {
        // Set initial status
        setKbStatuses(prev => ({ ...prev, [kbId]: 'initializing' }));

        const checkStatus = async () => {
            try {
                const response = await fetch(`/api/kb/kb_status/${kbId}`);
                if (!response.ok) {
                    throw new Error('Failed to check knowledge base status');
                }

                const result = await response.json();
                const status = result.status as KBStatus;

                setKbStatuses(prev => ({ ...prev, [kbId]: status }));

                // Continue polling if still initializing
                if (status === 'initializing') {
                    setTimeout(checkStatus, 5000);
                }
            } catch (error) {
                console.error("Error checking knowledge base status:", error);
                setKbStatuses(prev => ({ ...prev, [kbId]: 'error' }));
            }
        };

        // Start checking
        checkStatus();
    };

    // Load initial KB statuses
    useEffect(() => {
        const loadKnowledgeBaseStatuses = async () => {
            if (!settings.knowledgeBases || settings.knowledgeBases.length === 0) return;

            for (const kb of settings.knowledgeBases) {
                if (kb.id) {
                    pollKnowledgeBaseStatus(kb.id);
                }
            }
        };

        loadKnowledgeBaseStatuses();
    }, [settings.knowledgeBases]);

    // Helper function to get status color for KB items
    const getKbStatusColor = (kbId: string) => {
        const status = kbStatuses[kbId] || 'not_found';
        switch (status) {
            case 'running':
                return colors.statusSuccess;
            case 'initializing':
                return colors.statusPending;
            case 'error':
                return colors.statusFailure;
            case 'disabled':
                return colors.textColorMuted;
            case 'not_found':
            default:
                return colors.textColorMuted;
        }
    };

    // Helper function to get status label for KB items
    const getKbStatusLabel = (kbId: string) => {
        const status = kbStatuses[kbId] || 'not_found';
        switch (status) {
            case 'running':
                return t("kb_running") || "Running";
            case 'initializing':
                return t("kb_initializing") || "Initializing";
            case 'error':
                return t("kb_error") || "Error";
            case 'disabled':
                return t("kb_disabled") || "Disabled";
            case 'not_found':
            default:
                return t("kb_not_found") || "Not Found";
        }
    };

    // Modify the handleAddKnowledgeBase function to only update local state
    const handleAddKnowledgeBase = () => {
        // Prevent non-owners from adding knowledge base items
        if (!isOwner) {
            toaster.create({
                title: t("error"),
                description: t("owner_only_feature") || "This feature is only available to owners",
                duration: 3000,
            });
            return;
        }

        if (!newKBItem.name) {
            toaster.create({
                title: t("error"),
                description: t("kb_name_required") || "Name is required",
                duration: 3000,
            });
            return;
        }

        if (!newKBItem.sourceType) {
            toaster.create({
                title: t("error"),
                description: t("kb_source_type_required") || "Source type is required",
                duration: 3000,
            });
            return;
        }

        // Add validation for path when local_store is selected
        if (newKBItem.sourceType === "local_store" && !newKBItem.url) {
            toaster.create({
                title: t("error"),
                description: t("kb_path_required") || "Local path is required",
                duration: 3000,
            });
            return;
        }

        // Generate a UUID if not editing an existing item
        let itemToSave = { ...newKBItem };
        if (!itemToSave.id) {
            itemToSave.id = uuidv4();
        }

        // Check if we're editing an existing item
        const isEditing = (settings.knowledgeBases ?? []).some(kb => kb.id === itemToSave.id);

        // Update the knowledge bases array in local state only
        if (isEditing) {
            // Update existing item
            const updatedKBs = (settings.knowledgeBases ?? []).map(kb =>
                kb.id === itemToSave.id ? itemToSave : kb
            );
            handleSettingsChange({ knowledgeBases: updatedKBs });
        } else {
            // Add new item
            const updatedKBs = [...(settings.knowledgeBases ?? []), itemToSave];
            handleSettingsChange({ knowledgeBases: updatedKBs });
        }

        // Close the dialog
        setIsAddingKB(false);

        // Show a message that changes will take effect after saving
        toaster.create({
            title: isEditing ? t("kb_updated") || "Knowledge base updated" : t("kb_added") || "Knowledge base added",
            description: t("save_to_apply_changes") || "Click 'Save Changes' to apply these changes",
            duration: 5000,
        });
    };

    // Modify the KB item handling functions to only update local state
    const handleKbStatusChange = (kbId: string, enabled: boolean) => {
        // Update the local state for the knowledge base item
        const currentKBs = settings.knowledgeBases ?? [];
        const updatedKBs = currentKBs.map(kb =>
            kb.id === kbId ? { ...kb, enabled } : kb
        );
        handleSettingsChange({ knowledgeBases: updatedKBs });

        // Also update the status in the UI immediately
        setKbStatuses(prev => ({
            ...prev,
            [kbId]: enabled ? (prev[kbId] === 'disabled' ? 'initializing' : prev[kbId]) : 'disabled'
        }));
    };

    const handleDeleteKb = (kbId: string) => {
        // Only update the local state, don't call the API yet
        const currentKBs = settings.knowledgeBases ?? [];
        const updatedKBs = currentKBs.filter(kb => kb.id !== kbId);
        handleSettingsChange({ knowledgeBases: updatedKBs });
    };

    // Modify the handleReinitializeKb function to first show confirmation
    const handleReinitializeKb = (kbId: string) => {
        // Set the KB ID to be reinitialized
        setConfirmReinitKbId(kbId);
    };

    // Add a function to actually perform the reinitialization after confirmation
    const confirmReinitializeKb = async () => {
        if (!confirmReinitKbId) return;

        try {
            const kbId = confirmReinitKbId;
            // Clear the confirmation state
            setConfirmReinitKbId(null);

            // Set status to initializing in the UI immediately
            setKbStatuses(prev => ({ ...prev, [kbId]: 'initializing' }));

            // Find the KB item
            const kbItem = (settings.knowledgeBases || []).find(kb => kb.id === kbId);
            if (!kbItem) {
                throw new Error('Knowledge base not found');
            }

            // Use the existing register_kb endpoint
            const response = await fetch('/api/kb/register_kb', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    id: kbId,
                    name: kbItem.name,
                    description: kbItem.description || "",
                    source_type: kbItem.sourceType,
                    url: kbItem.url || "",
                    enabled: kbItem.enabled
                }),
            });

            if (!response.ok) {
                throw new Error('Failed to reinitialize knowledge base');
            }

            // Start polling for status
            pollKnowledgeBaseStatus(kbId);

            toaster.create({
                title: t("kb_reinitialized") || "Knowledge base reinitialized",
                description: t("kb_reinitialized_description") || "The knowledge base is being reinitialized",
                duration: 3000,
            });
        } catch (error) {
            console.error("Error reinitializing knowledge base:", error);
            // Store kbId in a variable before clearing confirmReinitKbId
            const kbId = confirmReinitKbId;
            setConfirmReinitKbId(null);
            setKbStatuses(prev => ({ ...prev, [kbId]: 'error' }));

            toaster.create({
                title: t("error"),
                description: error instanceof Error ? error.message : "An unknown error occurred",
                duration: 5000,
            });
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
                    disabled={!hasChanges || isSaving}
                    onClick={handleSave}
                >
                    {t("save_changes")}
                </Button>
            </Flex>
            <Separator mb={6} />

            {/* Knowledge Base Items Section Header */}
            <Flex justifyContent="space-between" alignItems="center" mb={3}>
                <VStack align="start" gap={0}>
                    <Flex alignItems="center">
                        <Icon as={FiDatabase} mr={2} />
                        <Heading size="sm" color={headingColor}>{t("knowledge_base_items") || "Knowledge Base Items"}</Heading>
                    </Flex>
                    <Text fontSize="xs" color={textDescColor}>
                        {t("knowledge_base_items_description") || "Configure individual knowledge bases for different types of information"}
                    </Text>
                </VStack>
                <Button
                    size="xs"
                    colorScheme="blue"
                    variant="solid"
                    onClick={() => setIsAddingKB(true)}
                    disabled={!isOwner}
                    title={!isOwner ? t("owner_only_feature") || "This feature is only available to owners" : ""}
                >
                    {t("add_kb_item") || "Add Item"}
                </Button>
            </Flex>

            {/* Knowledge Base Items - No Container Wrapping */}
            {(settings.knowledgeBases ?? []).length > 0 ? (
                (settings.knowledgeBases ?? []).map((kb, index) => (
                    <Box
                        key={kb.id || index}
                        p={3}
                        borderWidth="1px"
                        borderRadius="md"
                        borderColor={cardBorderColor}
                        mt={3}
                        bg={cardBg}
                        boxShadow="sm"
                    >
                        <Flex justifyContent="space-between" alignItems="center">
                            <VStack align="start" gap={0}>
                                <Flex alignItems="center">
                                    <Text fontWeight="medium" color={colors.textColorHeading}>{kb.name}</Text>
                                    <Box
                                        w="6px"
                                        h="6px"
                                        borderRadius="full"
                                        bg={getKbStatusColor(kb.id)}
                                        boxShadow={`0 0 2px ${getKbStatusColor(kb.id)}`}
                                        ml={2}
                                        opacity={0.7}
                                    />
                                    <Text fontSize="xs" ml={1} color={getKbStatusColor(kb.id)}>
                                        {getKbStatusLabel(kb.id)}
                                    </Text>
                                </Flex>
                                <Text fontSize="xs" color={colors.textColorMuted}>{kb.description}</Text>
                                <Text fontSize="xs" color={colors.textColorMuted}>
                                    {kb.sourceType ?
                                        `Type: ${allSourceOptions.find(opt => opt.value === kb.sourceType)?.label || kb.sourceType}` :
                                        "Type: Not specified"}
                                </Text>
                            </VStack>
                            <HStack gap={2}>
                                <Button
                                    size="xs"
                                    colorScheme="blue"
                                    variant="ghost"
                                    onClick={() => {
                                        setNewKBItem({ ...kb });
                                        setIsAddingKB(true);
                                    }}
                                    disabled={!isOwner}
                                    title={!isOwner ? t("owner_only_feature") || "This feature is only available to owners" : ""}
                                >
                                    {t("edit") || "Edit"}
                                </Button>
                                <Button
                                    size="xs"
                                    colorScheme="purple"
                                    variant="ghost"
                                    onClick={() => handleReinitializeKb(kb.id)}
                                    disabled={kbStatuses[kb.id] === 'initializing'}
                                >
                                    <Icon as={FiRefreshCw} mr={1} />
                                    {t("reinitialize") || "Reinitialize"}
                                </Button>
                                <Switch.Root
                                    colorScheme="blue"
                                    checked={kb.enabled}
                                    onCheckedChange={(e) => {
                                        handleKbStatusChange(kb.id, e.checked);
                                    }}
                                >
                                    <Switch.HiddenInput />
                                    <Switch.Control>
                                        <Switch.Thumb />
                                    </Switch.Control>
                                </Switch.Root>
                                <IconButton
                                    aria-label="Delete knowledge base"
                                    size="xs"
                                    variant="ghost"
                                    onClick={() => handleDeleteKb(kb.id)}
                                    disabled={!isOwner}
                                    title={!isOwner ? t("owner_only_feature") || "This feature is only available to owners" : ""}
                                >
                                    <Icon as={FaTrash} />
                                </IconButton>
                            </HStack>
                        </Flex>
                    </Box>
                ))
            ) : (
                <Text color={textDescColor} fontSize="sm" textAlign="center" py={4}>
                    {t("no_kb_items") || "No knowledge base items configured"}
                </Text>
            )}

            {/* Configuration Dialog */}
            <Dialog.Root open={configureOpen} onOpenChange={(e) => setConfigureOpen(e.open)}>
                <Portal>
                    <Dialog.Backdrop />
                    <Dialog.Positioner>
                        <Dialog.Content
                            maxWidth="500px"
                            bg={colors.cardBg}
                            borderColor={colors.borderColor}
                        >
                            <Dialog.Header
                                borderBottomWidth="1px"
                                borderBottomColor={colors.borderColor}
                                bg={colors.bgColor}
                            >
                                <Dialog.Title color={colors.textColorHeading}>
                                    {t("configure_knowledge_base") || "Configure Knowledge Base"}
                                </Dialog.Title>
                                <Dialog.CloseTrigger asChild>
                                    <CloseButton size="sm" color={colors.textColor} />
                                </Dialog.CloseTrigger>
                            </Dialog.Header>

                            <Dialog.Body>
                                <VStack gap={4} align="stretch">
                                    <FormControl isRequired>
                                        <FormLabel htmlFor="source" color={formLabelColor} fontWeight="bold">
                                            {t("source") || "Source"}
                                        </FormLabel>
                                        <Input
                                            id="source"
                                            value={settings.source}
                                            onChange={(e) => handleSettingsChange({ source: e.target.value })}
                                            placeholder={t("source_placeholder") || "e.g., qdrant, pinecone, etc."}
                                            bg={colors.cardBg}
                                            borderColor={colors.borderColor}
                                            color={colors.textColor}
                                            _placeholder={{ color: colors.textColorMuted }}
                                        />
                                    </FormControl>

                                    <FormControl isRequired>
                                        <FormLabel htmlFor="apiKey" color={formLabelColor} fontWeight="bold">
                                            {t("api_key") || "API Key"}
                                        </FormLabel>
                                        <Input
                                            id="apiKey"
                                            value={settings.apiKey}
                                            onChange={(e) => handleSettingsChange({ apiKey: e.target.value })}
                                            placeholder={t("api_key_placeholder") || "Your API key"}
                                            type="password"
                                            bg={colors.cardBg}
                                            borderColor={colors.borderColor}
                                            color={colors.textColor}
                                            _placeholder={{ color: colors.textColorMuted }}
                                        />
                                    </FormControl>

                                    <FormControl>
                                        <FormLabel htmlFor="apiUrl" color={formLabelColor} fontWeight="bold">
                                            {t("api_url") || "API URL"} ({t("optional") || "Optional"})
                                        </FormLabel>
                                        <Input
                                            id="apiUrl"
                                            value={settings.apiUrl}
                                            onChange={(e) => handleSettingsChange({ apiUrl: e.target.value })}
                                            placeholder={t("api_url_placeholder") || "Custom API endpoint URL"}
                                            bg={colors.cardBg}
                                            borderColor={colors.borderColor}
                                            color={colors.textColor}
                                            _placeholder={{ color: colors.textColorMuted }}
                                        />
                                    </FormControl>
                                </VStack>
                            </Dialog.Body>

                            <Dialog.Footer
                                borderTopWidth="1px"
                                borderTopColor={colors.borderColor}
                                bg={colors.bgColor}
                            >
                                <Button
                                    variant="ghost"
                                    mr={3}
                                    onClick={() => setConfigureOpen(false)}
                                    color={colors.textColor}
                                    _hover={{ bg: colors.hoverBg }}
                                >
                                    {t("cancel")}
                                </Button>
                                <Button
                                    bg={colors.accentColor}
                                    onClick={handleSaveConfig}
                                >
                                    {t("save")}
                                </Button>
                            </Dialog.Footer>
                        </Dialog.Content>
                    </Dialog.Positioner>
                </Portal>
            </Dialog.Root>

            {/* Add/Edit Knowledge Base Dialog */}
            <Dialog.Root open={isAddingKB} onOpenChange={(e) => setIsAddingKB(e.open)}>
                <Portal>
                    <Dialog.Backdrop />
                    <Dialog.Positioner>
                        <Dialog.Content maxWidth="600px" bg={colors.cardBg} borderColor={colors.borderColor}>
                            <Dialog.Header borderBottomColor={colors.borderColor}>
                                <Dialog.Title color={colors.textColorHeading}>
                                    {newKBItem.id && (settings.knowledgeBases ?? []).some(kb => kb.id === newKBItem.id) ?
                                        (t("edit_knowledge_base") || "Edit Knowledge Base") :
                                        (t("add_knowledge_base") || "Add Knowledge Base")}
                                </Dialog.Title>
                                <Dialog.CloseTrigger asChild>
                                    <CloseButton size="sm" color={colors.textColor} />
                                </Dialog.CloseTrigger>
                            </Dialog.Header>

                            <Dialog.Body>
                                <VStack gap={4} align="stretch">
                                    <FormControl isRequired>
                                        <FormLabel
                                            htmlFor="kbName"
                                            fontSize="sm"
                                            color={formLabelColor}
                                            fontWeight="bold"
                                        >
                                            {t("kb_name") || "Name"}
                                        </FormLabel>
                                        <Input
                                            id="kbName"
                                            placeholder={t("kb_name_placeholder") || "e.g., Project Documentation"}
                                            value={newKBItem.name}
                                            onChange={(e) => setNewKBItem({ ...newKBItem, name: e.target.value })}
                                            size="sm"
                                            bg={colors.cardBg}
                                            borderColor={colors.borderColor}
                                            color={colors.textColor}
                                            _placeholder={{ color: colors.textColorMuted }}
                                        />
                                    </FormControl>

                                    <FormControl>
                                        <FormLabel
                                            htmlFor="kbDescription"
                                            fontSize="sm"
                                            color={formLabelColor}
                                            fontWeight="bold"
                                        >
                                            {t("kb_description") || "Description"}
                                        </FormLabel>
                                        <Input
                                            id="kbDescription"
                                            placeholder={t("kb_description_placeholder") || "Brief description of this knowledge base"}
                                            value={newKBItem.description}
                                            onChange={(e) => setNewKBItem({ ...newKBItem, description: e.target.value })}
                                            size="sm"
                                            bg={colors.cardBg}
                                            borderColor={colors.borderColor}
                                            color={colors.textColor}
                                            _placeholder={{ color: colors.textColorMuted }}
                                        />
                                    </FormControl>

                                    <FormControl>
                                        <FormLabel
                                            htmlFor="kbSourceType"
                                            fontSize="sm"
                                            color={formLabelColor}
                                            fontWeight="bold"
                                        >
                                            {t("source_type") || "Source Type"}
                                        </FormLabel>

                                        {/* Search bar - full width and aligned */}
                                        <Box mb={4} width="100%">
                                            <Flex
                                                width="100%"
                                                position="relative"
                                                alignItems="center"
                                                border="1px solid"
                                                borderColor={colors.borderColor}
                                                borderRadius="md"
                                                overflow="hidden"
                                            >
                                                <Input
                                                    placeholder="Search source types..."
                                                    value={sourceSearch}
                                                    onChange={(e) => {
                                                        setSourceSearch(e.target.value);
                                                        setCurrentPage(1); // Reset to first page on search
                                                    }}
                                                    size="sm"
                                                    border="none"
                                                    _focus={{ boxShadow: "none" }}
                                                    paddingRight="40px"
                                                    bg={colors.cardBg}
                                                    color={colors.textColor}
                                                    _placeholder={{ color: colors.textColorMuted }}
                                                />
                                                <Icon
                                                    as={FiSearch}
                                                    position="absolute"
                                                    right="12px"
                                                    color={colors.textColorMuted}
                                                    fontSize="16px"
                                                />
                                            </Flex>
                                        </Box>

                                        {/* Grid of source types - always 2 rows of 4 items */}
                                        <Box
                                            mb={4}
                                            height="160px" // Fixed height for 2 rows
                                            overflow="hidden"
                                        >
                                            <SimpleGrid columns={4} gap={3} height="100%">
                                                {paginatedSourceOptions.length > 0 ? (
                                                    paginatedSourceOptions.map((option) => (
                                                        <Box
                                                            key={option.value}
                                                            p={3}
                                                            borderWidth="1px"
                                                            borderRadius="md"
                                                            borderColor={newKBItem.sourceType === option.value ? colors.selectedBorder : colors.borderColor}
                                                            bg={newKBItem.sourceType === option.value ? colors.subtleSelectedItemBg : colors.cardBg}
                                                            cursor={option.disabled ? "not-allowed" : "pointer"}
                                                            onClick={() => !option.disabled && setNewKBItem({ ...newKBItem, sourceType: option.value })}
                                                            textAlign="center"
                                                            transition="all 0.2s"
                                                            _hover={{
                                                                borderColor: option.disabled ? colors.borderColor : colors.selectedBorderColor,
                                                                boxShadow: option.disabled ? "none" : `0 0 0 1px ${colors.selectedBorderColor}`
                                                            }}
                                                            display="flex"
                                                            flexDirection="column"
                                                            alignItems="center"
                                                            justifyContent="center"
                                                            position="relative"
                                                            overflow="hidden"
                                                            opacity={option.disabled ? 0.5 : 1}
                                                        >
                                                            {newKBItem.sourceType === option.value && (
                                                                <Box
                                                                    position="absolute"
                                                                    top="0"
                                                                    right="0"
                                                                    width="0"
                                                                    height="0"
                                                                    borderStyle="solid"
                                                                    borderWidth="0 24px 24px 0"
                                                                    borderColor={`transparent ${colors.accentColor} transparent transparent`}
                                                                    opacity={1}
                                                                />
                                                            )}
                                                            <Icon
                                                                as={option.icon}
                                                                fontSize="24px"
                                                                mb={2}
                                                                color={newKBItem.sourceType === option.value ? colors.accentColor : colors.textColor}
                                                            />
                                                            <Text
                                                                fontSize="xs"
                                                                fontWeight={newKBItem.sourceType === option.value ? "semibold" : "medium"}
                                                                lineHeight="1.2"
                                                                color={colors.textColor}
                                                            >
                                                                {option.label}
                                                            </Text>
                                                            {option.disabled && (
                                                                <Text fontSize="9px" color={colors.textColorMuted} mt={1}>
                                                                    Coming soon
                                                                </Text>
                                                            )}
                                                        </Box>
                                                    ))
                                                ) : (
                                                    <Box
                                                        gridColumn="span 4"
                                                        textAlign="center"
                                                        py={6}
                                                        color="gray.500"
                                                    >
                                                        No source types found matching your search
                                                    </Box>
                                                )}
                                            </SimpleGrid>
                                        </Box>

                                        {/* Pagination controls - centered and more elegant */}
                                        {totalPages > 1 && (
                                            <Flex justifyContent="center" alignItems="center" mt={2}>
                                                <Button
                                                    size="xs"
                                                    variant="ghost"
                                                    onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                                                    disabled={currentPage === 1}
                                                    mr={1}
                                                >
                                                    Previous
                                                </Button>

                                                {/* Page numbers */}
                                                <Flex alignItems="center">
                                                    {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                                                        <Box
                                                            key={page}
                                                            w="24px"
                                                            h="24px"
                                                            borderRadius="full"
                                                            bg={currentPage === page ? colors.accentColor : "transparent"}
                                                            color={currentPage === page ? "white" : colors.textColor}
                                                            display="flex"
                                                            alignItems="center"
                                                            justifyContent="center"
                                                            cursor="pointer"
                                                            fontSize="xs"
                                                            fontWeight="medium"
                                                            mx={0.5}
                                                            onClick={() => setCurrentPage(page)}
                                                        >
                                                            {page}
                                                        </Box>
                                                    ))}
                                                </Flex>

                                                <Button
                                                    size="xs"
                                                    variant="ghost"
                                                    onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                                                    disabled={currentPage === totalPages}
                                                    ml={1}
                                                >
                                                    Next
                                                </Button>
                                            </Flex>
                                        )}

                                        {/* Hidden input for form submission */}
                                        <Input
                                            type="hidden"
                                            value={newKBItem.sourceType || ""}
                                        />
                                    </FormControl>

                                    {/* Dynamic fields based on source type selection */}
                                    {!newKBItem.sourceType ? (
                                        <Box
                                            p={4}
                                            borderWidth="1px"
                                            borderRadius="md"
                                            borderStyle="dashed"
                                            borderColor={colors.borderColor}
                                            textAlign="center"
                                        >
                                            <Text fontSize="sm" color={colors.textColorMuted}>
                                                {t("please_select_source_type") || "Please select a source type first"}
                                            </Text>
                                        </Box>
                                    ) : (
                                        <>
                                            {/* Source-specific fields */}
                                            {newKBItem.sourceType === "local_store" && (
                                                <FormControl isRequired>
                                                    <FormLabel
                                                        htmlFor="kbPath"
                                                        fontSize="sm"
                                                        color={formLabelColor}
                                                        fontWeight="bold"
                                                    >
                                                        {t("kb_path") || "Local Path"}
                                                    </FormLabel>
                                                    <Input
                                                        id="kbPath"
                                                        placeholder={t("kb_path_placeholder") || "e.g., /path/to/documents"}
                                                        value={newKBItem.url || ""}
                                                        onChange={(e) => setNewKBItem({ ...newKBItem, url: e.target.value })}
                                                        size="sm"
                                                        bg={colors.cardBg}
                                                        borderColor={colors.borderColor}
                                                        color={colors.textColor}
                                                        _placeholder={{ color: colors.textColorMuted }}
                                                    />
                                                    <Text fontSize="xs" color={helpTextColor} mt={1}>
                                                        {t("kb_path_help") || "Specify the absolute path to your document folder"}
                                                    </Text>
                                                </FormControl>
                                            )}

                                            {/* Add other source type specific fields here in the future */}
                                        </>
                                    )}

                                    <FormControl>
                                        <FormLabel
                                            htmlFor="kbEnabled"
                                            fontSize="sm"
                                            color={formLabelColor}
                                            fontWeight="bold"
                                        >
                                            {t("kb_enabled") || "Enabled"}
                                        </FormLabel>
                                        <Switch.Root
                                            id="kbEnabled"
                                            colorScheme="blue"
                                            checked={newKBItem.enabled}
                                            onCheckedChange={(e) => setNewKBItem({ ...newKBItem, enabled: e.checked })}
                                        >
                                            <Switch.HiddenInput />
                                            <Switch.Control>
                                                <Switch.Thumb />
                                            </Switch.Control>
                                        </Switch.Root>
                                    </FormControl>
                                </VStack>
                            </Dialog.Body>

                            <Dialog.Footer borderTopColor={colors.borderColor}>
                                <Button variant="ghost" mr={3} onClick={() => setIsAddingKB(false)} color={colors.textColor}>
                                    {t("cancel")}
                                </Button>
                                <Button
                                    colorScheme="blue"
                                    onClick={handleAddKnowledgeBase}
                                >
                                    {newKBItem.id && (settings.knowledgeBases ?? []).some(kb => kb.id === newKBItem.id) ?
                                        (t("update") || "Update") :
                                        (t("add") || "Add")}
                                </Button>
                            </Dialog.Footer>
                        </Dialog.Content>
                    </Dialog.Positioner>
                </Portal>
            </Dialog.Root>

            {/* Confirmation Dialog for Reinitialization */}
            <Dialog.Root
                open={confirmReinitKbId !== null}
                onOpenChange={(e) => {
                    if (!e.open) {
                        setConfirmReinitKbId(null);
                    }
                }}
            >
                <Portal>
                    <Dialog.Backdrop />
                    <Dialog.Positioner>
                        <Dialog.Content maxWidth="400px" bg={colors.cardBg} borderColor={colors.borderColor}>
                            <Dialog.Header borderBottomColor={colors.borderColor}>
                                <Dialog.Title color={colors.textColorHeading}>
                                    {t("confirm_reinitialize") || "Confirm Reinitialization"}
                                </Dialog.Title>
                                <Dialog.CloseTrigger asChild>
                                    <CloseButton size="sm" color={colors.textColor} />
                                </Dialog.CloseTrigger>
                            </Dialog.Header>

                            <Dialog.Body>
                                <Text color={colors.textColor}>
                                    {t("confirm_reinitialize_description") ||
                                        "Are you sure you want to reinitialize this knowledge base? This will rebuild the index from scratch."}
                                </Text>
                            </Dialog.Body>

                            <Dialog.Footer borderTopColor={colors.borderColor}>
                                <Button
                                    variant="ghost"
                                    mr={3}
                                    onClick={() => setConfirmReinitKbId(null)}
                                    color={colors.textColor}
                                >
                                    {t("cancel")}
                                </Button>
                                <Button
                                    colorScheme="blue"
                                    onClick={confirmReinitializeKb}
                                >
                                    {t("reinitialize") || "Reinitialize"}
                                </Button>
                            </Dialog.Footer>
                        </Dialog.Content>
                    </Dialog.Positioner>
                </Portal>
            </Dialog.Root>
        </>
    );
}