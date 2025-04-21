"use client";

import { useTranslations } from "next-intl";
import { useSession } from "next-auth/react";
import { useSelector } from 'react-redux';
import { RootState } from "@/store/store";
import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
    Box,
    Heading,
    Icon,
    Text,
    VStack,
    Flex,
    Center,
    Button,
    Input,
    Portal,
    Dialog,
    Field,
    Stack,
    Menu,
    IconButton,
    Tooltip,
    Spinner,
    Code,
} from "@chakra-ui/react";
import {
    FaFolder,
    FaFolderOpen,
    FaFile,
    FaSearch,
    FaPlus,
    FaEllipsisV,
    FaChevronRight,
    FaChevronDown,
    FaCode,
    FaFileAlt,
    FaImage,
    FaFilePdf,
    FaFileArchive,
    FaDownload,
    FaUpload,
    FaTrash,
    FaEdit,
} from "react-icons/fa";
import { useColorModeValue } from "@/components/ui/color-mode";
import { toaster } from "@/components/ui/toaster";
import { FileNode, Breadcrumb, FileContentResponse } from "@/types/file";

const MotionBox = motion(Box);

// Function to fetch files from the API
const fetchFileStructure = async (path = ''): Promise<FileNode> => {
    try {
        const response = await fetch(`/api/agent_home/get_files?path=${encodeURIComponent(path)}`);

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Failed to fetch files');
        }

        return await response.json();
    } catch (error) {
        console.error('Error fetching file structure:', error);
        throw error;
    }
};

// Function to fetch file content
const fetchFileContent = async (path: string): Promise<FileContentResponse> => {
    try {
        const response = await fetch(`/api/agent_home/file_content?path=${encodeURIComponent(path)}`);

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Failed to fetch file content');
        }

        return await response.json();
    } catch (error) {
        console.error('Error fetching file content:', error);
        throw error;
    }
};

// Helper function to get file icon based on extension
const getFileIcon = (extension?: string) => {
    switch (extension) {
        case 'js':
        case 'ts':
        case 'jsx':
        case 'tsx':
        case 'html':
        case 'css':
        case 'py':
        case 'java':
        case 'php':
            return FaCode;
        case 'pdf':
            return FaFilePdf;
        case 'jpg':
        case 'jpeg':
        case 'png':
        case 'gif':
        case 'svg':
            return FaImage;
        case 'zip':
        case 'rar':
        case 'tar':
        case 'gz':
            return FaFileArchive;
        default:
            return FaFileAlt;
    }
};

// File/Folder Tree Component
const FileTreeItem = ({
    item,
    level = 0,
    onSelect,
    selectedPath,
    onRefresh
}: {
    item: FileNode;
    level?: number;
    onSelect: (item: FileNode) => void;
    selectedPath: string | null;
    onRefresh: () => Promise<void>;
}) => {
    const [isOpen, setIsOpen] = useState(false);
    const [children, setChildren] = useState<FileNode[]>(item.children || []);
    const [isLoading, setIsLoading] = useState(false);
    const isDirectory = item.type === 'directory';
    const isSelected = selectedPath === item.path;
    const t = useTranslations("Workbench");

    const bgHover = useColorModeValue("gray.100", "gray.700");
    const selectedBg = useColorModeValue("blue.50", "blue.900");
    const selectedColor = useColorModeValue("blue.600", "blue.200");

    // Load children when directory is opened
    useEffect(() => {
        const loadChildren = async () => {
            if (isDirectory && isOpen && (!children || children.length === 0)) {
                setIsLoading(true);
                try {
                    const result = await fetchFileStructure(item.path);
                    if (result.children) {
                        setChildren(result.children);
                    }
                } catch (error) {
                    toaster.create({
                        title: t("error"),
                        description: t("failed_to_load_files"),
                        duration: 5000,
                    });
                } finally {
                    setIsLoading(false);
                }
            }
        };

        loadChildren();
    }, [isOpen, isDirectory, item.path, children]);

    const toggleOpen = (e: React.MouseEvent) => {
        e.stopPropagation();
        setIsOpen(!isOpen);
    };

    const handleSelect = () => {
        onSelect(item);
    };

    const FileIcon = isDirectory
        ? (isOpen ? FaFolderOpen : FaFolder)
        : getFileIcon(item.extension);

    return (
        <Box>
            <Flex
                pl={level * 4}
                py={1}
                px={2}
                alignItems="center"
                cursor="pointer"
                borderRadius="md"
                bg={isSelected ? selectedBg : "transparent"}
                color={isSelected ? selectedColor : "inherit"}
                _hover={{ bg: isSelected ? selectedBg : bgHover }}
                onClick={handleSelect}
            >
                {isDirectory && (
                    <Icon
                        as={isOpen ? FaChevronDown : FaChevronRight}
                        mr={1}
                        onClick={toggleOpen}
                        cursor="pointer"
                        fontSize="xs"
                    />
                )}
                {!isDirectory && <Box w={4} />}
                <Icon as={FileIcon} mr={2} color={isDirectory ? "yellow.400" : "blue.400"} />
                <Text fontSize="sm" lineClamp={1}>{item.name}</Text>
                {isLoading && <Spinner size="xs" ml={2} />}
            </Flex>

            {isDirectory && isOpen && children && (
                <Box>
                    {children.map((child) => (
                        <FileTreeItem
                            key={child.path}
                            item={child}
                            level={level + 1}
                            onSelect={onSelect}
                            selectedPath={selectedPath}
                            onRefresh={onRefresh}
                        />
                    ))}
                </Box>
            )}
        </Box>
    );
};

export default function FileExplorer() {
    const { data: session } = useSession();
    const [rootDirectory, setRootDirectory] = useState<FileNode | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [selectedItem, setSelectedItem] = useState<FileNode | null>(null);
    const [currentPath, setCurrentPath] = useState('/agent_home');
    const [searchQuery, setSearchQuery] = useState('');
    const [fileContent, setFileContent] = useState<string | null>(null);
    const [isContentLoading, setIsContentLoading] = useState(false);
    const [isNewFolderOpen, setIsNewFolderOpen] = useState(false);
    const [isNewFileOpen, setIsNewFileOpen] = useState(false);
    const [newItemName, setNewItemName] = useState('');
    const agentHomePath = process.env.NEXT_PUBLIC_AGENT_HOME_PATH || '/app/agent_home';
    console.log("=============agentHomePath", agentHomePath);
    const [breadcrumbs, setBreadcrumbs] = useState<Breadcrumb[]>([
        { name: 'agent_home', path: agentHomePath }
    ]);
    const newItemInputRef = useRef<HTMLInputElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const t = useTranslations("Workbench");

    // Color mode values
    const mainBg = useColorModeValue("gray.50", "gray.900");
    const cardBg = useColorModeValue("white", "gray.800");
    const borderColor = useColorModeValue("gray.200", "gray.700");
    const textColorHeading = useColorModeValue("gray.800", "gray.100");
    const textColorStrong = useColorModeValue("gray.700", "gray.300");
    const textColor = useColorModeValue("gray.600", "gray.400");

    // Load root directory on component mount
    useEffect(() => {
        const loadRootDirectory = async () => {
            setIsLoading(true);
            try {
                const result = await fetchFileStructure();
                setRootDirectory(result);
            } catch (error) {
                toaster.create({
                    title: t("error"),
                    description: t("failed_to_load_files"),
                    duration: 5000,
                });
            } finally {
                setIsLoading(false);
            }
        };

        if (session) {
            loadRootDirectory();
        }
    }, [session]);

    // Handle item selection
    const handleSelectItem = async (item: FileNode) => {
        setSelectedItem(item);

        // Update breadcrumbs
        const pathParts = item.path.split('/').filter(Boolean);
        const newBreadcrumbs = [{ name: 'agent_home', path: agentHomePath }];
        let currentPathBuilder = agentHomePath;

        for (let i = 1; i < pathParts.length; i++) {
            currentPathBuilder += `/${pathParts[i]}`;
            newBreadcrumbs.push({
                name: pathParts[i],
                path: currentPathBuilder
            });
        }

        setBreadcrumbs(newBreadcrumbs);
        setCurrentPath(item.path);

        // If it's a file, try to load content
        if (item.type === 'file') {
            setIsContentLoading(true);
            setFileContent(null);

            try {
                const { content } = await fetchFileContent(item.path);
                setFileContent(content);
            } catch (error) {
                console.error('Failed to load file content:', error);
                // Don't show error toast here as some files are not meant to be viewed as text
            } finally {
                setIsContentLoading(false);
            }
        }
    };

    // Handle breadcrumb navigation
    const handleBreadcrumbClick = async (path: string) => {
        setIsLoading(true);
        try {
            const result = await fetchFileStructure(path);
            handleSelectItem(result);
        } catch (error) {
            toaster.create({
                title: t("error"),
                description: t("failed_to_navigate"),
                duration: 5000,
            });
        } finally {
            setIsLoading(false);
        }
    };

    // Handle file download
    const handleDownload = (file: FileNode) => {
        window.open(`/api/agent_home/download?path=${encodeURIComponent(file.path)}`, '_blank');
    };

    // Handle file upload
    const handleUpload = () => {
        if (fileInputRef.current) {
            fileInputRef.current.click();
        }
    };

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files;
        if (!files || files.length === 0) return;

        const file = files[0];
        const formData = new FormData();
        formData.append('file', file);
        formData.append('path', currentPath);

        try {
            const response = await fetch('/api/agent_home/upload', {
                method: 'POST',
                body: formData,
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Failed to upload file');
            }

            // Refresh the current directory
            refreshCurrentDirectory();

            toaster.create({
                title: t("success"),
                description: t("file_uploaded"),
                duration: 3000,
            });
        } catch (error) {
            console.error('Error uploading file:', error);
            toaster.create({
                title: t("error"),
                description: t("failed_to_upload"),
                duration: 5000,
            });
        }

        // Reset the file input
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    };

    // Refresh current directory
    const refreshCurrentDirectory = async () => {
        setIsLoading(true);
        try {
            const result = await fetchFileStructure(currentPath);
            setSelectedItem(result);

            // If we're at the root, update the root directory
            if (currentPath === '/agent_home') {
                setRootDirectory(result);
            }
        } catch (error) {
            toaster.create({
                title: t("error"),
                description: t("failed_to_refresh"),
                duration: 5000,
            });
        } finally {
            setIsLoading(false);
        }
    };

    // New folder dialog
    const openNewFolderDialog = () => {
        setNewItemName('');
        setIsNewFolderOpen(true);
    };

    const closeNewFolderDialog = () => {
        setIsNewFolderOpen(false);
    };

    const handleCreateFolder = async () => {
        // This would call an API endpoint to create a folder
        // For now, just close the dialog
        closeNewFolderDialog();
    };

    // New file dialog
    const openNewFileDialog = () => {
        setNewItemName('');
        setIsNewFileOpen(true);
    };

    const closeNewFileDialog = () => {
        setIsNewFileOpen(false);
    };

    const handleCreateFile = async () => {
        // This would call an API endpoint to create a file
        // For now, just close the dialog
        closeNewFileDialog();
    };

    return (
        <Box height="100%" width="100%" bg={mainBg} position="relative">
            <Heading as="h1" size="lg" mb={6} color={textColorHeading} px={6} pt={6}>
                {t("file_explorer")}
            </Heading>

            <Flex height="calc(100% - 80px)" width="100%">
                {/* Left sidebar with file tree */}
                <Box
                    width="300px"
                    height="100%"
                    borderRightWidth="1px"
                    borderColor={borderColor}
                    overflowY="auto"
                    p={4}
                >
                    <Flex mb={4} align="center">
                        <Box position="relative" flex="1">
                            <Input
                                placeholder={t("search_files")}
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                pr="2.5rem"
                            />
                            <Box position="absolute" right="8px" top="50%" transform="translateY(-50%)">
                                <Icon as={FaSearch} color="gray.500" />
                            </Box>
                        </Box>

                        <Menu.Root>
                            <Menu.Trigger asChild>
                                <IconButton
                                    aria-label={t("add_new")}
                                    size="sm"
                                    ml={2}
                                    bg="none"
                                >
                                    <Icon as={FaPlus} />
                                </IconButton>

                            </Menu.Trigger>
                            <Portal>
                                <Menu.Positioner>
                                    <Menu.Content>
                                        <Menu.Item value="new-folder" onClick={openNewFolderDialog}>
                                            <Icon as={FaFolder} mr={2} />
                                            {t("new_folder")}
                                        </Menu.Item>
                                        <Menu.Item value="new-file" onClick={openNewFileDialog}>
                                            <Icon as={FaFile} mr={2} />
                                            {t("new_file")}
                                        </Menu.Item>
                                        <Menu.Item value="upload-file" onClick={handleUpload}>
                                            <Icon as={FaUpload} mr={2} />
                                            {t("upload_file")}
                                        </Menu.Item>
                                    </Menu.Content>
                                </Menu.Positioner>
                            </Portal>
                        </Menu.Root>
                    </Flex>

                    {isLoading ? (
                        <Center height="200px">
                            <Spinner />
                        </Center>
                    ) : rootDirectory ? (
                        <VStack align="stretch" gap={0}>
                            <FileTreeItem
                                item={rootDirectory}
                                onSelect={handleSelectItem}
                                selectedPath={selectedItem?.path || null}
                                onRefresh={refreshCurrentDirectory}
                            />
                        </VStack>
                    ) : (
                        <Center height="200px">
                            <Text color={textColor}>{t("no_files_found")}</Text>
                        </Center>
                    )}

                    {/* Hidden file input for uploads */}
                    <input
                        type="file"
                        ref={fileInputRef}
                        style={{ display: 'none' }}
                        onChange={handleFileChange}
                    />
                </Box>

                {/* Main content area */}
                <Box flex="1" height="100%" p={6} overflowY="auto">
                    {/* Path navigation */}
                    <Flex mb={4} justify="space-between" align="center">
                        <Flex align="center" overflow="hidden">
                            {breadcrumbs.map((crumb, index) => (
                                <Flex key={crumb.path} align="center">
                                    {index > 0 && <Icon as={FaChevronRight} mx={2} fontSize="xs" color={textColor} />}
                                    <Text
                                        cursor="pointer"
                                        color={index === breadcrumbs.length - 1 ? textColorHeading : textColor}
                                        fontWeight={index === breadcrumbs.length - 1 ? "bold" : "normal"}
                                        onClick={() => handleBreadcrumbClick(crumb.path)}
                                        lineClamp={1}
                                    >
                                        {crumb.name}
                                    </Text>
                                </Flex>
                            ))}
                        </Flex>

                        <Button
                            size="sm"
                            onClick={refreshCurrentDirectory}
                            loading={isLoading}
                        >
                            {t("refresh")}
                        </Button>
                    </Flex>

                    {selectedItem ? (
                        selectedItem.type === 'directory' ? (
                            <Box>
                                <Heading size="sm" mb={4} color={textColorHeading}>
                                    <Flex align="center">
                                        <Icon as={FaFolderOpen} mr={2} color="yellow.400" />
                                        {selectedItem.name}
                                    </Flex>
                                </Heading>

                                {selectedItem.children && selectedItem.children.length > 0 ? (
                                    <Flex wrap="wrap" gap={3}>
                                        {selectedItem.children.map((item) => (
                                            <Box
                                                key={item.path}
                                                p={3}
                                                borderWidth="1px"
                                                borderColor={borderColor}
                                                borderRadius="md"
                                                width="120px"
                                                textAlign="center"
                                                cursor="pointer"
                                                _hover={{ bg: cardBg }}
                                                onClick={() => handleSelectItem(item)}
                                            >
                                                <Icon
                                                    as={item.type === 'directory' ? FaFolder : getFileIcon(item.extension)}
                                                    fontSize="2xl"
                                                    mb={2}
                                                    color={item.type === 'directory' ? "yellow.400" : "blue.400"}
                                                />
                                                <Text fontSize="xs" lineClamp={2}>
                                                    {item.name}
                                                </Text>
                                            </Box>
                                        ))}
                                    </Flex>
                                ) : (
                                    <Center height="200px" borderWidth="1px" borderColor={borderColor} borderRadius="md" bg={cardBg}>
                                        <Text color={textColor}>
                                            {t("empty_folder")}
                                        </Text>
                                    </Center>
                                )}
                            </Box>
                        ) : (
                            <Box>
                                <Heading size="sm" mb={4} color={textColorHeading}>
                                    <Flex align="center" justify="space-between">
                                        <Flex align="center">
                                            <Icon as={getFileIcon(selectedItem.extension)} mr={2} color="blue.400" />
                                            {selectedItem.name}
                                        </Flex>
                                        <Button
                                            size="sm"
                                            onClick={() => handleDownload(selectedItem)}
                                        >
                                            <Icon as={FaDownload} mr={2} />
                                            {t("download")}
                                        </Button>
                                    </Flex>
                                </Heading>

                                <Box
                                    p={4}
                                    borderWidth="1px"
                                    borderColor={borderColor}
                                    borderRadius="md"
                                    bg={cardBg}
                                    height="calc(100% - 60px)"
                                    overflowY="auto"
                                >
                                    {isContentLoading ? (
                                        <Center height="100px">
                                            <Spinner />
                                        </Center>
                                    ) : fileContent ? (
                                        <Box fontFamily="mono" fontSize="sm" whiteSpace="pre-wrap">
                                            <Code width="100%" p={4} overflowX="auto">
                                                {fileContent}
                                            </Code>
                                        </Box>
                                    ) : (
                                        <Center height="200px">
                                            <Text color={textColor}>
                                                {t("file_preview_not_available")}
                                            </Text>
                                        </Center>
                                    )}
                                </Box>
                            </Box>
                        )
                    ) : (
                        <Center height="100%" flexDirection="column" gap={4}>
                            <Icon as={FaFolderOpen} fontSize="6xl" color="blue.400" />
                            <Text fontSize="xl" fontWeight="bold" color={textColorHeading}>
                                {t("select_file_or_folder")}
                            </Text>
                            <Text color={textColor} textAlign="center" maxW="md">
                                {t("file_explorer_description")}
                            </Text>
                        </Center>
                    )}
                </Box>
            </Flex>

            {/* New Folder Dialog */}
            <Dialog.Root open={isNewFolderOpen} onOpenChange={closeNewFolderDialog} initialFocusEl={() => newItemInputRef.current}>
                <Portal>
                    <Dialog.Backdrop />
                    <Dialog.Positioner>
                        <Dialog.Content>
                            <Dialog.Header>
                                <Dialog.Title color={textColorHeading}>{t("create_new_folder")}</Dialog.Title>
                                <Dialog.CloseTrigger />
                            </Dialog.Header>

                            <Dialog.Body>
                                <Stack gap={4}>
                                    <Field.Root>
                                        <Field.Label color={textColorStrong}>{t("folder_name")}</Field.Label>
                                        <Input
                                            ref={newItemInputRef}
                                            value={newItemName}
                                            onChange={(e) => setNewItemName(e.target.value)}
                                            placeholder={t("enter_folder_name")}
                                            color={textColor}
                                        />
                                    </Field.Root>
                                </Stack>
                            </Dialog.Body>

                            <Dialog.Footer>
                                <Dialog.ActionTrigger asChild>
                                    <Button variant="ghost" onClick={closeNewFolderDialog} color={textColor}>
                                        {t("cancel")}
                                    </Button>
                                </Dialog.ActionTrigger>
                                <Button
                                    colorScheme="blue"
                                    onClick={handleCreateFolder}
                                >
                                    {t("create")}
                                </Button>
                            </Dialog.Footer>
                        </Dialog.Content>
                    </Dialog.Positioner>
                </Portal>
            </Dialog.Root>

            {/* New File Dialog */}
            <Dialog.Root open={isNewFileOpen} onOpenChange={closeNewFileDialog} initialFocusEl={() => newItemInputRef.current}>
                <Portal>
                    <Dialog.Backdrop />
                    <Dialog.Positioner>
                        <Dialog.Content>
                            <Dialog.Header>
                                <Dialog.Title color={textColorHeading}>{t("create_new_file")}</Dialog.Title>
                                <Dialog.CloseTrigger />
                            </Dialog.Header>

                            <Dialog.Body>
                                <Stack gap={4}>
                                    <Field.Root>
                                        <Field.Label color={textColorStrong}>{t("file_name")}</Field.Label>
                                        <Input
                                            ref={newItemInputRef}
                                            value={newItemName}
                                            onChange={(e) => setNewItemName(e.target.value)}
                                            placeholder={t("enter_file_name")}
                                            color={textColor}
                                        />
                                    </Field.Root>
                                </Stack>
                            </Dialog.Body>

                            <Dialog.Footer>
                                <Dialog.ActionTrigger asChild>
                                    <Button variant="ghost" onClick={closeNewFileDialog} color={textColor}>
                                        {t("cancel")}
                                    </Button>
                                </Dialog.ActionTrigger>
                                <Button
                                    colorScheme="blue"
                                    onClick={handleCreateFile}
                                >
                                    {t("create")}
                                </Button>
                            </Dialog.Footer>
                        </Dialog.Content>
                    </Dialog.Positioner>
                </Portal>
            </Dialog.Root>
        </Box>
    );
}
