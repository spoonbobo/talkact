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
} from "@chakra-ui/react";
import { useRouter } from "next/navigation";
import { FaGithub, FaGoogle } from "react-icons/fa";
import { ISigninForm, ISigninErrors } from "@/types/signin";
import { signIn } from "next-auth/react";
import { toaster } from "@/components/ui/toaster";

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
    <Box maxW="md" mx="auto" mt={8} p={6} borderWidth="1px" borderRadius="lg">
      <VStack align="stretch">
        <Text fontSize="2xl" fontWeight="bold" textAlign="center">
          {t("signin")}
        </Text>

        <form onSubmit={handleSubmit}>
          <VStack align="stretch">
            <Stack>
              <label>{t("username_or_email")}</label>
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
              />
              {errors.usernameOrEmail && (
                <Text color="red.500" fontSize="sm">
                  {errors.usernameOrEmail}
                </Text>
              )}
            </Stack>

            <Stack>
              <label>{t("password")}</label>
              <Input
                name="password"
                type={showPassword ? "text" : "password"}
                value={formData.password}
                onChange={handleChange}
                placeholder={t("password_placeholder")}
                _invalid={
                  errors.password ? { borderColor: "red.500" } : undefined
                }
              />
              {errors.password && (
                <Text color="red.500" fontSize="sm">
                  {errors.password}
                </Text>
              )}
            </Stack>

            <Button
              mt={2}
              colorScheme="blue"
              loading={isSubmitting}
              disabled={true}
              type="submit"
              width="full"
            >
              {t("sign_in")}
            </Button>
          </VStack>
        </form>

        <Flex align="center">
          <Separator flex="1" />
          <Text px={3} color="gray.500">
            {t("or")}
          </Text>
          <Separator flex="1" />
        </Flex>

        <Text textAlign="center" color="gray.600" mb={4}>
          {t("use_third_party_login")}
        </Text>

        <Flex justify="center" gap={4} mb={4}>
          {/* Google Icon Button */}
          <IconButton
            aria-label="Sign in with Google"
            size="lg"
            variant="outline"
            borderRadius="full"
            disabled={true}
            onClick={(e) => {
              e.preventDefault();
              signIn("google", { callbackUrl: "/" });
            }}
          >
            <Icon as={FaGoogle} />
          </IconButton>

          {/* GitHub Icon Button */}
          <IconButton
            aria-label="Sign in with GitHub"
            size="lg"
            variant="outline"
            borderRadius="full"
            onClick={(e) => {
              e.preventDefault();
              signIn("github", { callbackUrl: "/" });
              toaster.create({
                title: t("signin_success"),
                description: t("signin_success_description"),
              });
            }}
          >
            <Icon as={FaGithub} />
          </IconButton>
        </Flex>

        {errors.general && (
          <Text color="red.500" textAlign="center">
            {errors.general}
          </Text>
        )}

        <Text textAlign="center">
          {t("dont_have_account")}{" "}
          <Link href="/signup" style={{ color: "blue" }}>
            {t("create_account")}
          </Link>
        </Text>
      </VStack>
    </Box>
  );
}
