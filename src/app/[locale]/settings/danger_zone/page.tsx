"use client";

import React from "react";
import {
    Box,
    Heading,
    Text,
    Flex,
    Separator,
} from "@chakra-ui/react";
import { useTranslations } from "next-intl";
import { useSelector } from 'react-redux';
import { RootState } from "@/store/store";
import { useColorModeValue } from "@/components/ui/color-mode";
import DangerZone from "@/components/settings/danger_zone";

export default function DangerZonePage() {
    const t = useTranslations("Settings");
    const { isOwner, isAuthenticated } = useSelector((state: RootState) => state.user);
    const textColor = useColorModeValue("gray.800", "gray.100");

    return (
        <>
            <Flex justifyContent="space-between" alignItems="center" mb={4}>
                <Heading size="md" color="red.500">
                    {t("danger_zone")}
                </Heading>
            </Flex>
            <Separator mb={6} />

            <Box>
                <DangerZone
                    isOwner={isOwner}
                    isAuthenticated={isAuthenticated}
                />
            </Box>
        </>
    );
}