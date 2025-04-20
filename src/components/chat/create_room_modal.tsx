"use client"

import { useState, useRef } from 'react';
import {
    Button,
    Dialog,
    Field,
    Input,
    Portal,
    Stack,
    CheckboxCard,
    CheckboxGroup,
    Flex,
    Text
} from '@chakra-ui/react';
import axios from 'axios';
import { toaster } from "@/components/ui/toaster"
import { useChatPageColors } from '@/utils/colors';
import { useTranslations } from "next-intl";
import { useDispatch, useSelector } from 'react-redux';
import { RootState } from '@/store/store';
import { setRooms, joinRoom } from '@/store/features/chatSlice';
import { updateActiveRooms } from '@/store/features/userSlice';

interface CreateRoomModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export function CreateRoomModal({ isOpen, onClose }: CreateRoomModalProps) {
    const [roomName, setRoomName] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [errors, setErrors] = useState<{ roomName?: string }>({});
    const [selectedAgents, setSelectedAgents] = useState<string[]>([]);
    const roomNameInputRef = useRef<HTMLInputElement>(null);
    const t = useTranslations("Chat");
    const dispatch = useDispatch();
    const currentUser = useSelector((state: RootState) => state.user.currentUser);

    // Use the color utility function instead of individual useColorModeValue calls
    const colors = useChatPageColors();

    const validateForm = () => {
        const newErrors: { roomName?: string } = {};

        if (!roomName.trim()) {
            newErrors.roomName = t("room_name_required");
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = async () => {
        if (!validateForm()) return;

        setIsLoading(true);

        try {
            const response = await axios.post("/api/chat/create_room", {
                name: roomName.trim(),
                active_users: [],
                unread: 0,
            });

            const roomId = response.data.room_id;

            // join the new room
            dispatch(joinRoom(roomId));

            // Add the room to the user's active_rooms
            await axios.post("/api/user/update_user", {
                roomId: roomId,
                action: "add"
            });

            // Update the Redux state to match the database
            dispatch(updateActiveRooms({ roomId, action: "add" }));

            // Initialize active users with current user
            let activeUsers = currentUser ? [currentUser.id] : [];
            console.log("selectedAgents", selectedAgents);

            // Add agents if selected
            if (selectedAgents.length > 0) {
                try {
                    for (const agentType of selectedAgents) {
                        let agentUsername;

                        if (agentType === 'standard') {
                            agentUsername = 'agent';
                        } else if (agentType === 'deepseek') {
                            agentUsername = 'deepseek';
                        }

                        if (agentUsername) {
                            // Get the agent user by username
                            const response = await axios.get(`/api/user/get_user_by_username?username=${agentUsername}`);
                            const user = response.data.user;
                            console.log("user", user);

                            if (user) {
                                activeUsers.push(user.id);
                                console.log("user", user);
                                await axios.post("/api/user/update_user", {
                                    roomId,
                                    action: "add",
                                    username: agentUsername
                                });
                            }
                        }
                    }
                } catch (error) {
                    console.error("Error adding agents to room:", error);
                }
            }

            // Update the room with all active users
            await axios.put("/api/chat/update_room", {
                roomId: roomId,
                active_users: activeUsers
            });

            const roomsResponse = await axios.get("/api/chat/get_rooms");
            dispatch(setRooms(roomsResponse.data));

            toaster.create({
                title: t("room_created"),
                description: t("room_created_description"),
                type: "success"
            });

            handleClose();
        } catch (error) {
            toaster.create({
                title: t("error"),
                description: t("error_creating_room"),
                type: "error"
            });
        } finally {
            setIsLoading(false);
        }
    };

    const handleClose = () => {
        setRoomName('');
        setErrors({});
        setSelectedAgents([]);
        onClose();
    };

    const agentOptions = [
        {
            value: "standard",
            title: "Standard Agent",
            description: t("add_standard_ai_assistant")
        },
        {
            value: "deepseek",
            title: "DeepSeek Agent",
            description: t("add_deepseek_ai_assistant")
        },
    ];

    return (
        <Dialog.Root open={isOpen} onOpenChange={handleClose} initialFocusEl={() => roomNameInputRef.current}>
            <Portal>
                <Dialog.Backdrop />
                <Dialog.Positioner>
                    <Dialog.Content>
                        <Dialog.Header>
                            <Dialog.Title color={colors.textColorHeading}>{t("create_new_room")}</Dialog.Title>
                            <Dialog.CloseTrigger />
                        </Dialog.Header>

                        <Dialog.Body>
                            <Stack gap={4}>
                                <Field.Root invalid={!!errors.roomName}>
                                    <Field.Label color={colors.textColorHeading}>{t("room_name")}</Field.Label>
                                    <Input
                                        color={colors.textColor}
                                        ref={roomNameInputRef}
                                        type="text"
                                        value={roomName}
                                        onChange={(e) => setRoomName(e.target.value)}
                                        placeholder={t("enter_room_name")}
                                        required
                                        _placeholder={{ color: 'gray.400' }}
                                    />
                                    {errors.roomName && <Field.ErrorText>{errors.roomName}</Field.ErrorText>}
                                </Field.Root>

                                <CheckboxGroup
                                    onChange={(event) => {
                                        // event.currentTarget is the CheckboxGroup container
                                        const checked = Array.from(
                                            (event.currentTarget as HTMLElement).querySelectorAll('input[type="checkbox"]:checked')
                                        ).map((input) => (input as HTMLInputElement).value);

                                        setSelectedAgents(checked as string[]);
                                    }}
                                >
                                    <Text textStyle="sm" fontWeight="medium" color={colors.textColorHeading} mb={2}>
                                        {t("add_ai_assistants")}
                                    </Text>
                                    <Flex gap="2" flexWrap="wrap">
                                        {agentOptions.map((item) => (
                                            <CheckboxCard.Root key={item.value} value={item.value}>
                                                <CheckboxCard.HiddenInput />
                                                <CheckboxCard.Control>
                                                    <CheckboxCard.Content>
                                                        <CheckboxCard.Label color={colors.textColorHeading}>{item.title}</CheckboxCard.Label>
                                                        <CheckboxCard.Description color={colors.textColor}>
                                                            {item.description}
                                                        </CheckboxCard.Description>
                                                    </CheckboxCard.Content>
                                                    <CheckboxCard.Indicator />
                                                </CheckboxCard.Control>
                                            </CheckboxCard.Root>
                                        ))}
                                    </Flex>
                                </CheckboxGroup>
                            </Stack>
                        </Dialog.Body>

                        <Dialog.Footer>
                            <Dialog.ActionTrigger asChild>
                                <Button variant="ghost" onClick={handleClose} color={colors.textColor}>
                                    {t("cancel")}
                                </Button>
                            </Dialog.ActionTrigger>
                            <Button
                                colorScheme="blue"
                                onClick={handleSubmit}
                                loading={isLoading}
                            >
                                {t("create_room")}
                            </Button>
                        </Dialog.Footer>
                    </Dialog.Content>
                </Dialog.Positioner>
            </Portal>
        </Dialog.Root>
    );
} 