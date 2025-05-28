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
    Spinner,
    Input,
    Icon,
    useDisclosure,
    IconButton,
    SimpleGrid,
    Switch,
    HStack,
    CloseButton,
    Dialog,
    Portal,
} from "@chakra-ui/react";
import { Collapse } from "@chakra-ui/transition"
import {
    FormControl,
    FormLabel,
} from "@chakra-ui/form-control";
import { FiChevronDown, FiChevronUp, FiServer, FiTool } from 'react-icons/fi';
import { useTranslations } from "next-intl";
import { useSelector, useDispatch } from 'react-redux';
import { RootState } from "@/store/store";
import { setUserSettings } from '@/store/features/userSlice';
import { toaster } from "@/components/ui/toaster";
import { useColorModeValue } from "@/components/ui/color-mode";
import { useSettingsColors } from "@/utils/colors";

// Define the Server and Tool types (can be moved to a types file)
interface InputSchemaProperty {
    title: string;
    type: string;
}

interface InputSchema {
    properties: Record<string, InputSchemaProperty>;
    required: string[];
    title: string;
    type: string;
}

interface ServerTool {
    name: string;
    description: string;
    input_schema: InputSchema;
}

interface Server {
    server_name: string;
    server_description: string;
    server_tools: ServerTool[];
}

// Define the structure for server-specific settings
interface ServerConfig {
    enabled: boolean;
    apiKey: string;
    // Add other server-specific settings here if needed
}

// Define the structure for the overall MCP settings state
interface MCPSettingsState {
    servers: Record<string, ServerConfig>; // Keyed by server name/ID
}

// --- Server Card Component ---
const ServerCard = ({
    serverKey,
    serverData,
    config,
    onConfigChange,
    isLoading,
}: {
    serverKey: string;
    serverData: Server;
    config: ServerConfig;
    onConfigChange: (serverKey: string, newConfig: Partial<ServerConfig>) => void;
    isLoading: boolean;
}) => {
    const t = useTranslations("Settings");
    const colors = useSettingsColors();
    const [configureOpen, setConfigureOpen] = useState(false);
    const [connectionStatus, setConnectionStatus] = useState<'disabled' | 'connecting' | 'connected' | 'unconfigured'>(
        !config.enabled ? 'disabled' :
            !config.apiKey ? 'unconfigured' :
                'connected'
    );

    // Update connection status when config changes
    useEffect(() => {
        if (!config.enabled) {
            setConnectionStatus('disabled');
        } else if (!config.apiKey) {
            setConnectionStatus('unconfigured');
        } else {
            setConnectionStatus('connected');
        }
    }, [config]);

    const handleSwitchChange = (e: { checked: boolean }) => {
        if (e.checked && !config.apiKey) {
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
                onConfigChange(serverKey, { enabled: true });
            }, 1000);
        } else {
            // If disabling
            setConnectionStatus('disabled');
            onConfigChange(serverKey, { enabled: false });
        }
    };

    const handleApiKeyChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        onConfigChange(serverKey, { apiKey: e.target.value });
    };

    const handleSaveConfig = () => {
        if (config.apiKey && config.enabled) {
            setConnectionStatus('connecting');
            // Simulate connection process
            setTimeout(() => {
                setConnectionStatus('connected');
            }, 1000);
        }
        setConfigureOpen(false);
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
                return "gray.500";
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

    return (
        <Box
            borderWidth="1px"
            borderRadius="lg"
            p={4}
            bg={colors.cardBg}
            borderColor={colors.borderColor}
            boxShadow="sm"
            opacity={isLoading ? 0.5 : 1}
            pointerEvents={isLoading ? 'none' : 'auto'}
        >
            <Flex justifyContent="space-between" alignItems="center" mb={3}>
                <VStack align="start" gap={0}>
                    <Flex alignItems="center">
                        <Icon as={FiServer} mr={2} />
                        <Heading size="sm" color={colors.textColorHeading}>{serverData.server_name}</Heading>
                        {/* Status indicator light */}
                        <Box
                            w="6px"
                            h="6px"
                            borderRadius="full"
                            bg={getStatusColor(connectionStatus)}
                            boxShadow={`0 0 2px ${getStatusColor(connectionStatus)}`}
                            ml={2}
                            opacity={0.7}
                        />
                        <Text fontSize="xs" ml={1} color={getStatusColor(connectionStatus)}>
                            {getStatusLabel(connectionStatus)}
                        </Text>
                    </Flex>
                    <Text fontSize="xs" color={colors.textColorMuted}>{serverData.server_description}</Text>
                </VStack>
                <HStack gap={2}>
                    <Button
                        size="xs"
                        colorScheme="blue"
                        variant="outline"
                        onClick={() => setConfigureOpen(true)}
                    >
                        {t("configure")}
                    </Button>
                    <Switch.Root
                        colorScheme="blue"
                        checked={config.enabled}
                        onCheckedChange={handleSwitchChange}
                        disabled={isLoading || connectionStatus === 'connecting'}
                    >
                        <Switch.HiddenInput />
                        <Switch.Control>
                            <Switch.Thumb />
                        </Switch.Control>
                    </Switch.Root>
                </HStack>
            </Flex>

            {/* Configuration Dialog */}
            <Dialog.Root open={configureOpen} onOpenChange={(e) => {
                if (!e.open) setConfigureOpen(false);
            }}>
                <Portal>
                    <Dialog.Backdrop />
                    <Dialog.Positioner>
                        <Dialog.Content maxWidth="500px" bg={colors.cardBg} borderColor={colors.borderColor}>
                            <Dialog.Header>
                                <Dialog.Title color={colors.textColorHeading}>
                                    {t("configureServer")} {serverData.server_name}
                                </Dialog.Title>
                                <Dialog.CloseTrigger asChild>
                                    <CloseButton size="sm" onClick={() => setConfigureOpen(false)} />
                                </Dialog.CloseTrigger>
                            </Dialog.Header>

                            <Dialog.Body>
                                <VStack gap={4} align="stretch">
                                    <FormControl isRequired>
                                        <FormLabel htmlFor={`${serverKey}-apiKey`} fontSize="sm" color={colors.textColorHeading}>
                                            {t("apiKeyLabel")}
                                        </FormLabel>
                                        <Input
                                            id={`${serverKey}-apiKey`}
                                            type="password"
                                            placeholder={t("apiKeyPlaceholder")}
                                            value={config.apiKey || ''}
                                            onChange={handleApiKeyChange}
                                            size="sm"
                                            disabled={isLoading || connectionStatus === 'connecting'}
                                            bg={colors.cardBg}
                                            borderColor={colors.borderColor}
                                            _hover={{ borderColor: colors.borderColor }}
                                        />
                                    </FormControl>

                                    {/* Tools section */}
                                    <Box>
                                        <Heading size="xs" mb={2} color={colors.textColorHeading}>{t("availableTools")}</Heading>
                                        <VStack align="stretch" gap={1} pl={2}>
                                            {serverData.server_tools.map(tool => (
                                                <Flex key={tool.name} align="center" fontSize="xs" color={colors.textColorMuted}>
                                                    <Icon as={FiTool} mr={2} /> {tool.name}
                                                    <Text fontSize="xs" ml={2} color={colors.textColorMuted}>
                                                        {tool.description}
                                                    </Text>
                                                </Flex>
                                            ))}
                                        </VStack>
                                    </Box>
                                </VStack>
                            </Dialog.Body>

                            <Dialog.Footer>
                                <Button variant="ghost" mr={3} onClick={() => setConfigureOpen(false)}>
                                    {t("cancel")}
                                </Button>
                                <Button
                                    colorScheme="blue"
                                    onClick={handleSaveConfig}
                                    loading={connectionStatus === 'connecting'}
                                >
                                    {t("save")}
                                </Button>
                            </Dialog.Footer>
                        </Dialog.Content>
                    </Dialog.Positioner>
                </Portal>
            </Dialog.Root>
        </Box>
    );
};


export default function MCPSettingsPage() {
    const t = useTranslations("Settings");
    const t_mcp = useTranslations("Settings"); // Namespace for MCP specific terms
    const userSettings = useSelector((state: RootState) => state.user.currentUser?.settings);
    const dispatch = useDispatch();
    const colors = useSettingsColors();

    const [isSaving, setIsSaving] = useState(false);
    const [loadingServers, setLoadingServers] = useState(true);
    const [serverError, setServerError] = useState<string | null>(null);
    const [mcpServers, setMcpServers] = useState<Record<string, Server>>({});
    const [settings, setSettings] = useState<MCPSettingsState>({
        servers: {},
    });
    const [initialSettingsString, setInitialSettingsString] = useState(''); // For change detection

    // Fetch available MCP Servers
    const fetchServers = useCallback(async () => {
        setLoadingServers(true);
        setServerError(null);
        try {
            const response = await fetch(`/api/mcp/get_servers`);
            if (!response.ok) {
                throw new Error(`Failed to fetch servers: ${response.statusText}`);
            }
            const data = await response.json();

            // Optional: Process descriptions (like removing "You ")
            Object.values(data as Record<string, Server>).forEach((server) => {
                if (server.server_description.startsWith("You ")) {
                    server.server_description = server.server_description.substring(4);
                }
            });

            setMcpServers(data);
        } catch (err) {
            console.error("Error fetching MCP servers:", err);
            setServerError(err instanceof Error ? err.message : 'An unknown error occurred');
            toaster.create({
                title: t("error"),
                description: t_mcp("fetchServerError"),
                duration: 5000,
            });
        } finally {
            setLoadingServers(false);
        }
    }, [t, t_mcp]);

    useEffect(() => {
        fetchServers();
    }, [fetchServers]);

    // Initialize settings state based on Redux store and fetched servers
    useEffect(() => {
        if (!userSettings || loadingServers) return; // Wait for user settings and servers

        const initialServerConfigs: Record<string, ServerConfig> = {};
        Object.keys(mcpServers).forEach(serverKey => {
            // Use a more aggressive type assertion to handle the unknown structure
            const mcpSettings = userSettings?.mcp as any;
            const savedConfig = mcpSettings?.servers?.[serverKey] || mcpSettings?.[serverKey];
            initialServerConfigs[serverKey] = {
                enabled: savedConfig?.enabled || false,
                apiKey: savedConfig?.apiKey || "",
            };
        });

        const initialFullSettings = {
            servers: initialServerConfigs,
        };

        setSettings(initialFullSettings);
        setInitialSettingsString(JSON.stringify(initialFullSettings));
    }, [userSettings, mcpServers, loadingServers]);

    // Calculate if changes have been made
    const hasChanges = JSON.stringify(settings) !== initialSettingsString;

    // Handle settings changes (unified handler)
    const handleSettingsChange = useCallback((
        type: 'server',
        key: string, // For servers, this is the setting name
        value: any, // The new value
        serverKey?: string // Only provided for server changes
    ) => {
        setSettings(prev => {
            const newState = JSON.parse(JSON.stringify(prev)); // Deep clone
            if (type === 'server' && serverKey) {
                if (!newState.servers[serverKey]) {
                    // Initialize if somehow missing (shouldn't happen with current logic)
                    newState.servers[serverKey] = { enabled: false, apiKey: '' };
                }
                // @ts-ignore - Allow dynamic key access
                newState.servers[serverKey][key] = value;
            }
            return newState;
        });
    }, []);

    // Handle save button click
    const handleSave = async () => {
        setIsSaving(true);
        try {
            // Create the updated user settings object with the new MCP structure
            const updatedUserSettings = {
                ...userSettings, // Keep existing settings
                mcp: {
                    ...userSettings?.mcp, // Keep any existing mcp settings
                    servers: settings.servers // Update only the servers part
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
                const errorData = await response.json().catch(() => ({})); // Try to get error details
                throw new Error(errorData.message || 'Failed to save settings');
            }

            // Update Redux store
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

    return (
        <>
            <Flex justifyContent="space-between" alignItems="center" mb={4}>
                <Heading size="md" color={colors.textColorHeading}>
                    {t("mcp")}
                </Heading>
                <Button
                    colorScheme="blue"
                    size="sm"
                    loading={isSaving}
                    disabled={!hasChanges || isSaving || loadingServers}
                    onClick={handleSave}
                >
                    {t("save_changes")}
                </Button>
            </Flex>
            <Separator mb={6} />

            <VStack gap={6} align="stretch">
                {/* Server Configurations */}
                <Box>
                    <Heading size="sm" mb={4} color={colors.textColorHeading}>{t_mcp("serverConfigurationTitle")}</Heading>
                    {loadingServers ? (
                        <Flex justify="center" align="center" p={10} bg={colors.subtleSelectedItemBg} borderRadius="md">
                            <Spinner size="lg" color={colors.accentColor} />
                            <Text ml={4} color={colors.textColor}>{t_mcp("loadingServers")}</Text>
                        </Flex>
                    ) : serverError ? (
                        <Text color={colors.statusFailure}>{t_mcp("fetchServerError")}: {serverError}</Text>
                    ) : Object.keys(mcpServers).length === 0 ? (
                        <Text color={colors.textColor}>{t_mcp("noServersFound")}</Text>
                    ) : (
                        <VStack gap={4} align="stretch">
                            {Object.entries(mcpServers).map(([serverKey, serverData]) => (
                                <ServerCard
                                    key={serverKey}
                                    serverKey={serverKey}
                                    serverData={serverData}
                                    config={settings.servers[serverKey] || { enabled: false, apiKey: '' }}
                                    onConfigChange={(serverKey, newConfig) => {
                                        // Map the ServerCard's expected function to our handler
                                        Object.entries(newConfig).forEach(([key, value]) => {
                                            handleSettingsChange('server', key, value, serverKey);
                                        });
                                    }}
                                    isLoading={isSaving}
                                />
                            ))}
                        </VStack>
                    )}
                </Box>
            </VStack>
        </>
    );
}