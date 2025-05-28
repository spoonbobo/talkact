import React, { useEffect, useState } from 'react';
import {
    Box,
    Heading,
    Text,
    Badge,
    VStack,
    HStack,
    Spinner,
    Code,
    Button,
    Flex,
    useClipboard,
    Icon,
    Table,
    Input,
    IconButton,
} from '@chakra-ui/react';
import { Tooltip } from "@/components/ui/tooltip";
import { motion, AnimatePresence } from 'framer-motion';
import { FiSearch, FiServer, FiTool, FiInfo, FiCopy, FiExternalLink, FiRefreshCw } from 'react-icons/fi';
// import axios from 'axios';
import { useColorModeValue } from "@/components/ui/color-mode";
import { useTranslations } from 'next-intl';
import { toaster } from "@/components/ui/toaster";

const MotionBox = motion.create(Box);
const MotionFlex = motion.create(Flex);

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

interface ServerListProps {
    // Optional props can be added here
}

// Create a separate component for each tool to handle its own hooks
const ToolCard = ({ tool, serverKey, isExpanded, toggleToolExpansion }: { tool: ServerTool, serverKey: string, isExpanded: boolean, toggleToolExpansion: (toolId: string) => void }) => {
    const toolId = `${serverKey}-${tool.name}`;
    const t = useTranslations("Learn");
    // Updated colors to match page.tsx files
    const cardBg = useColorModeValue("white", "gray.800");
    const cardBorderColor = useColorModeValue("gray.200", "gray.700");
    const cardHoverBorderColor = useColorModeValue("blue.200", "blue.300");
    const headingColor = useColorModeValue("gray.800", "gray.100");
    const textColor = useColorModeValue("gray.700", "gray.300");
    const tableBg = useColorModeValue("gray.50", "gray.900");
    const badgeBg = useColorModeValue("blue.50", "blue.900");
    const buttonHoverBg = useColorModeValue("blue.50", "blue.700");
    const buttonHoverColor = useColorModeValue("blue.600", "blue.200");

    // @ts-expect-error - useClipboard hook returns complex object with hasCopied property
    const clipboard = useClipboard(tool.name);
    // @ts-expect-error - accessing hasCopied from clipboard object
    const hasCopied = clipboard.hasCopied;
    // @ts-expect-error - accessing onCopy from clipboard object
    const onCopy = clipboard.onCopy;

    const hasParameters = tool.input_schema &&
        tool.input_schema.properties &&
        Object.keys(tool.input_schema.properties).length > 0;

    return (
        <MotionBox
            p={3}
            borderRadius="md"
            bg={cardBg}
            border="1px"
            borderColor={cardBorderColor}
            boxShadow="sm"
            _hover={{ boxShadow: "md", borderColor: cardHoverBorderColor }}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            transition={{ duration: 0.3 } as any}
            position="relative"
            overflow="hidden"
            width="100%"
            maxW="100%"
        >
            {/* Tool header with improved spacing and visual hierarchy */}
            <Flex justifyContent="space-between" mb={2} alignItems="center">
                <HStack gap={2}>
                    <Icon as={FiTool} color="blue.500" />
                    <Heading size="sm" color={headingColor} fontWeight="semibold">{tool.name}</Heading>
                    <Tooltip content={hasCopied ? "Copied!" : "Copy tool name"}>
                        <IconButton
                            size="xs"
                            variant="ghost"
                            onClick={onCopy}
                            aria-label="Copy tool name"
                            _hover={{ bg: buttonHoverBg, color: buttonHoverColor }}
                        >
                            <Icon as={FiCopy} />
                        </IconButton>
                    </Tooltip>
                </HStack>
                <IconButton
                    size="sm"
                    variant="ghost"
                    colorScheme="blue"
                    onClick={() => toggleToolExpansion(toolId)}
                    aria-label={isExpanded ? "Hide details" : "Show details"}
                    _hover={{ bg: buttonHoverBg, color: buttonHoverColor }}
                >
                    <Icon as={isExpanded ? FiRefreshCw : FiExternalLink} />
                </IconButton>
            </Flex>

            {/* Brief description preview - always visible */}
            <Text
                fontSize="sm"
                color={textColor}
                mb={2}
                lineClamp={isExpanded ? undefined : 2}
                fontStyle={isExpanded ? "normal" : "italic"}
            >
                {tool.description}
            </Text>

            {/* Input Parameters with improved styling */}
            <Box mb={2} overflowX="auto" borderRadius="md" border="1px" borderColor={cardBorderColor}>
                <Heading color={textColor} size="xs" p={2} bg={badgeBg} borderBottom="1px" borderColor={cardBorderColor}>
                    {t("mcp.parameters")}
                </Heading>
                {hasParameters ? (
                    // TODO: is fine
                    // @ts-ignore
                    <Table.Root size="sm" variant="simple" colorScheme="blue">
                        <Table.Header bg={tableBg} position="sticky" top={0} zIndex={1}>
                            <Table.Row>
                                <Table.ColumnHeader width="40%" fontWeight="semibold" fontSize="xs">{t("mcp.parameter")}</Table.ColumnHeader>
                                <Table.ColumnHeader width="30%" fontWeight="semibold" fontSize="xs">{t("mcp.type")}</Table.ColumnHeader>
                                <Table.ColumnHeader width="30%" fontWeight="semibold" fontSize="xs">{t("mcp.required")}</Table.ColumnHeader>
                            </Table.Row>
                        </Table.Header>
                        <Table.Body>
                            {Object.entries(tool.input_schema.properties).map(([paramName, param]) => (
                                <Table.Row key={paramName} _hover={{ bg: cardBg }}>
                                    <Table.Cell fontWeight="medium" fontSize="xs" color={textColor}>{param.title || paramName}</Table.Cell>
                                    <Table.Cell fontSize="xs" color={textColor}><Code colorScheme="blue" px={1} py={0}>{param.type}</Code></Table.Cell>
                                    <Table.Cell fontSize="xs">
                                        {tool.input_schema.required.includes(paramName) ?
                                            <Badge colorScheme="red" borderRadius="full" px={2} fontSize="2xs">{t("mcp.required")}</Badge> :
                                            <Badge colorScheme="gray" borderRadius="full" px={2} fontSize="2xs">{t("mcp.optional")}</Badge>
                                        }
                                    </Table.Cell>
                                </Table.Row>
                            ))}
                        </Table.Body>
                    </Table.Root>
                ) : (
                    <Box py={2} px={3} bg={tableBg} fontSize="sm" color={textColor} textAlign="center">
                        <Text>{t("mcp.no_parameters_needed")}</Text>
                    </Box>
                )}
            </Box>

            {/* Full description - Expandable section */}
            {isExpanded && (
                <Box
                    mt={3}
                    pt={2}
                    borderTop="1px"
                    borderColor={cardBorderColor}
                >
                    <Heading size="xs" mb={2} color={headingColor}>{t("mcp.full_description")}</Heading>
                    <Text whiteSpace="pre-wrap" color={textColor} fontSize="sm">{tool.description}</Text>
                </Box>
            )}
        </MotionBox>
    );
};

export const MCPResourceExplorer: React.FC<ServerListProps> = () => {
    const [servers, setServers] = useState<Record<string, Server>>({});
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [expandedTools, setExpandedTools] = useState<Set<string>>(new Set());
    const [searchFocused, setSearchFocused] = useState(false);
    const [selectedServer, setSelectedServer] = useState<string | null>(null);
    const [isSyncing, setIsSyncing] = useState(false);

    // Updated colors to match page.tsx files
    const bgColor = useColorModeValue("white", "gray.800");
    const textColor = useColorModeValue("gray.600", "gray.400");
    const textColorStrong = useColorModeValue("gray.700", "gray.300");
    const textColorHeading = useColorModeValue("gray.800", "gray.100");
    const borderColor = useColorModeValue("gray.200", "gray.700");
    const errorBg = useColorModeValue("red.50", "red.900");
    const errorColor = useColorModeValue("red.600", "red.300");
    const searchBg = useColorModeValue("white", "gray.700");
    const searchFocusBg = useColorModeValue("gray.50", "gray.600");
    const serverHeaderBg = useColorModeValue("bg.subtle", "gray.700");
    const selectedServerBg = useColorModeValue("blue.50", "blue.800");
    const selectedServerBorderColor = useColorModeValue("blue.500", "blue.300");
    const serverHoverBg = useColorModeValue("gray.50", "gray.700");
    const emptyStateBg = useColorModeValue("gray.50", "gray.700");
    const scrollbarThumbColor = useColorModeValue("rgba(0,0,0,0.1)", "rgba(255,255,255,0.1)");
    const scrollbarThumbHoverColor = useColorModeValue("rgba(0,0,0,0.2)", "rgba(255,255,255,0.2)");
    const bgSubtle = useColorModeValue("bg.subtle", "gray.800");
    const headerTextColor = useColorModeValue("gray.700", "gray.200");

    const t = useTranslations("Learn");

    const fetchServers = async () => {
        try {
            setLoading(true);
            const response = await fetch(`/api/mcp/get_servers`);
            if (!response.ok) {
                throw new Error(`Failed to fetch servers: ${response.statusText}`);
            }
            const data = await response.json();

            // Process server descriptions to remove leading "You "
            Object.values(data as Record<string, Server>).forEach((server) => {
                if (server.server_description.startsWith("You ")) {
                    server.server_description = server.server_description.substring(4);
                }
            });

            setServers(data);

            // Set the first server as selected by default if available
            const serverKeys = Object.keys(data);
            if (serverKeys.length > 0) {
                setSelectedServer(serverKeys[0]);
            }
        } catch (err) {
            setError(err instanceof Error ? err.message : 'An unknown error occurred');
            // toast.error(`Failed to load servers: ${err instanceof Error ? err.message : 'Unknown error'}`);
        } finally {
            setLoading(false);
        }
    };

    // Add sync function
    const syncServers = async () => {
        try {
            setIsSyncing(true);
            await fetchServers();
            toaster.create({
                title: "Servers synchronized",
                description: "MCP servers have been refreshed successfully.",
                duration: 3000,
            });
        } catch (err) {
            toaster.create({
                title: "Sync failed",
                description: "Could not refresh MCP servers. Please try again later.",
                duration: 5000,
            });
        } finally {
            setIsSyncing(false);
        }
    };

    useEffect(() => {
        fetchServers();
    }, []);

    const toggleToolExpansion = (toolId: string) => {
        const newExpandedTools = new Set(expandedTools);
        if (expandedTools.has(toolId)) {
            newExpandedTools.delete(toolId);
        } else {
            newExpandedTools.add(toolId);
        }
        setExpandedTools(newExpandedTools);
    };

    // Filter servers based on search term
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const filteredServers = Object.entries(servers).filter(([serverKey, server]) => {
        const serverMatches = server.server_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            server.server_description.toLowerCase().includes(searchTerm.toLowerCase());

        const toolMatches = server.server_tools.some(tool =>
            tool.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            tool.description.toLowerCase().includes(searchTerm.toLowerCase())
        );

        return serverMatches || toolMatches;
    });

    // Get tools for the selected server
    const selectedServerTools = selectedServer && servers[selectedServer]
        ? servers[selectedServer].server_tools
        : [];

    // Filter tools based on search term
    const filteredTools = selectedServerTools.filter(tool =>
        tool.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        tool.description.toLowerCase().includes(searchTerm.toLowerCase())
    );

    if (loading) {
        return (
            <Box display="flex" justifyContent="center" alignItems="center" height="100vh" flexDirection="column" gap={4}>
                <Spinner size="xl" color="blue.500" />
                <Text fontSize="lg" fontWeight="medium" color={textColorHeading}>Loading available MCP servers...</Text>
            </Box>
        );
    }

    if (error) {
        return (
            <Box p={6} textAlign="center" borderRadius="lg" bg={errorBg} color={errorColor} maxW="800px" mx="auto" my={10} boxShadow="md">
                <Icon as={FiInfo} w={8} h={8} mb={3} />
                <Heading size="md" mb={2}>{t("error_loading_servers")}</Heading>
                <Text fontWeight="medium">{error}</Text>
                <Button mt={4} colorScheme="red" onClick={() => window.location.reload()}>Try Again</Button>
            </Box>
        );
    }

    return (
        <MotionBox
            width="100%"
            height="100%"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            transition={{ duration: 0.5 } as any}
            maxW="100%"
            mx="auto"
            overflow="hidden"
            display="flex"
            flexDirection="column"
        >
            {/* <ToastContainer
                position="bottom-right"
                autoClose={4000}
                hideProgressBar={false}
                newestOnTop
                closeOnClick
                pauseOnFocusLoss
                draggable
                pauseOnHover
                theme="light"
            /> */}

            <MotionFlex
                direction={{ base: "column", md: "row" }}
                gap={3}
                flex="1"
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                transition={{ duration: 0.3 } as any}
                h={{ base: "auto", md: "100%" }}
                overflow="hidden"
                width="100%"
            >
                {/* Left Column - Search and Server Selection */}
                <Box
                    width={{ base: "100%", md: "25%" }}
                    minW={{ md: "220px" }}
                    position="relative"
                    display="flex"
                    flexDirection="column"
                    h={{ base: "300px", md: "100%" }}
                >
                    {/* Search Box with Sync Button */}
                    <Flex mb={3} position="relative" alignItems="center" gap={2}>
                        <Box position="relative" flex="1">
                            <Box position="absolute" left={3} top="50%" transform="translateY(-50%)" zIndex={1} pointerEvents="none">
                                <Icon as={FiSearch} color={searchFocused ? "blue.400" : "gray.400"} transition="color 0.2s" />
                            </Box>
                            <Input
                                placeholder={t("mcp.search_servers_and_tools")}
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                onFocus={() => setSearchFocused(true)}
                                onBlur={() => setSearchFocused(false)}
                                pl={10}
                                bg={searchFocused ? searchFocusBg : searchBg}
                                borderRadius="md"
                                border="none"
                                boxShadow="none"
                                _hover={{ bg: searchFocusBg }}
                                _focus={{ bg: searchFocusBg, outline: "none", boxShadow: "none" }}
                                transition="all 0.2s"
                            />
                            {searchTerm && (
                                <Box position="absolute" right={3} top="50%" transform="translateY(-50%)">
                                    <IconButton
                                        size="xs"
                                        variant="ghost"
                                        onClick={() => setSearchTerm('')}
                                        aria-label="Clear search"
                                        _hover={{ bg: "blue.50", color: "blue.600" }}
                                    >
                                        <Icon as={FiRefreshCw} />
                                    </IconButton >
                                </Box>
                            )}
                        </Box>

                        {/* Add Sync Button */}
                        <IconButton
                            aria-label="Sync MCP Servers"
                            size="sm"
                            colorScheme="blue"
                            variant="ghost"
                            loading={isSyncing}
                            onClick={syncServers}
                            _hover={{ bg: "blue.50", color: "blue.600" }}
                        >
                            <Icon as={FiRefreshCw} />
                        </IconButton>
                    </Flex>

                    {/* Server List */}
                    <Box
                        bg={bgColor}
                        borderRadius="md"
                        boxShadow="sm"
                        border="1px"
                        borderColor={borderColor}
                        overflow="hidden"
                        flex="1"
                        display="flex"
                        flexDirection="column"
                    >
                        <Heading size="sm" p={2} bg={serverHeaderBg} borderBottom="1px" borderColor={borderColor} color={headerTextColor}>
                            <Icon as={FiServer} mr={2} />
                            {t("mcp.servers")}
                        </Heading>
                        <VStack
                            align="stretch"
                            overflowY="auto"
                            flex="1"
                            pb={2}
                            css={{
                                '&::-webkit-scrollbar': { width: '8px' },
                                '&::-webkit-scrollbar-track': { background: 'transparent' },
                                '&::-webkit-scrollbar-thumb': { background: scrollbarThumbColor, borderRadius: '4px' },
                                '&::-webkit-scrollbar-thumb:hover': { background: scrollbarThumbHoverColor }
                            }}
                            overflowX="hidden"
                        >
                            {filteredServers.length === 0 ? (
                                <Box p={4} textAlign="center">
                                    <Text fontSize="sm" color={textColor}>No servers match your search</Text>
                                </Box>
                            ) : (
                                filteredServers.map(([serverKey, server]) => (
                                    <MotionBox
                                        key={serverKey}
                                        p={3}
                                        cursor="pointer"
                                        bg={selectedServer === serverKey ? selectedServerBg : bgColor}
                                        borderLeft={selectedServer === serverKey ? "4px solid" : "4px solid transparent"}
                                        borderColor={selectedServer === serverKey ? selectedServerBorderColor : "transparent"}
                                        _hover={{ bg: selectedServer === serverKey ? selectedServerBg : serverHoverBg }}
                                        onClick={() => setSelectedServer(serverKey)}
                                        transitionDuration="0.2s"
                                        borderBottom="1px"
                                        borderBottomColor={borderColor}
                                        whileHover={{ scale: 1.01 }}
                                        whileTap={{ scale: 0.98 }}
                                    >
                                        <Flex justify="space-between" align="center">
                                            <Heading size="xs" color={textColorHeading}>{server.server_name}</Heading>
                                            <Badge colorScheme="blue" fontSize="xs">
                                                {server.server_tools.length}
                                            </Badge>
                                        </Flex>
                                    </MotionBox>
                                ))
                            )}
                        </VStack>
                    </Box>
                </Box>

                {/* Right Column - Tools */}
                <Box
                    width={{ base: "100%", md: "75%" }}
                    h={{ base: "auto", md: "100%" }}
                    display="flex"
                    flexDirection="column"
                    overflow="hidden"
                >
                    {selectedServer && servers[selectedServer] ? (
                        <>
                            <MotionBox
                                mb={2}
                                p={2}
                                bg={selectedServerBg}
                                borderRadius="md"
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                                transition={{ duration: 0.3 } as any}
                                key={selectedServer}
                            >
                                <Heading size="sm" mb={1} color={textColorHeading}>{servers[selectedServer].server_name}</Heading>
                                <Text fontSize="xs" color={textColorStrong}>{servers[selectedServer].server_description}</Text>
                            </MotionBox>

                            {filteredTools.length > 0 ? (
                                <VStack
                                    align="stretch"
                                    overflowY="auto"
                                    pl={2}
                                    pr={2}
                                    flex="1"
                                    pb={3}
                                    gap={3}
                                    css={{
                                        '&::-webkit-scrollbar': { width: '6px' },
                                        '&::-webkit-scrollbar-track': { background: 'transparent' },
                                        '&::-webkit-scrollbar-thumb': { background: scrollbarThumbColor, borderRadius: '4px' },
                                        '&::-webkit-scrollbar-thumb:hover': { background: scrollbarThumbHoverColor }
                                    }}
                                >
                                    <AnimatePresence>
                                        {filteredTools.map((tool, index) => {
                                            const toolId = `${selectedServer}-${tool.name}`;
                                            const isExpanded = expandedTools.has(toolId);

                                            return (
                                                <motion.div
                                                    key={toolId}
                                                    initial={{ opacity: 0, y: 20 }}
                                                    animate={{ opacity: 1, y: 0 }}
                                                    transition={{
                                                        duration: 0.3,
                                                        delay: 0.05 * index,
                                                        ease: "easeOut"
                                                    }}
                                                >
                                                    <ToolCard
                                                        tool={tool}
                                                        serverKey={selectedServer}
                                                        isExpanded={isExpanded}
                                                        toggleToolExpansion={toggleToolExpansion}
                                                    />
                                                </motion.div>
                                            );
                                        })}
                                    </AnimatePresence>
                                </VStack>
                            ) : (
                                <Box p={6} textAlign="center" bg={emptyStateBg} borderRadius="md" flex="1" display="flex" alignItems="center" justifyContent="center" flexDirection="column">
                                    <Text color={textColor}>No tools match your search criteria.</Text>
                                    {searchTerm && (
                                        <Button
                                            mt={4}
                                            size="sm"
                                            colorScheme="blue"
                                            variant="outline"
                                            onClick={() => setSearchTerm('')}
                                        >
                                            Clear search
                                        </Button>
                                    )}
                                </Box>
                            )}
                        </>
                    ) : (
                        <Box p={6} textAlign="center" bg={bgSubtle} borderRadius="md" flex="1" display="flex" alignItems="center" justifyContent="center" flexDirection="column">
                            <Icon as={FiTool} w={8} h={8} color="gray.400" mb={3} />
                            <Text color={textColor}>Select a server to view available tools.</Text>
                        </Box>
                    )}
                </Box>
            </MotionFlex>
        </MotionBox>
    );
};