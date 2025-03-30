"use client";

import React from "react";
import { Box, Flex, Heading, Icon, Text } from "@chakra-ui/react";
import { motion } from "framer-motion";
import { IconType } from "react-icons";

const MotionFlex = motion.create(Flex);

interface NavigationCardProps {
    card: {
        id: string;
        title: string;
        description: string;
        icon: IconType;
        color: string;
        path: string;
    };
    index: number;
    onClick: () => void;
    bgColor: string;
    borderColor: string;
    hoverBorderColor: string;
    textColor: string;
    textColorSecondary: string;
}

export function NavigationCard({
    card,
    index,
    onClick,
    bgColor,
    borderColor,
    hoverBorderColor,
    textColor,
    textColorSecondary
}: NavigationCardProps) {
    return (
        <MotionFlex
            direction="column"
            bg={bgColor}
            p={6}
            borderRadius="xl"
            boxShadow="sm"
            border="1px solid"
            borderColor={borderColor}
            cursor="pointer"
            height="100%"
            onClick={onClick}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 * (index + 1), duration: 0.3 }}
            _hover={{
                transform: "translateY(-3px)",
                boxShadow: "md",
                borderColor: hoverBorderColor,
                transition: "all 0.2s ease"
            }}
        >
            <Flex align="flex-start" mb={4}>
                <Box
                    p={3}
                    borderRadius="lg"
                    bg={`${card.color}15`}
                    color={card.color}
                    mr={3}
                    display="flex"
                    alignItems="center"
                    justifyContent="center"
                >
                    <Icon as={card.icon} fontSize="xl" />
                </Box>
                <Heading size="md" color={textColor}>{card.title}</Heading>
            </Flex>
            <Text color={textColorSecondary} fontSize="sm" flex="1">
                {card.description}
            </Text>
        </MotionFlex>
    );
} 