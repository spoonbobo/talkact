"use client";
import { Spinner, Center, Heading, Box, Text, VStack } from "@chakra-ui/react";
import { useTranslations } from "next-intl";

interface LoadingProps {
  message?: string;
  description?: string;
  fullHeight?: boolean;
}

export default function Loading({
  message,
  description,
  fullHeight = true
}: LoadingProps) {
  const t = useTranslations("Loading");

  return (
    <Box height={fullHeight ? "100vh" : "100%"} position="relative">
      <Spinner
        size="xl"
        color="blue.500"
        position="absolute"
        top={4}
        left={4}
      />
      <Center height="100%" flexDirection="column">
        <VStack>
          <Heading size="lg" mt={4} color="gray.700">
            {message || t("load")}
          </Heading>
          {description && (
            <Text color="gray.600">{description}</Text>
          )}
        </VStack>
      </Center>
    </Box>
  );
}
