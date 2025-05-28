"use client"

import { useState, useRef } from 'react';
import {
    Button,
    Dialog,
    Field,
    Input,
    Portal,
    Stack,
    Select,
    createListCollection,
    Box,
} from '@chakra-ui/react';
import { v4 as uuidv4 } from 'uuid';
import { toaster } from "@/components/ui/toaster"
import { useColorModeValue } from "@/components/ui/color-mode";
import { useTranslations } from "next-intl";

interface CreateUserModalProps {
    isOpen: boolean;
    onClose: () => void;
    onUserCreated?: () => void;
}

export function CreateUserModal({ isOpen, onClose, onUserCreated }: CreateUserModalProps) {
    const [email, setEmail] = useState('');
    const [username, setUsername] = useState('');
    const [role, setRole] = useState('user');
    const [avatar, setAvatar] = useState('https://play-lh.googleusercontent.com/d2zqBFBEymSZKaVg_dRo1gh3hBFn7_Kl9rO74xkDmnJeLgDW0MoJD3cUx0QzZN6jdsg=w240-h480-rw');
    const [isLoading, setIsLoading] = useState(false);
    const [errors, setErrors] = useState<{ email?: string; username?: string }>({});
    const emailInputRef = useRef<HTMLInputElement>(null);
    const t = useTranslations("AdminPanel");
    // Add color mode values for text similar to tasks page
    const textColorHeading = useColorModeValue("gray.800", "gray.100");
    const textColorStrong = useColorModeValue("gray.700", "gray.300");
    const textColor = useColorModeValue("gray.600", "gray.400");

    const validateForm = () => {
        const newErrors: { email?: string; username?: string } = {};

        if (!email) {
            newErrors.email = 'Email is required';
        } else if (!/\S+@\S+\.\S+/.test(email)) {
            newErrors.email = 'Email is invalid';
        }

        if (username && username.length < 3) {
            newErrors.username = 'Username must be at least 3 characters';
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = async () => {
        if (!validateForm()) return;

        setIsLoading(true);

        try {
            const userData = {
                id: uuidv4(),
                email,
                username: username || email.split('@')[0],
                role,
                avatar: avatar,
            };

            const response = await fetch('/api/user/create_user', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(userData),
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.message || 'Failed to create user');
            }

            toaster.create({
                title: 'User created',
                description: `User ${data.user.username} has been created successfully`,
                duration: 5000,
            });

            onClose();
            if (onUserCreated) onUserCreated();
        } catch (error) {
            toaster.create({
                title: 'Error',
                description: error instanceof Error ? error.message : 'Failed to create user',
                duration: 5000,
            });
        } finally {
            setIsLoading(false);
        }
    };

    const handleClose = () => {
        setEmail('');
        setUsername('');
        setAvatar('');
        setErrors({});
        onClose();
    };

    return (
        <Dialog.Root open={isOpen} onOpenChange={handleClose} initialFocusEl={() => emailInputRef.current}>
            <Portal>
                <Dialog.Backdrop />
                <Dialog.Positioner>
                    <Dialog.Content>
                        <Dialog.Header>
                            <Dialog.Title color={textColorHeading}>{t("create_new_user")}</Dialog.Title>
                            <Dialog.CloseTrigger />
                        </Dialog.Header>

                        <Dialog.Body>
                            <Stack gap={4}>
                                <Field.Root invalid={!!errors.email}>
                                    <Field.Label color={textColorStrong}>Email</Field.Label>
                                    <Input
                                        color={textColor}
                                        ref={emailInputRef}
                                        type="email"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        placeholder="user@example.com"
                                        required
                                        _placeholder={{ color: 'gray.400' }}
                                    />
                                    {errors.email && <Field.ErrorText>{errors.email}</Field.ErrorText>}
                                </Field.Root>

                                <Field.Root invalid={!!errors.username}>
                                    <Field.Label color={textColorStrong}>Username (optional)</Field.Label>
                                    <Input
                                        color={textColor}
                                        type="text"
                                        value={username}
                                        onChange={(e) => setUsername(e.target.value)}
                                        placeholder={t("leave_blank_to_use_email_prefix")}
                                        _placeholder={{ color: 'gray.400' }}
                                    />
                                    {errors.username && <Field.ErrorText>{errors.username}</Field.ErrorText>}
                                </Field.Root>

                                <Field.Root>
                                    <Field.Label color={textColorStrong}>Avatar URL</Field.Label>
                                    <Input
                                        color={textColor}
                                        type="text"
                                        value={avatar}
                                        onChange={(e) => setAvatar(e.target.value)}
                                        _placeholder={{ color: 'gray.400' }}
                                        required
                                    />
                                </Field.Root>

                                <Field.Root>
                                    <Field.Label color={textColorStrong}>{t("role")}</Field.Label>
                                    <Box position="relative" width="100%">
                                        <select
                                            value={role}
                                            onChange={(e) => setRole(e.target.value)}
                                            style={{
                                                width: '100%',
                                                padding: '0.5rem 1rem',
                                                borderRadius: '0.375rem',
                                                borderWidth: '1px',
                                                borderColor: 'inherit',
                                                backgroundColor: 'transparent',
                                                color: 'inherit',
                                                appearance: 'none',
                                                minHeight: '2.5rem'
                                            }}
                                        >
                                            <option value="member">Member</option>
                                            <option value="owner">Owner</option>
                                            <option value="agent">Agent</option>
                                        </select>
                                        <Box
                                            position="absolute"
                                            right="10px"
                                            top="50%"
                                            transform="translateY(-50%)"
                                            pointerEvents="none"
                                        >
                                            ▼
                                        </Box>
                                    </Box>
                                </Field.Root>
                            </Stack>
                        </Dialog.Body>

                        <Dialog.Footer>
                            <Dialog.ActionTrigger asChild>
                                <Button variant="ghost" onClick={handleClose} color={textColor}>
                                    {t("cancel")}
                                </Button>
                            </Dialog.ActionTrigger>
                            <Button
                                colorScheme="blue"
                                onClick={handleSubmit}
                                loading={isLoading}
                            >
                                {t("create_user")}
                            </Button>
                        </Dialog.Footer>
                    </Dialog.Content>
                </Dialog.Positioner>
            </Portal>
        </Dialog.Root>
    );
} 