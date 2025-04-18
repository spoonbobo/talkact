"use client";

import { useState } from "react";
import {
    Dialog,
    Portal,
    CloseButton,
    Button,
    Text,
    Box,
    Spinner,
    Flex,
} from "@chakra-ui/react";
import { useTranslations } from "next-intl";
import { IMessage } from "@/types/chat";
import { useChatPageColors } from "@/utils/colors";
import { useDispatch, useSelector } from "react-redux";
import { updateMessage, deleteMessage } from "@/store/features/chatSlice";
import { RootState } from "@/store/store";
import { toaster } from "@/components/ui/toaster";

interface DeleteMessageModalProps {
    isOpen: boolean;
    onClose: () => void;
    message: IMessage | null;
    onDeleteSuccess: () => void;
}

export const DeleteMessageModal = ({
    isOpen,
    onClose,
    message,
    onDeleteSuccess
}: DeleteMessageModalProps) => {
    const t = useTranslations("Chat");
    const colors = useChatPageColors();
    const dispatch = useDispatch();
    const [isDeleting, setIsDeleting] = useState(false);
    const selectedRoomId = useSelector((state: RootState) => state.chat.selectedRoomId);

    const handleDelete = async () => {
        if (!message || !selectedRoomId) return;

        setIsDeleting(true);

        try {
            dispatch(deleteMessage({
                roomId: selectedRoomId,
                messageId: message.id
            }));

            toaster.create({
                title: t("message_deleted") || "Message deleted",
                description: t("message_deleted_description") || "Message deleted successfully",
                type: "info",
            });

            onDeleteSuccess();
            onClose();
        } catch (error) {
            console.error("Error deleting message:", error);
            toaster.error({
                title: t("delete_failed") || "Delete failed",
                description: error instanceof Error ? error.message : t("unknown_error") || "Unknown error",
            });
        } finally {
            setIsDeleting(false);
        }
    };

    return (
        <Dialog.Root
            open={isOpen}
            onOpenChange={(e) => {
                if (!e.open) {
                    onClose();
                }
            }}
        >
            <Portal>
                <Dialog.Backdrop />
                <Dialog.Positioner>
                    <Dialog.Content maxWidth="400px" bg={colors.bgSubtle} borderColor={colors.borderColor}>
                        <Dialog.Header borderBottomColor={colors.borderColor}>
                            <Dialog.Title color={colors.textColorHeading}>
                                {t("delete_message") || "Delete Message"}
                            </Dialog.Title>
                            <Dialog.CloseTrigger asChild>
                                <CloseButton size="sm" color={colors.textColor} />
                            </Dialog.CloseTrigger>
                        </Dialog.Header>

                        <Dialog.Body>
                            <Text color={colors.textColor}>
                                {t("delete_message_confirmation") ||
                                    "Are you sure you want to delete this message? This action cannot be undone."}
                            </Text>

                            {message && (
                                <Box
                                    mt={4}
                                    p={3}
                                    borderRadius="md"
                                    bg={colors.bgSubtle}
                                    fontSize="sm"
                                    color={colors.textColorSecondary}
                                    fontStyle="italic"
                                    lineClamp={3}
                                >
                                    <Text>{message.content}</Text>
                                </Box>
                            )}
                        </Dialog.Body>

                        <Dialog.Footer borderTopColor={colors.borderColor}>
                            <Button
                                variant="ghost"
                                mr={3}
                                onClick={onClose}
                                color={colors.textColor}
                                disabled={isDeleting}
                            >
                                {t("cancel") || "Cancel"}
                            </Button>
                            <Button
                                colorScheme="red"
                                onClick={handleDelete}
                                disabled={isDeleting}
                            >
                                {isDeleting ? (
                                    <Flex align="center" gap={2}>
                                        <Spinner size="sm" />
                                        <Text>{t("deleting") || "Deleting..."}</Text>
                                    </Flex>
                                ) : (
                                    t("delete") || "Delete"
                                )}
                            </Button>
                        </Dialog.Footer>
                    </Dialog.Content>
                </Dialog.Positioner>
            </Portal>
        </Dialog.Root>
    );
}; 