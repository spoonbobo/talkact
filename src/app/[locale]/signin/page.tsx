"use client";

import { useEffect, useState } from "react";
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
import { redirect, useParams, useSearchParams } from "next/navigation";
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
  const searchParams = useSearchParams();

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

  const [effectiveCallbackUrl, setEffectiveCallbackUrl] = useState('');

  useEffect(() => {
    const clientType = searchParams.get('client_type');
    const electronCallbackUrl = searchParams.get('electron_callback_url');

    if (clientType === 'electron' && electronCallbackUrl) {
      setEffectiveCallbackUrl(decodeURIComponent(electronCallbackUrl));
      console.log('[SignInPage] Detected Electron flow. Effective Callback URL:', decodeURIComponent(electronCallbackUrl));
    } else {
      // Default callback for regular web users
      const webCallback = `${process.env.NEXT_PUBLIC_DOMAIN || ''}/${locale}/api/redirect/third_party_login`;
      // Note: /api/redirect/third_party_login?locale=${locale} was used before,
      // ensure this path is correct or adjust. If it's an API route, it usually doesn't include locale in its path directly.
      // Let's assume the API route is /api/redirect/third_party_login and it can get locale if needed.
      setEffectiveCallbackUrl(`${process.env.NEXT_PUBLIC_DOMAIN || ''}/api/redirect/third_party_login?locale=${locale}`);
      console.log('[SignInPage] Standard web flow. Effective Callback URL:', `${process.env.NEXT_PUBLIC_DOMAIN || ''}/api/redirect/third_party_login?locale=${locale}`);
    }
  }, [searchParams, locale]);

  const handleSignIn = (provider: 'google' | 'github') => {
    if (!effectiveCallbackUrl) {
      console.error("Callback URL not set yet! Cannot sign in.");
      toaster.create({ title: "Error", description: "Authentication system not ready. Please try again in a moment.", type: "error" });
      return;
    }
    try {
      signIn(provider, {
        callbackUrl: effectiveCallbackUrl,
        redirect: true,
      });
    } catch (err) {
      console.error(`Error signing in with ${provider}:`, err);
      toaster.create({ title: `Sign-in Error (${provider})`, description: (err as Error).message, type: "error" });
    }
  };

  if (isAuthenticated) {
    redirect(`/${locale}/dashboard`);
    return null;
  }

  if (!effectiveCallbackUrl && !searchParams.get('client_type')) {
    return <Box textAlign="center" mt={10}><Text>Loading authentication options...</Text></Box>;
  }

  return (
    <Box
      maxW="2xl"
      w="100%"
      mx="auto"
      mt={12}
      px={4}
    >
      <VStack
        align="stretch"
        p={8}
        borderWidth="1px"
        borderRadius="lg"
        bg={boxBg}
        borderColor={boxBorderColor}
        boxShadow={`0 4px 12px ${shadowColor}`}
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
            onClick={(e) => {
              e.preventDefault();
              handleSignIn('google');
            }}
            disabled={!effectiveCallbackUrl}
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
              handleSignIn('github');
            }}
            disabled={!effectiveCallbackUrl}
          >
            <Icon as={FaGithub} boxSize={6} />
          </IconButton>
        </Flex>

        {error && (
          <Text color="red.500" textAlign="center">
            {error}
          </Text>
        )}
      </VStack>
    </Box>
  );
}
