"use client"

import React, { useState, useEffect } from "react";
import {
    Box,
    Text,
    VStack,
    Icon,
    Button,
    HStack,
    Menu,
    Portal,
    Stack,
    Flex,
    IconButton,
    Badge,
    Card as ChakraCard,
    CardHeader,
    CardBody,
    Heading,
    Input,
    Dialog,
    CloseButton,
} from "@chakra-ui/react";
import { useTranslations } from "next-intl";
import { useColorModeValue } from "@/components/ui/color-mode";
import { FiBookOpen, FiPlus, FiChevronDown, FiTrash2 } from "react-icons/fi";
import { FaShareAlt, FaFileAlt, FaBook } from "react-icons/fa";
import { KnowledgeBaseSettings as KBSettings } from "@/types/user";

interface KnowledgeBaseSettingsProps {
    onSettingsChange: (settings: any) => void;
    settings: {
        enableKnowledgeBase?: boolean;
        [key: string]: any;
    };
}

type KnowledgeBaseType = 'Local' | 'SharePoint' | 'Notion';

interface KnowledgeBaseConfig {
    id: string;
    name: string;
    type: KnowledgeBaseType;
    source: string;
    apiKey?: string;
    apiUrl?: string;
    enabled: boolean;
    status?: 'disabled' | 'connecting' | 'connected';
}

export default function KnowledgeBaseSettings({
    onSettingsChange,
    settings
}: KnowledgeBaseSettingsProps) {
    const t = useTranslations("Settings");
    const textColor = useColorModeValue("gray.800", "gray.100");
    const cardBg = useColorModeValue("white", "gray.700");
    const borderColor = useColorModeValue("gray.200", "gray.600");

    // Replace useDisclosure with our own state
    const [isOpen, setIsOpen] = useState(false);
    const onOpen = () => setIsOpen(true);
    const onClose = () => setIsOpen(false);

    const [selectedType, setSelectedType] = useState<KnowledgeBaseType | null>(null);
    const [newKnowledgeBase, setNewKnowledgeBase] = useState<Partial<KnowledgeBaseConfig>>({
        name: '',
        source: '',
        apiKey: '',
        apiUrl: '',
        enabled: true
    });

    // Initialize knowledgeBases from settings or create empty array
    const [knowledgeBases, setKnowledgeBases] = useState<KnowledgeBaseConfig[]>([]);

    // Add state for connection status
    const [connectionStatus, setConnectionStatus] = useState<{ [key: string]: 'disabled' | 'connecting' | 'connected' }>({});

    // Initialize knowledge bases from existing settings if available
    useEffect(() => {
        // Check if we have knowledgeBases array in settings
        if (settings.knowledgeBases && settings.knowledgeBases.length > 0) {
            const kbs = settings.knowledgeBases.map((kb: KnowledgeBaseConfig) => ({
                ...kb,
                status: kb.enabled ? 'connected' : 'disabled' // Initialize status based on enabled flag
            }));
            setKnowledgeBases(kbs);

            // Initialize connection status
            const statusMap: { [key: string]: 'disabled' | 'connecting' | 'connected' } = {};
            kbs.forEach((kb: KnowledgeBaseConfig) => {
                statusMap[kb.id] = kb.enabled ? 'connected' : 'disabled';
            });
            setConnectionStatus(statusMap);
        }
        // If there's a source but no knowledgeBases array, create one
        else if (settings.source) {
            const existingKB: KnowledgeBaseConfig = {
                id: "default",
                name: "Default Knowledge Base",
                type: "Local" as KnowledgeBaseType,
                source: settings.source,
                apiKey: settings.apiKey,
                apiUrl: settings.apiUrl,
                enabled: settings.enableKnowledgeBase || false,
                status: settings.enableKnowledgeBase ? 'connected' : 'disabled'
            };
            setKnowledgeBases([existingKB]);
            setConnectionStatus({ default: settings.enableKnowledgeBase ? 'connected' : 'disabled' });
        }
    }, [settings]);

    // Handle toggle for enabling/disabling knowledge base
    const handleToggleKnowledgeBase = () => {
        onSettingsChange({
            ...settings,
            enableKnowledgeBase: !settings.enableKnowledgeBase
        });
    };

    // Modified to use our state setter
    const handleOpenModal = (type: KnowledgeBaseType) => {
        console.log("Opening modal for type:", type);
        setSelectedType(type);
        setNewKnowledgeBase({
            name: '',
            type,
            source: '',
            apiKey: '',
            apiUrl: '',
            enabled: true
        });
        setIsOpen(true);
        console.log("Setting isOpen to true");
    };

    // Add an effect to log when isOpen changes
    useEffect(() => {
        console.log("isOpen state changed:", isOpen);
    }, [isOpen]);

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setNewKnowledgeBase(prev => ({
            ...prev,
            [name]: value
        }));
    };

    const handleAddKnowledgeBase = () => {
        if (!selectedType || !newKnowledgeBase.name) return;

        // Check if a knowledge base with the same name and source already exists
        const isDuplicate = knowledgeBases.some(kb =>
            kb.name === newKnowledgeBase.name &&
            kb.source === newKnowledgeBase.source
        );

        if (isDuplicate) {
            // Show error or alert
            alert(t("duplicate_knowledge_base") || "A knowledge base with the same name and source already exists.");
            return;
        }

        const newKB: KnowledgeBaseConfig = {
            id: Date.now().toString(),
            name: newKnowledgeBase.name || '',
            type: selectedType,
            source: newKnowledgeBase.source || '',
            apiKey: newKnowledgeBase.apiKey,
            apiUrl: newKnowledgeBase.apiUrl,
            enabled: true
        };

        const updatedKnowledgeBases = [...knowledgeBases, newKB];
        setKnowledgeBases(updatedKnowledgeBases);

        // For backward compatibility, if this is the first knowledge base,
        // also set the top-level properties
        if (updatedKnowledgeBases.length === 1) {
            onSettingsChange({
                ...settings,
                source: newKB.source,
                apiKey: newKB.apiKey,
                apiUrl: newKB.apiUrl,
                enableKnowledgeBase: true,
                knowledgeBases: updatedKnowledgeBases
            });
        } else {
            onSettingsChange({
                ...settings,
                knowledgeBases: updatedKnowledgeBases,
                enableKnowledgeBase: true
            });
        }
    };

    const handleRemoveKnowledgeBase = (id: string) => {
        const updatedKnowledgeBases = knowledgeBases.filter(kb => kb.id !== id);
        setKnowledgeBases(updatedKnowledgeBases);

        // Update settings with properly structured format
        if (updatedKnowledgeBases.length === 0) {
            // If no knowledge bases left, clear all related settings
            const updatedSettings = { ...settings };
            delete updatedSettings.source;
            delete updatedSettings.apiKey;
            delete updatedSettings.apiUrl;
            updatedSettings.enableKnowledgeBase = false;
            updatedSettings.knowledgeBases = [];
            updatedSettings.knowledgeBase = {
                enableKnowledgeBase: false,
                relevanceThreshold: settings.knowledgeBase?.relevanceThreshold || 0.7,
                maxResults: settings.knowledgeBase?.maxResults || 5,
                knowledgeBases: []
            };
            onSettingsChange(updatedSettings);
        } else {
            // Otherwise update with the remaining knowledge bases
            onSettingsChange({
                ...settings,
                // For backward compatibility
                source: updatedKnowledgeBases[0].source,
                apiKey: updatedKnowledgeBases[0].apiKey,
                apiUrl: updatedKnowledgeBases[0].apiUrl,
                enableKnowledgeBase: updatedKnowledgeBases.some(kb => kb.enabled),
                knowledgeBases: updatedKnowledgeBases,
                // New structured format
                knowledgeBase: {
                    enableKnowledgeBase: updatedKnowledgeBases.some(kb => kb.enabled),
                    relevanceThreshold: settings.knowledgeBase?.relevanceThreshold || 0.7,
                    maxResults: settings.knowledgeBase?.maxResults || 5,
                    knowledgeBases: updatedKnowledgeBases
                }
            });
        }
    };

    const handleToggleKnowledgeBaseStatus = (id: string) => {
        // Find the knowledge base
        const kb = knowledgeBases.find(kb => kb.id === id);
        if (!kb) return;

        // If we're enabling, simulate a connection process
        if (!kb.enabled) {
            // Update status to connecting
            setConnectionStatus(prev => ({
                ...prev,
                [id]: 'connecting'
            }));

            // Simulate connection delay
            setTimeout(() => {
                // Update status to connected
                setConnectionStatus(prev => ({
                    ...prev,
                    [id]: 'connected'
                }));

                // Update knowledge bases
                const updatedKnowledgeBases = knowledgeBases.map(kb =>
                    kb.id === id ? { ...kb, enabled: true, status: 'connected' as const } : kb
                );
                setKnowledgeBases(updatedKnowledgeBases);

                // Update settings
                onSettingsChange({
                    ...settings,
                    enableKnowledgeBase: updatedKnowledgeBases.some(kb => kb.enabled),
                    knowledgeBases: updatedKnowledgeBases
                });
            }, 1500); // Simulate 1.5 second connection time
        } else {
            // If disabling, update immediately
            setConnectionStatus(prev => ({
                ...prev,
                [id]: 'disabled'
            }));

            const updatedKnowledgeBases = knowledgeBases.map(kb =>
                kb.id === id ? { ...kb, enabled: false, status: 'disabled' as const } : kb
            );
            setKnowledgeBases(updatedKnowledgeBases);

            onSettingsChange({
                ...settings,
                enableKnowledgeBase: updatedKnowledgeBases.some(kb => kb.enabled),
                knowledgeBases: updatedKnowledgeBases
            });
        }
    };

    // Helper function to get the appropriate icon for each knowledge base type
    const getKnowledgeBaseIcon = (type: KnowledgeBaseType) => {
        switch (type) {
            case 'Local':
                return FaFileAlt;
            case 'SharePoint':
                return FaShareAlt;
            case 'Notion':
                return FaBook;
            default:
                return FiBookOpen;
        }
    };

    // Helper function to get status color
    const getStatusColor = (status: 'disabled' | 'connecting' | 'connected') => {
        switch (status) {
            case 'disabled':
                return 'red.500';
            case 'connecting':
                return 'yellow.500';
            case 'connected':
                return 'green.500';
            default:
                return 'gray.500';
        }
    };

    // Helper function to get status label
    const getStatusLabel = (status: 'disabled' | 'connecting' | 'connected') => {
        switch (status) {
            case 'disabled':
                return t("disabled") || "Disabled";
            case 'connecting':
                return t("connecting") || "Connecting...";
            case 'connected':
                return t("connected") || "Connected";
            default:
                return t("unknown") || "Unknown";
        }
    };

    return (
        <Box>
            <VStack align="stretch" gap={4}>
                <Text fontSize="md" fontWeight="medium" color={textColor}>
                    <Icon as={FiBookOpen} mr={2} />
                    {t("knowledge_base_description") || "Configure how the AI uses your knowledge base to answer questions."}
                </Text>

                <Box>
                    <Flex justifyContent="space-between" alignItems="center" mb={3}>
                        <Text fontWeight="medium" color={textColor}>
                            {t("knowledge_bases") || "Knowledge Bases"}
                        </Text>
                        <Menu.Root positioning={{ placement: "bottom-end" }}>
                            <Menu.Trigger asChild>
                                <Button size="sm" colorScheme="blue">
                                    <HStack>
                                        <FiPlus />
                                        <Text>{t("add_knowledge_base") || "Add Knowledge Base"}</Text>
                                    </HStack>
                                </Button>
                            </Menu.Trigger>
                            <Portal>
                                <Menu.Positioner>
                                    <Menu.Content>
                                        <Menu.Item value="local" onClick={() => {
                                            console.log("Local menu item clicked");
                                            handleOpenModal('Local');
                                        }}>
                                            <Flex align="center">
                                                <Icon as={FaFileAlt} mr={2} />
                                                {t("local_files") || "Local Files"}
                                            </Flex>
                                        </Menu.Item>
                                        <Menu.Item value="sharepoint" onClick={() => handleOpenModal('SharePoint')}>
                                            <Flex align="center">
                                                <Icon as={FaShareAlt} mr={2} />
                                                {t("sharepoint") || "SharePoint"}
                                            </Flex>
                                        </Menu.Item>
                                        <Menu.Item value="notion" onClick={() => handleOpenModal('Notion')}>
                                            <Flex align="center">
                                                <Icon as={FaBook} mr={2} />
                                                {t("notion") || "Notion"}
                                            </Flex>
                                        </Menu.Item>
                                    </Menu.Content>
                                </Menu.Positioner>
                            </Portal>
                        </Menu.Root>
                    </Flex>

                    {knowledgeBases.length === 0 ? (
                        <Text fontSize="sm" color="gray.500">
                            {t("no_knowledge_bases") || "No knowledge bases configured. Add one to get started."}
                        </Text>
                    ) : (
                        <VStack gap={3} align="stretch">
                            {knowledgeBases.map((kb) => (
                                <Box
                                    key={kb.id}
                                    borderWidth="1px"
                                    borderColor={borderColor}
                                    bg={cardBg}
                                    borderRadius="md"
                                    overflow="hidden"
                                    boxShadow="sm"
                                >
                                    <Box p={4} pb={2}>
                                        <Flex justifyContent="space-between" alignItems="center">
                                            <HStack>
                                                <Icon as={getKnowledgeBaseIcon(kb.type as KnowledgeBaseType)} />
                                                <Heading size="sm">{kb.name}</Heading>
                                                {/* Single status indicator light */}
                                                <Box
                                                    w="6px"
                                                    h="6px"
                                                    borderRadius="full"
                                                    bg={getStatusColor(connectionStatus[kb.id])}
                                                    boxShadow={`0 0 2px ${getStatusColor(connectionStatus[kb.id])}`}
                                                    ml={1}
                                                    opacity={0.7}
                                                />
                                            </HStack>
                                            <HStack>
                                                <Button
                                                    size="xs"
                                                    onClick={() => handleToggleKnowledgeBaseStatus(kb.id)}
                                                    colorScheme={kb.enabled ? "gray" : "blue"}
                                                    loading={connectionStatus[kb.id] === 'connecting'}
                                                    loadingText={t("connecting") || "Connecting..."}
                                                >
                                                    {kb.enabled ? t("disable") || "Disable" : t("enable") || "Enable"}
                                                </Button>
                                                <IconButton
                                                    aria-label="Remove knowledge base"
                                                    size="xs"
                                                    colorScheme="red"
                                                    variant="ghost"
                                                    onClick={() => handleRemoveKnowledgeBase(kb.id)}
                                                    disabled={connectionStatus[kb.id] === 'connecting'}
                                                >
                                                    <Icon as={FiTrash2} />
                                                </IconButton>
                                            </HStack>
                                        </Flex>
                                    </Box>
                                    <Box pt={0} p={4}>
                                        <Text fontSize="sm" color="gray.500">
                                            {t("type") || "Type"}: {kb.type}
                                        </Text>
                                        <Text fontSize="sm" color="gray.500">
                                            {t("source") || "Source"}: {kb.source}
                                        </Text>
                                    </Box>
                                </Box>
                            ))}
                        </VStack>
                    )}
                </Box>
            </VStack>

            {/* Modal for adding a new knowledge base */}
            <Dialog.Root open={isOpen} onOpenChange={(e) => {
                console.log("Dialog onOpenChange:", e);
                if (!e.open) setIsOpen(false);
            }}>
                <Portal>
                    <Dialog.Backdrop />
                    <Dialog.Positioner>
                        <Dialog.Content maxWidth="500px">
                            <Dialog.Header>
                                <Dialog.Title>
                                    {selectedType && `${t("add")} ${selectedType} ${t("knowledge_base")}`}
                                </Dialog.Title>
                                <Dialog.CloseTrigger asChild>
                                    <CloseButton size="sm" onClick={() => setIsOpen(false)} />
                                </Dialog.CloseTrigger>
                            </Dialog.Header>

                            <Dialog.Body>
                                <Stack gap={4}>
                                    <Box>
                                        <Text mb={1} fontWeight="medium">{t("name") || "Name"} *</Text>
                                        <Input
                                            name="name"
                                            value={newKnowledgeBase.name}
                                            onChange={handleInputChange}
                                            placeholder={t("enter_name") || "Enter a name for this knowledge base"}
                                        />
                                    </Box>

                                    <Box>
                                        <Text mb={1} fontWeight="medium">{t("source") || "Source"} *</Text>
                                        <Input
                                            name="source"
                                            value={newKnowledgeBase.source}
                                            onChange={handleInputChange}
                                            placeholder={
                                                selectedType === 'Local'
                                                    ? t("enter_directory_path") || "Enter directory path"
                                                    : selectedType === 'SharePoint'
                                                        ? t("enter_sharepoint_url") || "Enter SharePoint URL"
                                                        : t("enter_notion_page_id") || "Enter Notion page ID"
                                            }
                                        />
                                    </Box>

                                    {selectedType !== 'Local' && (
                                        <>
                                            <Box>
                                                <Text mb={1} fontWeight="medium">{t("api_key") || "API Key"}</Text>
                                                <Input
                                                    name="apiKey"
                                                    value={newKnowledgeBase.apiKey}
                                                    onChange={handleInputChange}
                                                    placeholder={t("enter_api_key") || "Enter API key"}
                                                    type="password"
                                                />
                                            </Box>

                                            {selectedType === 'SharePoint' && (
                                                <Box>
                                                    <Text mb={1} fontWeight="medium">{t("api_url") || "API URL"}</Text>
                                                    <Input
                                                        name="apiUrl"
                                                        value={newKnowledgeBase.apiUrl}
                                                        onChange={handleInputChange}
                                                        placeholder={t("enter_api_url") || "Enter API URL"}
                                                    />
                                                </Box>
                                            )}
                                        </>
                                    )}
                                </Stack>
                            </Dialog.Body>

                            <Dialog.Footer>
                                <Button variant="ghost" mr={3} onClick={() => setIsOpen(false)}>
                                    {t("cancel") || "Cancel"}
                                </Button>
                                <Button
                                    colorScheme="blue"
                                    onClick={() => {
                                        handleAddKnowledgeBase();
                                        setIsOpen(false);
                                    }}
                                    disabled={!newKnowledgeBase.name || !newKnowledgeBase.source}
                                >
                                    {t("add") || "Add"}
                                </Button>
                            </Dialog.Footer>
                        </Dialog.Content>
                    </Dialog.Positioner>
                </Portal>
            </Dialog.Root>
        </Box>
    );
}
