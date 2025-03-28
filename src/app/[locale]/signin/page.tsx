"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import {
  Input,
  Button,
  VStack,
  Text,
  Stack,
  Flex,
  Icon,
  Separator,
  Box,
  IconButton,
  Heading,
} from "@chakra-ui/react";
import { useParams, useRouter } from "next/navigation";
import { FaGithub, FaGoogle, FaSignInAlt } from "react-icons/fa";
import { ISigninForm, ISigninErrors } from "@/types/signin";
import { signIn } from "next-auth/react";
import { toaster } from "@/components/ui/toaster";
import { useColorModeValue } from "@/components/ui/color-mode";
import { motion } from "framer-motion";

// Create motion components
const MotionBox = motion(Box);
const MotionVStack = motion(VStack);

export default function SigninPage() {
  const t = useTranslations("Signin");
  const router = useRouter();
  const [formData, setFormData] = useState<ISigninForm>({
    usernameOrEmail: "",
    password: "",
  });
  const [errors, setErrors] = useState<Partial<ISigninErrors>>({});
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Color mode values - matching settings page
  const accentColor = "blue.500";
  const boxBg = useColorModeValue("white", "gray.800");
  const boxBorderColor = useColorModeValue("gray.200", "gray.700");
  const labelColor = useColorModeValue("gray.700", "gray.300");
  const separatorColor = useColorModeValue("gray.300", "gray.600");
  const secondaryTextColor = useColorModeValue("gray.600", "gray.400");
  const linkColor = useColorModeValue("blue.500", "blue.300");
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

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value,
    });

    if (errors[name as keyof ISigninForm]) {
      setErrors({
        ...errors,
        [name]: undefined,
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const validate = (formData: ISigninForm) => {
      const e: Partial<ISigninErrors> = {};
      if (!formData.usernameOrEmail.trim()) {
        e.usernameOrEmail = t("username_or_email_required");
      }
      if (!formData.password) {
        e.password = t("password_required");
      }
      return e;
    };

    const errors = validate(formData);
    if (Object.keys(errors).length > 0) {
      setErrors(errors);
      return;
    }

    setIsSubmitting(true);

    try {
      // Replace with your actual signin API call
      // await signinUser(formData);
      console.log("Form submitted:", formData);

      // Redirect to dashboard after successful signin
      router.push("/");
    } catch (error) {
      console.error("Signin error:", error);
      setErrors({
        general: t("invalid_credentials"),
      });
    } finally {
      setIsSubmitting(false);
    }
  };

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

        <form onSubmit={handleSubmit}>
          <VStack align="stretch" gap={6}>
            <Stack gap={2}>
              <Text fontWeight="medium" fontSize="md" color={labelColor}>{t("username_or_email")}</Text>
              <Input
                name="usernameOrEmail"
                value={formData.usernameOrEmail}
                onChange={handleChange}
                placeholder={t("username_or_email_placeholder")}
                _invalid={
                  errors.usernameOrEmail
                    ? { borderColor: "red.500" }
                    : undefined
                }
                size="lg"
                height="50px"
              />
              {errors.usernameOrEmail && (
                <Text color="red.500" fontSize="sm">
                  {errors.usernameOrEmail}
                </Text>
              )}
            </Stack>

            <Stack gap={2}>
              <Text fontWeight="medium" fontSize="md" color={labelColor}>{t("password")}</Text>
              <Input
                name="password"
                type={showPassword ? "text" : "password"}
                value={formData.password}
                onChange={handleChange}
                placeholder={t("password_placeholder")}
                _invalid={
                  errors.password ? { borderColor: "red.500" } : undefined
                }
                size="lg"
                height="50px"
              />
              {errors.password && (
                <Text color="red.500" fontSize="sm">
                  {errors.password}
                </Text>
              )}
            </Stack>

            <Button
              mt={6}
              colorScheme="blue"
              loading={isSubmitting}
              disabled={true}
              type="submit"
              width="full"
              size="lg"
              height="54px"
            >
              {t("sign_in")}
            </Button>
          </VStack>
        </form>

        <Flex align="center" my={6}>
          <Separator flex="1" bg={separatorColor} />
          <Text px={3} color={secondaryTextColor}>
            {t("or")}
          </Text>
          <Separator flex="1" bg={separatorColor} />
        </Flex>

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
              signIn("google", { callbackUrl: "/" });
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
              signIn("github", { callbackUrl: `/api/redirect/third_party_login?locale=${locale}` });
              toaster.create({
                title: t("signin_success"),
                description: t("signin_success_description"),
              });
            }}
          >
            <Icon as={FaGithub} boxSize={6} />
          </IconButton>
        </Flex>

        {errors.general && (
          <Text color="red.500" textAlign="center">
            {errors.general}
          </Text>
        )}

        <Text textAlign="center" color={secondaryTextColor} fontSize="md">
          {t("dont_have_account")}{" "}
          <Link href="/signup" style={{ color: linkColor }}>
            {t("create_account")}
          </Link>
        </Text>
      </MotionVStack>
    </MotionBox>
  );
}
