"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import {
  VStack,
  Text,
  Flex,
  Icon,
  Box,
  IconButton,
  Heading,
} from "@chakra-ui/react";
import { redirect, useParams } from "next/navigation";
import { FaGithub, FaGoogle, FaSignInAlt } from "react-icons/fa";
import { signIn } from "next-auth/react";
import { toaster } from "@/components/ui/toaster";
import { useColorModeValue } from "@/components/ui/color-mode";
import { motion } from "framer-motion";
import { useSelector } from "react-redux";
import { RootState } from "@/store/store";

// Create motion components
const MotionBox = motion.create(Box);
const MotionVStack = motion.create(VStack);

export default function SigninPage() {
  const t = useTranslations("Signin");
  const [error, setError] = useState("");
  const { isAuthenticated } = useSelector((state: RootState) => state.user);

  // Color mode values - matching settings page
  const accentColor = "blue.500";
  const boxBg = useColorModeValue("white", "gray.800");
  const boxBorderColor = useColorModeValue("gray.200", "gray.700");
  const separatorColor = useColorModeValue("gray.300", "gray.600");
  const secondaryTextColor = useColorModeValue("gray.600", "gray.400");
  const textColorHeading = useColorModeValue("gray.800", "gray.100");
  const shadowColor = useColorModeValue("rgba(0,0,0,0.1)", "rgba(0,0,0,0.3)");

  const params = useParams();
  const locale = params.locale as string;

  // Animation variants
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        duration: 0.4,
        when: "beforeChildren",
        staggerChildren: 0.1,
      },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.3 } },
  };

  if (isAuthenticated) {
    return redirect("/");
  }

  return (
    <MotionBox
      maxW="2xl"
      w="100%"
      mx="auto"
      mt={12}
      px={4}
      initial="hidden"
      animate="visible"
      variants={containerVariants}
    >
      <MotionVStack
        align="stretch"
        p={8}
        borderWidth="1px"
        borderRadius="lg"
        bg={boxBg}
        borderColor={boxBorderColor}
        boxShadow={`0 4px 12px ${shadowColor}`}
        variants={itemVariants}
      >
        <Heading fontSize="3xl" fontWeight="bold" textAlign="center" mb={6} color={textColorHeading}>
          <Flex align="center" justify="center">
            <Icon as={FaSignInAlt} mr={3} color={accentColor} boxSize={6} />
            {t("signin")}
          </Flex>
        </Heading>

        <Text textAlign="center" color={secondaryTextColor} mb={6}>
          {t("use_third_party_login")}
        </Text>

        <Flex justify="center" gap={6} mb={6}>
          {/* Google Icon Button */}
          <IconButton
            aria-label="Sign in with Google"
            size="xl"
            variant="outline"
            borderRadius="full"
            disabled={true}
            onClick={(e) => {
              e.preventDefault();
              try {
                signIn("google", {
                  callbackUrl: "https://onlysaid.com/api/auth/callback/google",
                  redirect: true
                });
              } catch (error) {
                console.error("Error signing in with Google:", error);
              }
            }}
          >
            <Icon as={FaGoogle} boxSize={6} />
          </IconButton>

          {/* GitHub Icon Button */}
          <IconButton
            aria-label="Sign in with GitHub"
            size="xl"
            variant="outline"
            borderRadius="full"
            onClick={(e) => {
              e.preventDefault();

              signIn("github", {
                callbackUrl: `https://onlysaid.com/api/redirect/third_party_login?locale=${locale}`,
                redirect: true
              });
            }}
          >
            <Icon as={FaGithub} boxSize={6} />
          </IconButton>
        </Flex>

        {error && (
          <Text color="red.500" textAlign="center">
            {error}
          </Text>
        )}
      </MotionVStack>
    </MotionBox>
  );
}
