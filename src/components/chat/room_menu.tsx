import { Icon, Menu, Portal } from "@chakra-ui/react";
import { FaEllipsisV } from "react-icons/fa";
import { useTranslations } from "next-intl";
import { useChatPageColors } from "@/utils/colors";

interface RoomMenuProps {
    onRoomDetails?: () => void;
    onExitRoom?: () => void;
}

export const RoomMenu = ({ onRoomDetails, onExitRoom }: RoomMenuProps) => {
    const t = useTranslations("Chat");
    const colors = useChatPageColors();

    return (
        <Menu.Root positioning={{ placement: "bottom-start" }}>
            <Menu.Trigger asChild>
                <Icon
                    as={FaEllipsisV}
                    ml={2}
                    cursor="pointer"
                    opacity={0.7}
                    _hover={{ opacity: 1 }}
                    boxSize={4}
                    color={colors.textColor}
                />
            </Menu.Trigger>
            <Portal>
                <Menu.Positioner>
                    <Menu.Content>
                        <Menu.Item
                            value="room-details"
                            onClick={onRoomDetails}
                        >
                            {t("room_details")}
                        </Menu.Item>
                        <Menu.Item
                            value="exit-group"
                            color="red.500"
                            onClick={onExitRoom}
                        >
                            {t("exit_room")}
                        </Menu.Item>
                    </Menu.Content>
                </Menu.Positioner>
            </Portal>
        </Menu.Root>
    );
}; 