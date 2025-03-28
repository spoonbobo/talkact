import {
    Box, Text, VStack, HStack, Input, Button, Flex,
    Icon, Badge, Heading,
    Tag, Spinner
} from "@chakra-ui/react";

import { motion, HTMLMotionProps, AnimatePresence } from "framer-motion";
import { useState } from "react";
import {
    FiUpload, FiSearch, FiFolder, FiFile, FiFileText,
    FiClock, FiInfo,
} from "react-icons/fi";
import { useColorModeValue } from "@/components/ui/color-mode";
import { useTranslations } from 'next-intl';
// Define MotionBox component with proper typing
const MotionBox = motion(Box) as React.FC<Omit<React.ComponentProps<typeof Box>, "transition"> & HTMLMotionProps<"div">>;
const MotionFlex = motion(Flex);

export const KnowledgeBase = () => {
    // Add state for search and category selection
    const t = useTranslations("Learn");
    const [searchQuery, setSearchQuery] = useState("");
    const [searchFocused, setSearchFocused] = useState(false);
    const [selectedCategory, setSelectedCategory] = useState<string>("all");
    const [isUploading, setIsUploading] = useState(false);

    // Sample document data for UI mockup
    const sampleDocuments = [
        {
            id: "doc1",
            title: "Introduction to AI",
            type: "PDF",
            date: "2023-12-01",
            tags: ["AI", "Technology"],
            source: "Upload",
            description: "A comprehensive introduction to artificial intelligence concepts, history, and modern applications."
        },
        {
            id: "doc2",
            title: "Database Design Patterns",
            type: "DOCX",
            date: "2023-11-20",
            tags: ["Database", "Design"],
            source: "Upload",
            description: "Best practices for database schema design, normalization techniques, and common design patterns."
        },
        {
            id: "doc3",
            title: "Machine Learning Basics",
            type: "PDF",
            date: "2023-10-15",
            tags: ["ML", "AI", "Tutorial"],
            source: "Web",
            description: "An introduction to machine learning algorithms, training methodologies, and evaluation metrics."
        },
    ];

    // Sample categories for the sidebar
    const categories = [
        { id: "all", name: "All Documents", count: sampleDocuments.length, icon: FiFolder },
        { id: "ai", name: "AI & Machine Learning", count: 2, icon: FiFileText },
        { id: "database", name: "Database", count: 1, icon: FiFileText },
        { id: "recent", name: "Recently Added", count: 3, icon: FiClock },
        { id: "upload", name: "Upload Document", count: 0, icon: FiUpload },
    ];

    // Filter documents based on search and category
    const filteredDocuments = sampleDocuments.filter(doc => {
        const matchesSearch = searchQuery === "" ||
            doc.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
            doc.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()));

        const matchesCategory = selectedCategory === "all" ||
            (selectedCategory === "ai" && doc.tags.some(tag => ["AI", "ML"].includes(tag))) ||
            (selectedCategory === "database" && doc.tags.some(tag => ["Database"].includes(tag))) ||
            (selectedCategory === "recent" && new Date(doc.date) > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000));

        return matchesSearch && matchesCategory;
    });

    // Handle category selection
    const handleCategorySelect = (categoryId: string) => {
        if (categoryId === "upload") {
            handleUpload();
        } else {
            setSelectedCategory(categoryId);
        }
    };

    // Handle upload
    const handleUpload = () => {
        setIsUploading(true);
        // Simulate upload process
        setTimeout(() => {
            setIsUploading(false);
        }, 2000);
    };

    // Color mode values
    const bgColor = useColorModeValue("white", "gray.800");
    const textColor = useColorModeValue("gray.600", "gray.400");
    const textColorStrong = useColorModeValue("gray.700", "gray.300");
    const textColorHeading = useColorModeValue("gray.800", "gray.100");
    const borderColor = useColorModeValue("gray.200", "gray.700");
    const searchBg = useColorModeValue("white", "gray.700");
    const searchFocusBg = useColorModeValue("gray.50", "gray.600");
    const categoryHeaderBg = useColorModeValue("gray.50", "gray.700");
    const selectedCategoryBg = useColorModeValue("blue.50", "blue.800");
    const selectedCategoryBorderColor = useColorModeValue("blue.500", "blue.300");
    const categoryHoverBg = useColorModeValue("gray.50", "gray.700");
    const emptyStateBg = useColorModeValue("gray.50", "gray.700");
    const scrollbarThumbColor = useColorModeValue("rgba(0,0,0,0.1)", "rgba(255,255,255,0.1)");
    const scrollbarThumbHoverColor = useColorModeValue("rgba(0,0,0,0.2)", "rgba(255,255,255,0.2)");
    const cardBg = useColorModeValue("white", "gray.800");
    const cardBorderColor = useColorModeValue("gray.200", "gray.700");
    const cardHoverBorderColor = useColorModeValue("blue.200", "blue.300");
    const cardHeadingColor = useColorModeValue("blue.700", "blue.300");

    return (
        <MotionBox
            width="100%"
            height="100%"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.3 }}
        >
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
                {/* Left Column - Categories */}
                <Box
                    width={{ base: "100%", md: "25%" }}
                    minW={{ md: "220px" }}
                    position="relative"
                    display="flex"
                    flexDirection="column"
                    h={{ base: "300px", md: "100%" }}
                >
                    {/* Search Box */}
                    <Box
                        mb={3}
                        position="relative"
                    >
                        <Box position="absolute" left={3} top="50%" transform="translateY(-50%)" zIndex={1} pointerEvents="none">
                            <Icon as={FiSearch} color={searchFocused ? "blue.400" : "gray.400"} transition="color 0.2s" />
                        </Box>
                        <Input
                            placeholder={t("kb.search_placeholder")}
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
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
                        {searchQuery && (
                            <Box position="absolute" right={3} top="50%" transform="translateY(-50%)">
                                <Button
                                    size="xs"
                                    variant="ghost"
                                    onClick={() => setSearchQuery('')}
                                    aria-label="Clear search"
                                >
                                    Clear
                                </Button>
                            </Box>
                        )}
                    </Box>

                    {/* Categories List */}
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
                        <Heading size="sm" p={2} bg={categoryHeaderBg} borderBottom="1px" borderColor={borderColor} color={textColorHeading}>
                            <Icon as={FiFolder} mr={2} />
                            {t("kb.document_categories")}
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
                            {categories.map((category) => (
                                <MotionBox
                                    key={category.id}
                                    p={3}
                                    cursor="pointer"
                                    bg={category.id === selectedCategory ? selectedCategoryBg : bgColor}
                                    borderLeft={category.id === selectedCategory ? "4px solid" : "4px solid transparent"}
                                    borderColor={category.id === selectedCategory ? selectedCategoryBorderColor : "transparent"}
                                    _hover={{ bg: category.id === selectedCategory ? selectedCategoryBg : categoryHoverBg }}
                                    onClick={() => handleCategorySelect(category.id)}
                                    transitionDuration="0.2s"
                                    borderBottom="1px"
                                    borderBottomColor={borderColor}
                                    whileHover={{ scale: 1.01 }}
                                    whileTap={{ scale: 0.98 }}
                                >
                                    <Flex justify="space-between" align="center">
                                        <HStack>
                                            <Icon as={category.icon} color={textColorStrong} />
                                            <Text fontSize="sm" color={textColorStrong}>{category.name}</Text>
                                        </HStack>
                                        {category.count > 0 && (
                                            <Badge colorScheme="blue" fontSize="xs">
                                                {category.count}
                                            </Badge>
                                        )}
                                    </Flex>
                                </MotionBox>
                            ))}
                        </VStack>
                    </Box>
                </Box>

                {/* Right Column - Documents */}
                <Box
                    width={{ base: "100%", md: "75%" }}
                    h={{ base: "auto", md: "100%" }}
                    display="flex"
                    flexDirection="column"
                    overflow="hidden"
                    position="relative"
                >
                    {selectedCategory !== "upload" ? (
                        <VStack
                            align="stretch"
                            overflowY="auto"
                            pr={2}
                            flex="1"
                            pb={3}
                            css={{
                                '&::-webkit-scrollbar': { width: '6px' },
                                '&::-webkit-scrollbar-track': { background: 'transparent' },
                                '&::-webkit-scrollbar-thumb': { background: scrollbarThumbColor, borderRadius: '4px' },
                                '&::-webkit-scrollbar-thumb:hover': { background: scrollbarThumbHoverColor }
                            }}
                        >
                            <AnimatePresence>
                                {filteredDocuments.length > 0 ? (
                                    <Flex flexWrap="wrap" gap={4} p={1}>
                                        {filteredDocuments.map((doc, index) => (
                                            <motion.div
                                                key={doc.id}
                                                initial={{ opacity: 0, y: 20 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                transition={{
                                                    duration: 0.3,
                                                    delay: 0.05 * index,
                                                    ease: "easeOut"
                                                }}
                                                style={{ width: 'calc(33.33% - 11px)' }}
                                            >
                                                <MotionBox
                                                    p={4}
                                                    borderRadius="md"
                                                    bg={cardBg}
                                                    border="1px"
                                                    borderColor={cardBorderColor}
                                                    boxShadow="sm"
                                                    _hover={{ boxShadow: "md", borderColor: cardHoverBorderColor }}
                                                    transition={{ duration: 0.3 }}
                                                    height="180px"
                                                    display="flex"
                                                    flexDirection="column"
                                                    position="relative"
                                                    overflow="hidden"
                                                    whileHover={{ y: -4 }}
                                                >
                                                    <Flex justifyContent="space-between" mb={3}>
                                                        <Icon
                                                            as={doc.type === "PDF" ? FiFileText : FiFile}
                                                            color={doc.type === "PDF" ? "red.500" : "blue.500"}
                                                            w={5}
                                                            h={5}
                                                        />
                                                        <Badge colorScheme={doc.type === "PDF" ? "red" : "blue"} fontSize="xs">{doc.type}</Badge>
                                                    </Flex>

                                                    <Heading size="sm" color={cardHeadingColor} mb={2}>{doc.title}</Heading>

                                                    <Text fontSize="sm" color={textColorStrong} mb={3} flex="1">
                                                        {doc.description}
                                                    </Text>

                                                    <Flex justify="space-between" align="center" mt="auto">
                                                        <Text fontSize="xs" color={textColor}>
                                                            <Icon as={FiClock} mr={1} />
                                                            {doc.date}
                                                        </Text>

                                                        <Flex wrap="wrap" gap={1} justify="flex-end">
                                                            {doc.tags.slice(0, 2).map((tag, idx) => (
                                                                <Tag.Root key={idx} size="sm" colorScheme="blue" variant="subtle">
                                                                    <Tag.Label fontSize="xs">{tag}</Tag.Label>
                                                                </Tag.Root>
                                                            ))}
                                                            {doc.tags.length > 2 && (
                                                                <Tag.Root size="sm" colorScheme="gray" variant="subtle">
                                                                    <Tag.Label fontSize="xs">+{doc.tags.length - 2}</Tag.Label>
                                                                </Tag.Root>
                                                            )}
                                                        </Flex>
                                                    </Flex>
                                                </MotionBox>
                                            </motion.div>
                                        ))}
                                    </Flex>
                                ) : (
                                    <Box p={6} textAlign="center" bg={emptyStateBg} borderRadius="md" flex="1" display="flex" alignItems="center" justifyContent="center" flexDirection="column">
                                        <Icon as={FiInfo} w={8} h={8} color={textColor} mb={3} />
                                        <Text color={textColorStrong}>No documents match your search criteria.</Text>
                                        {searchQuery && (
                                            <Button
                                                mt={4}
                                                size="sm"
                                                colorScheme="blue"
                                                variant="outline"
                                                onClick={() => setSearchQuery('')}
                                            >
                                                Clear search
                                            </Button>
                                        )}
                                    </Box>
                                )}
                            </AnimatePresence>
                        </VStack>
                    ) : (
                        <Box p={6} textAlign="center" bg={emptyStateBg} borderRadius="md" flex="1" display="flex" alignItems="center" justifyContent="center" flexDirection="column">
                            <Icon as={FiUpload} w={8} h={8} color={textColor} mb={3} />
                            <Heading size="md" mb={2} color={textColorHeading}>Upload New Document</Heading>
                            <Text color={textColorStrong} mb={4}>Drag and drop your document here or click to browse</Text>
                            <Button colorScheme="blue" leftIcon={<Icon as={FiUpload} />} onClick={handleUpload}>
                                {t("kb.upload_document")}
                            </Button>
                        </Box>
                    )}

                    {/* Upload Area - Shows when uploading */}
                    {isUploading && (
                        <Box
                            position="absolute"
                            top="0"
                            left="0"
                            right="0"
                            bottom="0"
                            bg={useColorModeValue("rgba(255,255,255,0.9)", "rgba(26,32,44,0.9)")}
                            zIndex={10}
                            display="flex"
                            alignItems="center"
                            justifyContent="center"
                            flexDirection="column"
                            p={6}
                        >
                            <Spinner size="xl" color="blue.500" mb={4} />
                            <Heading size="md" mb={2} color={textColorHeading}>Uploading Document</Heading>
                            <Text color={textColorStrong}>Please wait while your document is being processed...</Text>
                        </Box>
                    )}
                </Box>
            </MotionFlex>
        </MotionBox>
    );
};