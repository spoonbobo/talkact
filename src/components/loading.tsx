"use client";
import { Spinner, Center, Heading, Box } from "@chakra-ui/react";
import { useTranslations } from "next-intl";

export default function Loading() {
  const t = useTranslations("Loading");
  return (
    <Box height="100vh" position="relative">
      <Spinner
        size="xl"
        color="blue.500"
        position="absolute"
        top={4}
        left={4}
      />
      <Center height="100%" flexDirection="column">
        <Heading size="lg" mt={4} color="gray.700">
          {t("load")}
        </Heading>
      </Center>
    </Box>
  );
}
