"use client";

import React from "react";
import { Box, Flex, Text, Avatar, Icon } from "@chakra-ui/react";
import { motion } from "framer-motion";
import { FaQuoteLeft } from "react-icons/fa";

const MotionBox = motion.create(Box);

interface TestimonialProps {
    id: string;
    name: string;
    role: string;
    company: string;
    content: string;
    avatar: string;
}

interface TestimonialCardProps {
    testimonial: TestimonialProps;
    index: number;
    bgColor: string;
    borderColor: string;
    textColor: string;
    textColorSecondary: string;
}

export function TestimonialCard({
    testimonial,
    index,
    bgColor,
    borderColor,
    textColor,
    textColorSecondary
}: TestimonialCardProps) {
    return (
        <MotionBox
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 * (index + 1), duration: 0.3 }}
            bg={bgColor}
            p={5}
            borderRadius="lg"
            boxShadow="sm"
            border="1px solid"
            borderColor={borderColor}
            minWidth={{ base: "100%", md: "300px" }}
            maxWidth={{ base: "100%", md: "350px" }}
            flex="1"
            position="relative"
            _hover={{
                transform: "translateY(-3px)",
                boxShadow: "md",
                transition: "all 0.2s ease"
            }}
        >
            <Icon
                as={FaQuoteLeft}
                position="absolute"
                top={3}
                right={3}
                color="gray.200"
                fontSize="xl"
            />

            <Text
                color={textColor}
                fontSize="md"
                fontStyle="italic"
                mb={4}
                lineHeight="1.6"
            >
                "{testimonial.content}"
            </Text>

            <Flex align="center">
                {/* <Avatar
                    src={testimonial.avatar}
                    name={testimonial.name}
                    size="sm"
                    mr={3}
                /> */}
                <Box>
                    <Text
                        color={textColor}
                        fontWeight="medium"
                        fontSize="sm"
                    >
                        {testimonial.name}
                    </Text>
                    <Text
                        color={textColorSecondary}
                        fontSize="xs"
                    >
                        {testimonial.role}, {testimonial.company}
                    </Text>
                </Box>
            </Flex>
        </MotionBox>
    );
} 