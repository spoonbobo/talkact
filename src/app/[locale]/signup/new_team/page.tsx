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
import axios from "axios";
import { useDispatch } from "react-redux";
import { toaster } from "@/components/ui/toaster";
import { Team } from "@/types/teams";
import { useSelector } from "react-redux";
import { RootState } from "@/store/store";
import { setUser } from "@/store/features/userSlice";

// Create motion components
const MotionBox = motion.create(Box);
const MotionVStack = motion.create(VStack);

export default function CreateTeamPage() {
    const t = useTranslations("Signup");
    const router = useRouter();
    const { data: session } = useSession();
    const { currentUser, isAuthenticated, isLoading, isSigningOut } = useSelector(
        (state: RootState) => state.user
    );
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

    const [formData, setFormData] = useState({
        teamName: ""
    });

    const [errors, setErrors] = useState<{ teamName?: string }>({});
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Generate default invite code - random alphanumeric string
    const generateDefaultInviteCode = () => {
        // Create a random 8-character alphanumeric string
        const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
        let result = '';
        for (let i = 0; i < 8; i++) {
            result += characters.charAt(Math.floor(Math.random() * characters.length));
        }
        return result;
    };

    const [inviteCode, setInviteCode] = useState(generateDefaultInviteCode());
    const [inviteError, setInviteError] = useState<string | null>(null);
    const [isJoining, setIsJoining] = useState(false);

    // Add state for individual invite code characters
    const [inviteCodeChars, setInviteCodeChars] = useState(Array(8).fill(''));

    const [activeTab, setActiveTab] = useState<'create' | 'join'>('create');

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

        if (errors[name as keyof typeof errors]) {
            setErrors({
                ...errors,
                [name]: undefined,
            });
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        const newErrors: { teamName?: string } = {};

        if (!formData.teamName.trim()) {
            newErrors.teamName = t("team_name_required");
        }

        if (Object.keys(newErrors).length > 0) {
            setErrors(newErrors);
            return;
        }

        setIsSubmitting(true);

        try {
            const createAt = new Date();
            const newTeam = {
                name: formData.teamName,
                created_at: createAt.toISOString(),
                updated_at: createAt.toISOString(),
                owners: [currentUser?.id || ""],
                members: [currentUser?.id || ""],
                invite_code: generateDefaultInviteCode()
            }

            const response = await axios.post("/api/team/create_team", newTeam);

            // Get the created team from the response
            const createdTeam = response.data.team;

            // update user
            const teamId = response.data.team_id;
            console.log("teamId", teamId);
            await axios.post("/api/user/update_user", {
                teamId: teamId,
                teamAction: "add"
            });

            // Update Redux store with the new team
            if (currentUser) {
                const updatedUser = {
                    ...currentUser,
                    teams: [...([]), createdTeam.id]
                };

                dispatch(setUser(updatedUser));
            }

            // 3. update team
            await axios.post("/api/team/update_team", {
                teamId: teamId,
                userId: currentUser?.id,
                action: "add_member"
            });

            toaster.create(
                {
                    title: "Team created",
                    description: "Your team has been created successfully",
                    type: "success"
                }
            )
            router.push(`/${locale}/`);
        } catch (error) {
            toaster.create(
                {
                    title: "Team creation error",
                    description: "Please try again later",
                    type: "error"
                }
            )
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleInviteCodeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setInviteCode(e.target.value);
        if (inviteError) setInviteError(null);
    };

    // Add new handler for individual character inputs
    const handleInviteCharChange = (index: number, value: string) => {
        // Only allow single characters (letters and numbers)
        if (value.length > 1) value = value.charAt(0);

        // Convert to uppercase
        value = value.toUpperCase();

        // Update the character at the specified index
        const newChars = [...inviteCodeChars];
        newChars[index] = value;
        setInviteCodeChars(newChars);

        // Update the full invite code
        setInviteCode(newChars.join(''));

        // Clear any previous errors
        if (inviteError) setInviteError(null);

        // Auto-focus next input if a character was entered
        if (value && index < 7) {
            const nextInput = document.getElementById(`invite-char-${index + 1}`);
            if (nextInput) nextInput.focus();
        }
    };

    // Handle backspace and arrow keys for better navigation
    const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Backspace') {
            if (inviteCodeChars[index]) {
                // If current field has content, clear it but stay in the same field
                const newChars = [...inviteCodeChars];
                newChars[index] = '';
                setInviteCodeChars(newChars);
                setInviteCode(newChars.join(''));
            } else if (index > 0) {
                // If current field is empty, move to previous field and clear it
                const newChars = [...inviteCodeChars];
                newChars[index - 1] = '';
                setInviteCodeChars(newChars);
                setInviteCode(newChars.join(''));

                const prevInput = document.getElementById(`invite-char-${index - 1}`);
                if (prevInput) prevInput.focus();
            }
        } else if (e.key === 'ArrowLeft' && index > 0) {
            // Move to previous input on left arrow
            const prevInput = document.getElementById(`invite-char-${index - 1}`);
            if (prevInput) prevInput.focus();
        } else if (e.key === 'ArrowRight' && index < 7) {
            // Move to next input on right arrow
            const nextInput = document.getElementById(`invite-char-${index + 1}`);
            if (nextInput) nextInput.focus();
        } else if (e.key === 'Delete') {
            // Clear current field on delete
            const newChars = [...inviteCodeChars];
            newChars[index] = '';
            setInviteCodeChars(newChars);
            setInviteCode(newChars.join(''));
        }
    };

    // Handle paste for the entire code
    const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
        e.preventDefault();
        const pastedData = e.clipboardData.getData('text').trim().toUpperCase();

        // Fill as many characters as we can from the pasted data
        const newChars = [...inviteCodeChars];
        for (let i = 0; i < Math.min(pastedData.length, 8); i++) {
            newChars[i] = pastedData[i];
        }

        setInviteCodeChars(newChars);
        setInviteCode(newChars.join(''));

        // Focus the next empty field or the last field
        for (let i = 0; i < 8; i++) {
            if (!newChars[i]) {
                const nextInput = document.getElementById(`invite-char-${i}`);
                if (nextInput) nextInput.focus();
                break;
            } else if (i === 7) {
                // If all filled, focus the last one
                const lastInput = document.getElementById(`invite-char-7`);
                if (lastInput) lastInput.focus();
            }
        }
    };

    const handleJoinTeam = async (e: React.FormEvent) => {
        e.preventDefault();

        // Use the combined invite code from the individual characters
        const fullInviteCode = inviteCodeChars.join('');

        if (!fullInviteCode.trim() || fullInviteCode.length < 8) {
            setInviteError(t("invite_code_required") || "Complete invite code is required");
            return;
        }

        setIsJoining(true);

        try {
            // 1. get team by invite code
            const team_response = await fetch(`/api/team/get_team?invite_code=${fullInviteCode}`);

            if (!team_response.ok) {
                throw new Error("Failed to fetch team");
            }
            const team = await team_response.json();
            const team_id = team.team.id;
            console.log("team_id", team_id);

            // 2. update user
            await axios.post("/api/user/update_user", {
                teamId: team_id,
                teamAction: "add"
            });

            // 3. update team
            await axios.post("/api/team/update_team", {
                teamId: team_id,
                userId: currentUser?.id,
                action: "add_member"
            });

            if (currentUser) {
                const updatedUser = {
                    ...currentUser,
                    teams: [...([]), team_id]
                };

                dispatch(setUser(updatedUser));
            }

            toaster.create({
                title: "Team joined",
                description: "You have successfully joined the team",
                type: "success"
            });

            router.push(`/${locale}/`);
        } catch (error: any) {
            setInviteError(
                error.response?.data?.message ||
                t("invalid_invite_code") ||
                "Invalid invite code"
            );

            toaster.create({
                title: "Error joining team",
                description: "Please check your invite code and try again",
                type: "error"
            });
        } finally {
            setIsJoining(false);
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
            <MotionBox
                p={8}
                borderWidth="1px"
                borderRadius="lg"
                bg={boxBg}
                borderColor={boxBorderColor}
                boxShadow={`0 4px 12px ${shadowColor}`}
                transition={{ duration: 0.3 }}
                variants={itemVariants}
            >
                {/* Tab Selection */}
                <Flex mb={6} borderBottom="1px solid" borderColor={separatorColor}>
                    <Box
                        flex="1"
                        textAlign="center"
                        pb={3}
                        cursor="pointer"
                        borderBottom={activeTab === 'create' ? `2px solid ${accentColor}` : 'none'}
                        color={activeTab === 'create' ? accentColor : secondaryTextColor}
                        fontWeight={activeTab === 'create' ? "bold" : "medium"}
                        onClick={() => setActiveTab('create')}
                    >
                        <Flex align="center" justify="center">
                            <Icon as={FaUserCircle} mr={2} color={activeTab === 'create' ? accentColor : secondaryTextColor} />
                            {t("create_team")}
                        </Flex>
                    </Box>
                    <Box
                        flex="1"
                        textAlign="center"
                        pb={3}
                        cursor="pointer"
                        borderBottom={activeTab === 'join' ? `2px solid green.500` : 'none'}
                        color={activeTab === 'join' ? "green.500" : secondaryTextColor}
                        fontWeight={activeTab === 'join' ? "bold" : "medium"}
                        onClick={() => setActiveTab('join')}
                    >
                        <Flex align="center" justify="center">
                            <Icon as={FaUserCircle} mr={2} color={activeTab === 'join' ? "green.500" : secondaryTextColor} />
                            {t("join_team") || "Join Team"}
                        </Flex>
                    </Box>
                </Flex>

                {/* Create Team Form */}
                {activeTab === 'create' && (
                    <VStack
                        align="stretch"
                        gap={6}
                    >
                        <Heading fontSize="2xl" fontWeight="bold" textAlign="center" color={textColorHeading}>
                            {t("create_new_team") || "Create a New Team"}
                        </Heading>

                        <form onSubmit={handleSubmit}>
                            <VStack align="stretch" gap={6}>
                                {/* Team Name */}
                                <Stack gap={2}>
                                    <Text fontWeight="medium" fontSize="md" color={labelColor}>
                                        {t("team_name")}
                                    </Text>
                                    <Input
                                        name="teamName"
                                        value={formData.teamName}
                                        onChange={handleChange}
                                        placeholder={t("team_name_placeholder") || "Enter team name"}
                                        aria-label="Enter your team name"
                                        _invalid={{ borderColor: "red.500" }}
                                        size="lg"
                                        height="50px"
                                    />
                                    {errors.teamName && (
                                        <Text color="red.500" fontSize="sm">
                                            {errors.teamName}
                                        </Text>
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
                                    {t("create_team")}
                                </Button>
                            </VStack>
                        </form>

                        <Text textAlign="center" fontSize="sm" color={secondaryTextColor} mt={2}>
                            {t("team_creation_description") || "Create a team to collaborate with others."}
                        </Text>
                    </VStack>
                )}

                {/* Join Team Form */}
                {activeTab === 'join' && (
                    <VStack
                        align="stretch"
                        gap={6}
                    >
                        <Heading fontSize="2xl" fontWeight="bold" textAlign="center" color={textColorHeading}>
                            {t("join_existing_team") || "Join an Existing Team"}
                        </Heading>

                        <form onSubmit={handleJoinTeam}>
                            <VStack align="stretch" gap={6}>
                                {/* Invite Code */}
                                <Stack gap={2}>
                                    <Text fontWeight="medium" fontSize="md" color={labelColor}>
                                        {t("invite_code") || "Invite Code"}
                                    </Text>
                                    <Flex justify="center" gap={2}>
                                        {Array.from({ length: 8 }).map((_, index) => (
                                            <Input
                                                key={index}
                                                id={`invite-char-${index}`}
                                                value={inviteCodeChars[index]}
                                                onChange={(e) => handleInviteCharChange(index, e.target.value)}
                                                onKeyDown={(e) => handleKeyDown(index, e)}
                                                onPaste={index === 0 ? handlePaste : undefined}
                                                maxLength={1}
                                                textAlign="center"
                                                width="40px"
                                                height="50px"
                                                fontSize="lg"
                                                fontWeight="bold"
                                                _invalid={{ borderColor: "red.500" }}
                                                autoComplete="off"
                                            />
                                        ))}
                                    </Flex>
                                    {inviteError && (
                                        <Text color="red.500" fontSize="sm" textAlign="center">
                                            {inviteError}
                                        </Text>
                                    )}
                                </Stack>

                                <Button
                                    mt={6}
                                    colorScheme="green"
                                    loading={isJoining}
                                    type="submit"
                                    width="full"
                                    size="lg"
                                    height="54px"
                                >
                                    {t("join_team") || "Join Team"}
                                </Button>
                            </VStack>
                        </form>

                        <Text textAlign="center" fontSize="sm" color={secondaryTextColor} mt={2}>
                            {t("team_join_description") || "Join an existing team using an invite code."}
                        </Text>
                    </VStack>
                )}
            </MotionBox>
        </MotionBox>
    );
}