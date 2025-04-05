"use client";

import { useTranslations } from "next-intl";
import { Box, Icon, Text, Center, VStack } from "@chakra-ui/react";
import { FaTasks } from "react-icons/fa";
import { usePlansColors } from "@/utils/colors";

export default function PlansPage() {
  const t = useTranslations("Plans");
  const colors = usePlansColors();

  return (
    <Center height="100%" p={8}>
      <VStack gap={4}>
        <Icon as={FaTasks} fontSize="6xl" color={colors.accentColor} />
        <Text fontSize="xl" fontWeight="bold" color={colors.textColorHeading}>
          {t("select_plan")}
        </Text>
        <Text color={colors.textColorMuted} textAlign="center" maxW="md">
          {t("select_plan_description")}
        </Text>
      </VStack>
    </Center>
  );
}