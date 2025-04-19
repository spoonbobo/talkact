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
import { useColorModeValue } from "@/components/ui/color-mode";
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

    // Add color mode values for text
    const textColorHeading = useColorModeValue("gray.800", "gray.100");
    const textColorStrong = useColorModeValue("gray.700", "gray.300");
    const textColor = useColorModeValue("gray.600", "gray.400");

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
            let activeUsers = currentUser ? [currentUser.user_id] : [];
            console.log("selectedAgents", selectedAgents);
            // Add agents if selected
            if (selectedAgents.length > 0) {
                try {
                    for (const agentType of selectedAgents) {
                        let agentId;
                        if (agentType === 'standard') {
                            agentId = '00000000-0000-0000-0000-000000000000'; // Agent user_id from seed
                        } else if (agentType === 'deepseek') {
                            agentId = '11111111-1111-1111-1111-111111111111'
                        }

                        if (agentId) {
                            activeUsers.push(agentId);

                            // Update agent's active_rooms
                            await axios.post("/api/user/update_user", {
                                roomId,
                                action: "add",
                                userId: agentId
                            });
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
            description: "Add a standard AI assistant to this room"
        },
        {
            value: "deepseek",
            title: "DeepSeek Agent",
            description: "Add a DeepSeek AI assistant to this room"
        },
    ];

    return (
        <Dialog.Root open={isOpen} onOpenChange={handleClose} initialFocusEl={() => roomNameInputRef.current}>
            <Portal>
                <Dialog.Backdrop />
                <Dialog.Positioner>
                    <Dialog.Content>
                        <Dialog.Header>
                            <Dialog.Title color={textColorHeading}>{t("create_new_room")}</Dialog.Title>
                            <Dialog.CloseTrigger />
                        </Dialog.Header>

                        <Dialog.Body>
                            <Stack gap={4}>
                                <Field.Root invalid={!!errors.roomName}>
                                    <Field.Label color={textColorStrong}>{t("room_name")}</Field.Label>
                                    <Input
                                        color={textColor}
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
                                    <Text textStyle="sm" fontWeight="medium" color={textColorStrong} mb={2}>
                                        Add AI Assistants
                                    </Text>
                                    <Flex gap="2" flexWrap="wrap">
                                        {agentOptions.map((item) => (
                                            <CheckboxCard.Root key={item.value} value={item.value}>
                                                <CheckboxCard.HiddenInput />
                                                <CheckboxCard.Control>
                                                    <CheckboxCard.Content>
                                                        <CheckboxCard.Label>{item.title}</CheckboxCard.Label>
                                                        <CheckboxCard.Description>
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
                                <Button variant="ghost" onClick={handleClose} color={textColor}>
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