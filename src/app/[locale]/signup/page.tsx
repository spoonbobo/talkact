"use client";

import { useTranslations } from "next-intl";
import { Box, Text, VStack, Container, Heading, Link } from "@chakra-ui/react";
import { useColorModeValue } from "@/components/ui/color-mode";
import { motion } from "framer-motion";
import SignupForm from "@/components/signup";

export default function SignupPage() {
  const t = useTranslations("Signup");

  return (
    <Container maxW="container.md" py={10}>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <VStack align="stretch">
          <Heading as="h1" textAlign="center">
            {t("signup")}
          </Heading>

          <Box
            p={8}
            borderRadius="lg"
            boxShadow="lg"
            bg={useColorModeValue("white", "gray.700")}
          >
            <SignupForm />
          </Box>

          <Text textAlign="center" fontSize="sm" color="gray.500">
            {t("already_have_account")}{" "}
            <Link href="/signin" color="blue.500">
              {t("signin")}
            </Link>
          </Text>
        </VStack>
      </motion.div>
    </Container>
  );
}
