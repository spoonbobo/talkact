import { Flex, Input, Box } from "@chakra-ui/react";
import { motion } from "framer-motion";
import { useTranslations } from "next-intl";
import React from "react";
import { useChatPageColors } from "@/utils/colors";

interface CreateRoomFormProps {
    newRoomName: string;
    setNewRoomName: (value: string) => void;
    handleCreateRoom: () => void;
    handleCancel: () => void;
    isCreatingRoomLoading: boolean;
}

export const CreateRoomForm = ({
    newRoomName,
    setNewRoomName,
    handleCreateRoom,
    handleCancel,
    isCreatingRoomLoading,
}: CreateRoomFormProps) => {
    const t = useTranslations("Chat");
    const colors = useChatPageColors();

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === "Enter") {
            e.preventDefault();
            handleCreateRoom();
        } else if (e.key === "Escape") {
            handleCancel();
        }
    };

    return (
        <motion.div
            key="create-room"
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            transition={{ duration: 0.3, ease: "easeInOut" }}
            style={{ width: "100%" }}
        >
            <Flex width="100%" align="center">
                <Input
                    placeholder={t("enter_room_name")}
                    value={newRoomName}
                    onChange={(e) => setNewRoomName(e.target.value)}
                    onKeyDown={handleKeyDown}
                    color={colors.formTextColor}
                    autoFocus
                    mr={2}
                    flex="1"
                    bg={colors.formInputBg}
                />
                <Box
                    as="button"
                    py={2}
                    px={4}
                    height="40px"
                    minWidth="80px"
                    borderRadius="md"
                    bg={colors.createButtonBg}
                    color="white"
                    fontWeight="medium"
                    fontSize="sm"
                    _hover={{ bg: colors.createButtonHoverBg }}
                    _active={{ bg: colors.createButtonActiveBg }}
                    _disabled={{ opacity: 0.5, cursor: "not-allowed" }}
                    onClick={handleCreateRoom}
                    // @ts-ignore
                    disabled={!newRoomName.trim() || isCreatingRoomLoading}
                >
                    {isCreatingRoomLoading ? t("creating") : t("create")}
                </Box>
                <Box
                    as="button"
                    py={2}
                    px={4}
                    ml={2}
                    height="40px"
                    minWidth="80px"
                    borderRadius="md"
                    bg={colors.formButtonBg}
                    color={colors.formTextColor}
                    fontWeight="medium"
                    fontSize="sm"
                    _hover={{ bg: colors.formButtonHoverBg }}
                    _active={{ bg: colors.formButtonActiveBg }}
                    onClick={handleCancel}
                    // @ts-ignore
                    disabled={isCreatingRoomLoading}
                >
                    {t("cancel")}
                </Box>
            </Flex>
        </motion.div>
    );
};