import { Flex, Input, Box } from "@chakra-ui/react";
import { motion } from "framer-motion";
import { useColorModeValue } from "@/components/ui/color-mode";
import { useTranslations } from "next-intl";
import React from "react";

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

    const textColor = useColorModeValue("gray.600", "gray.400");
    const buttonBg = useColorModeValue("gray.200", "gray.700");
    const buttonHoverBg = useColorModeValue("gray.300", "gray.600");
    const buttonActiveBg = useColorModeValue("gray.400", "gray.500");
    const inputBg = useColorModeValue("white", "gray.700");

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
                    color={textColor}
                    autoFocus
                    mr={2}
                    flex="1"
                    bg={inputBg}
                />
                <Box
                    as="button"
                    py={2}
                    px={4}
                    height="40px"
                    minWidth="80px"
                    borderRadius="md"
                    bg="blue.500"
                    color="white"
                    fontWeight="medium"
                    fontSize="sm"
                    _hover={{ bg: "blue.600" }}
                    _active={{ bg: "blue.700" }}
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
                    bg={buttonBg}
                    color={textColor}
                    fontWeight="medium"
                    fontSize="sm"
                    _hover={{ bg: buttonHoverBg }}
                    _active={{ bg: buttonActiveBg }}
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