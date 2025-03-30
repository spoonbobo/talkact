"use client";

import React from "react";
import { Box, Flex, Text, Portal, Popover } from "@chakra-ui/react";
import { motion } from "framer-motion";
import { useColorModeValue } from "@/components/ui/color-mode";

const MotionBox = motion.create(Box);

interface FeatureItemProps {
    color: string;
    title: string;
    description: string;
    textColor: string;
    textColorSecondary: string;
    cardBorderColor: string;
}

export function FeatureItem({
    color,
    title,
    description,
    textColor,
    textColorSecondary,
    cardBorderColor
}: FeatureItemProps) {
    const dialogBgColor = useColorModeValue("white", "gray.800");

    return (
        <MotionBox
            initial={{ opacity: 0, x: -5 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.3 }}
        >
            <Popover.Root>
                <Popover.Trigger asChild>
                    <Flex align="center" cursor="pointer" _hover={{ opacity: 0.8 }}>
                        <Box w="10px" h="10px" borderRadius="full" bg={color} mr={2}></Box>
                        <Text fontSize="sm" color={textColor}>
                            {title}
                        </Text>
                    </Flex>
                </Popover.Trigger>
                <Portal>
                    <Popover.Positioner>
                        <Popover.Content bg={dialogBgColor} borderColor={cardBorderColor} maxW="250px">
                            <Popover.Arrow />
                            <Popover.Body p={2}>
                                <Text color={textColorSecondary} fontSize="xs">
                                    {description}
                                </Text>
                            </Popover.Body>
                        </Popover.Content>
                    </Popover.Positioner>
                </Portal>
            </Popover.Root>
        </MotionBox>
    );
} 