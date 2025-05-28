/*
Create a user profile and store in db
*/

"use client";

import { useState, useEffect } from "react";
import { useTranslations } from "next-intl";
import {
    Box, Text, VStack, Heading,
    Input, Button, Stack, Flex, Icon, Avatar,
    Separator,
    IconButton
} from "@chakra-ui/react";
import { useColorModeValue } from "@/components/ui/color-mode";
import { motion } from "framer-motion";
import { FaUpload, FaUserCircle } from "react-icons/fa";
import { useRouter, useSearchParams, useParams } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import { User } from "@/types/user";
import { v4 as uuidv4 } from 'uuid';
import axios from "axios";
import { useDispatch } from "react-redux";
import { setUser } from "@/store/features/userSlice";
import { ProfileFormData, ProfileFormErrors } from "@/types/signup";
import { toaster } from "@/components/ui/toaster";

// Create motion components
const MotionBox = motion.create(Box);
const MotionVStack = motion.create(VStack);

export default function CreateProfilePage() {
    const t = useTranslations("Signup");
    const router = useRouter();
    const { data: session } = useSession();
    const dispatch = useDispatch();
    const params = useParams();
    const locale = params.locale as string;
    const searchParams = useSearchParams();

    // Color mode values - matching signin page style
    const accentColor = "blue.500";
    const boxBg = useColorModeValue("white", "gray.800");
    const boxBorderColor = useColorModeValue("gray.200", "gray.700");
    const labelColor = useColorModeValue("gray.700", "gray.300");
    const textColorHeading = useColorModeValue("gray.800", "gray.100");
    const secondaryTextColor = useColorModeValue("gray.600", "gray.400");
    const shadowColor = useColorModeValue("rgba(0,0,0,0.1)", "rgba(0,0,0,0.3)");
    const separatorColor = useColorModeValue("gray.300", "gray.600");
    const disabledBg = useColorModeValue("gray.100", "gray.700");
    const disabledColor = useColorModeValue("gray.600", "gray.400");

    const [formData, setFormData] = useState<ProfileFormData>({
        email: "",
        avatarUrl: ""
    });

    const [errors, setErrors] = useState<ProfileFormErrors>({});
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Get email and avatarUrl from URL parameters when component mounts
    useEffect(() => {
        const emailParam = searchParams.get('email');
        const avatarUrlParam = searchParams.get('avatarUrl');

        setFormData(prev => ({
            ...prev,
            email: emailParam || session?.user?.email || "",
            avatarUrl: avatarUrlParam || session?.user?.image || ""
        }));
    }, [session, searchParams]);

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

        if (errors[name as keyof ProfileFormErrors]) {
            setErrors({
                ...errors,
                [name]: undefined,
            });
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        const newErrors: ProfileFormErrors = {};

        if (Object.keys(newErrors).length > 0) {
            setErrors(newErrors);
            return;
        }

        setIsSubmitting(true);

        try {
            const createAt = new Date();
            const newUser: User = {
                id: uuidv4(),
                email: formData.email,
                avatar: formData.avatarUrl,
                created_at: createAt.toISOString(),
                updated_at: createAt.toISOString(),
                username: "",
                settings: {},
            }

            await axios.post("/api/user/create_user", newUser);

            // dispatch(setUser(newUser));
            toaster.create(
                {
                    title: "Profile created",
                    description: "Please login again",
                    type: "success"
                }
            )
            await signOut({ redirect: false });
            router.push(`/${locale}/signin`);
            // login again
        } catch (error) {
            toaster.create(
                {
                    title: "Profile creation error",
                    description: "Please try again later",
                    type: "error"
                }
            )
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
                    <Flex align="center" justify="center" wordBreak="break-word">
                        <Icon as={FaUserCircle} mr={3} color={accentColor} boxSize={6} />
                        {t("complete_your_profile")}
                    </Flex>
                </Heading>

                <form onSubmit={handleSubmit}>
                    <VStack align="stretch" gap={6}>
                        {/* Avatar Display */}
                        <Flex justify="center" direction="column" align="center" mb={6}>
                            <Avatar.Root size="2xl" mb={4}>
                                <Avatar.Fallback name={formData.email || "User"} />
                                {formData.avatarUrl && <Avatar.Image src={formData.avatarUrl} />}
                            </Avatar.Root>
                        </Flex>

                        <Separator bg={separatorColor} my={4} />

                        {/* Email - readonly only if provided from session */}
                        <Stack gap={2}>
                            <Text fontWeight="medium" fontSize="md" color={labelColor}>
                                {t("email")}
                            </Text>
                            <Input
                                name="email"
                                value={formData.email}
                                onChange={handleChange}
                                placeholder={t("email_placeholder")}
                                readOnly={!!formData.email}
                                disabled={!!formData.email}
                                bg={formData.email ? disabledBg : undefined}
                                color={formData.email ? disabledColor : undefined}
                                opacity={formData.email ? 0.8 : 1}
                                _hover={formData.email ? { cursor: "not-allowed" } : undefined}
                                aria-label={formData.email ? "Your email address from login" : "Enter your email address"}
                                _invalid={{ borderColor: "red.500" }}
                                size="lg"
                                height="50px"
                            />
                            {formData.email ? (
                                <Text fontSize="sm" color={secondaryTextColor}>
                                    {t("3rd_party_login_email")}
                                </Text>
                            ) : (
                                errors.email && (
                                    <Text color="red.500" fontSize="sm">
                                        {errors.email}
                                    </Text>
                                )
                            )}
                        </Stack>

                        <Button
                            mt={6}
                            colorScheme="blue"
                            loading={isSubmitting}
                            type="submit"
                            width="full"
                            size="lg"
                            height="54px"
                        >
                            {t("create_profile")}
                        </Button>
                    </VStack>
                </form>

                <Text textAlign="center" fontSize="sm" color={secondaryTextColor} mt={6}>
                    {t("profile_creation_description")}
                </Text>
            </MotionVStack>
        </MotionBox>
    );
}