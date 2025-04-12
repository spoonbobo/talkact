"use client"

import { useState, useRef, useEffect } from 'react';
import {
    Button,
    Dialog,
    Portal,
    Stack,
    Box,
    Text,
    Flex,
    Icon,
    Badge,
    Separator,
    Code,
    Heading,
    Link,
    Image,
    IconButton,
} from '@chakra-ui/react';
import { useTranslations } from "next-intl";
import { Document } from "@/types/kb";
import { FiExternalLink, FiFile, FiFileText, FiClock, FiDownload } from "react-icons/fi";

interface KnowledgeModalProps {
    isOpen: boolean;
    onClose: () => void;
    document: Document | null;
    colors?: any;
}

export function KnowledgeModal({ isOpen, onClose, document, colors }: KnowledgeModalProps) {
    const t = useTranslations("Learn.kb");
    const [previewLoading, setPreviewLoading] = useState(false);
    const [previewError, setPreviewError] = useState(false);

    // Default colors if not provided
    const textColorHeading = colors?.textColorHeading || "gray.800";
    const textColorStrong = colors?.textColorStrong || "gray.700";
    const textColor = colors?.textColor || "gray.600";
    const textColorMuted = colors?.textColorMuted || "gray.500";
    const borderColor = colors?.borderColor || "gray.200";
    const accentColor = colors?.accentColor || "blue.500";

    // Reset states when document changes
    useEffect(() => {
        setPreviewLoading(false);
        setPreviewError(false);
    }, [document]);

    // Function to get icon based on document type
    const getDocumentIcon = (type: string) => {
        switch (type) {
            case "PDF":
                return FiFileText;
            case "DOCX":
            case "XLSX":
            case "PPTX":
                return FiFile;
            default:
                return FiFile;
        }
    };

    // Function to get color based on document type
    const getDocumentColor = (type: string) => {
        switch (type) {
            case "PDF":
                return "red.500";
            case "DOCX":
                return "blue.500";
            case "XLSX":
                return "green.500";
            case "PPTX":
                return "orange.500";
            default:
                return "gray.500";
        }
    };

    // Function to render document preview
    const renderDocumentPreview = () => {
        if (!document) return null;



        // For simplicity, we'll just show document metadata
        // In a real implementation, you might want to embed a PDF viewer or other preview mechanism
        return (
            <Box
                p={4}
                bg={`${accentColor}05`}
                borderRadius="md"
                border="1px"
                borderColor={borderColor}
            >
                {/* <Text color={textColorMuted} fontSize="sm" mb={4}>
                    {t("preview_placeholder")}
                </Text> */}

                <Box position="relative">
                    {document.url ? (
                        <Image
                            src={document.url}
                            alt={document.title}
                            maxHeight="300px"
                            mx="auto"
                            mb={4}
                            borderRadius="md"
                            onError={(e) => {
                                // Replace with fallback image on error
                                e.currentTarget.src = "https://via.placeholder.com/300x200?text=No+Preview";
                            }}
                        />
                    ) : (
                        <Box
                            height="200px"
                            display="flex"
                            alignItems="center"
                            justifyContent="center"
                            bg={`${accentColor}10`}
                            borderRadius="md"
                            mb={4}
                        >
                            <IconButton
                                aria-label={document.type || "Document"}
                                size="lg"
                                colorScheme="blue"
                                variant="ghost"
                            >
                                <Icon as={getDocumentIcon(document.type)} />
                            </IconButton>
                        </Box>
                    )}
                </Box>

                <Flex justify="center" mt={2}>
                    <Link
                        href={document.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        mr={2}
                    >
                        <IconButton
                            aria-label={t("open_document")}
                            colorScheme="blue"
                            size="md"
                        >
                            <Icon as={FiExternalLink} />
                        </IconButton>
                    </Link>

                    <Link
                        href={document.url}
                        download
                    >
                        <IconButton
                            aria-label={t("download")}
                            colorScheme="blue"
                            variant="outline"
                            size="md"
                            disabled={true}
                        >
                            <Icon as={FiDownload} />
                        </IconButton>
                    </Link>
                </Flex>
            </Box>
        );
    };

    return (
        <Dialog.Root open={isOpen} onOpenChange={onClose}>
            <Portal>
                <Dialog.Backdrop />
                <Dialog.Positioner>
                    <Dialog.Content maxWidth="700px">
                        <Dialog.Header>
                            <Dialog.Title color={textColorHeading}>
                                {document ? (
                                    <Flex align="center" gap={2}>
                                        <Icon
                                            as={document.type ? getDocumentIcon(document.type) : FiFile}
                                            color={document.type ? getDocumentColor(document.type) : "gray.500"}
                                        />
                                        {document.title || t("document_details")}
                                    </Flex>
                                ) : (
                                    t("document_details")
                                )}
                            </Dialog.Title>
                            <Dialog.CloseTrigger />
                        </Dialog.Header>

                        <Dialog.Body>
                            {document ? (
                                <Stack gap={4}>
                                    {/* Document Type */}
                                    <Flex justify="space-between" align="center">
                                        <Badge
                                            colorScheme={
                                                document.type === "PDF" ? "red" :
                                                    document.type === "DOCX" ? "blue" :
                                                        document.type === "XLSX" ? "green" :
                                                            document.type === "PPTX" ? "orange" : "gray"
                                            }
                                        >
                                            {document.type}
                                        </Badge>

                                        <Text fontSize="sm" color={textColorMuted}>
                                            <Icon as={FiClock} mr={1} />
                                            {document.date}
                                        </Text>
                                    </Flex>

                                    {/* Document Description */}
                                    {document.description && (
                                        <Box>
                                            <Text fontWeight="medium" color={textColorStrong} mb={1}>
                                                {t("preview")}
                                            </Text>
                                            <Text color={textColor} whiteSpace="pre-wrap">
                                                {document.description}
                                            </Text>
                                        </Box>
                                    )}

                                    {/* Document Tags */}
                                    {document.tags && document.tags.length > 0 && (
                                        <Box>
                                            <Text fontWeight="medium" color={textColorStrong} mb={1}>
                                                {t("tags")}
                                            </Text>
                                            <Flex wrap="wrap" gap={2}>
                                                {document.tags.map((tag, idx) => (
                                                    <Badge key={idx} colorScheme="blue" variant="subtle">
                                                        {tag}
                                                    </Badge>
                                                ))}
                                            </Flex>
                                        </Box>
                                    )}

                                    {/* Document Source */}
                                    {document.source && (
                                        <Box>
                                            <Text fontWeight="medium" color={textColorStrong} mb={1}>
                                                {t("source")}
                                            </Text>
                                            <Text color={textColor}>{document.source}</Text>
                                        </Box>
                                    )}

                                    {renderDocumentPreview()}


                                </Stack>
                            ) : (
                                <Text color={textColorMuted}>{t("no_document_selected")}</Text>
                            )}
                        </Dialog.Body>

                        <Dialog.Footer>
                            <Button onClick={onClose} colorScheme="blue">
                                {t("close")}
                            </Button>
                        </Dialog.Footer>
                    </Dialog.Content>
                </Dialog.Positioner>
            </Portal>
        </Dialog.Root>
    );
}