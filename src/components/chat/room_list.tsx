"use client";

import {
    Box,
    Text,
    Flex,
    Icon,
    VStack,
    Badge,
    AvatarGroup,
    Avatar,
} from "@chakra-ui/react";
import { FaPlus } from "react-icons/fa";
import { IChatRoom } from "@/types/chat";
import { useColorModeValue } from "@/components/ui/color-mode";
import { useTranslations } from "next-intl";

interface ChatRoomListProps {
    rooms: IChatRoom[];
    selectedRoomId: string | null;
    unreadCounts: Record<string, number>;
    onSelectRoom: (roomId: string) => void;
    onCreateRoomClick: () => void;
    isCreatingRoomLoading: boolean;
}

export const ChatRoomList = ({
    rooms,
    selectedRoomId,
    unreadCounts,
    onSelectRoom,
    onCreateRoomClick,
    isCreatingRoomLoading,
}: ChatRoomListProps) => {
    const t = useTranslations("Chat");

    // Dark mode adaptive colors
    const bgSubtle = useColorModeValue("bg.subtle", "gray.800");
    const textColor = useColorModeValue("gray.600", "gray.400");
    const textColorHeading = useColorModeValue("gray.800", "gray.100");
    const borderColor = useColorModeValue("gray.200", "gray.700");
    const selectedRoomBg = useColorModeValue("blue.50", "blue.900");
    const selectedRoomBorder = useColorModeValue("blue.300", "blue.600");
    const roomHoverBg = useColorModeValue("gray.50", "gray.700");
    const buttonHoverBg = useColorModeValue("gray.300", "gray.600");
    const buttonActiveBg = useColorModeValue("gray.400", "gray.500");

    const sortedRooms = [...rooms].sort((a, b) => {
        return (
            new Date(b.last_updated).getTime() - new Date(a.last_updated).getTime()
        );
    });

    return (
        <Box
            width="280px"
            height="100%"
            overflow="auto"
            pr={3}
        >
            <Flex justifyContent="space-between" alignItems="center" mb={4}>
                <Text fontSize="xl" fontWeight="bold" textAlign="left" color={textColorHeading}>
                    {t("rooms")}
                </Text>
                <Box
                    as="button"
                    py={2}
                    px={3}
                    borderRadius="md"
                    bg={bgSubtle}
                    color={textColor}
                    fontWeight="medium"
                    fontSize="sm"
                    _hover={{ bg: buttonHoverBg }}
                    _active={{ bg: buttonActiveBg }}
                    _disabled={{ opacity: 0.5, cursor: "not-allowed" }}
                    onClick={onCreateRoomClick}
                    // @ts-ignore
                    disabled={isCreatingRoomLoading}
                >
                    <Flex align="center" justify="center">
                        <Icon as={FaPlus} mr={2} />
                        {t("new_room")}
                    </Flex>
                </Box>
            </Flex>

            <VStack align="stretch">
                {sortedRooms.map((room: IChatRoom) => (
                    <Flex
                        key={room.id}
                        p={3}
                        borderRadius="lg"
                        bg={selectedRoomId === room.id ? selectedRoomBg : bgSubtle}
                        borderWidth="1px"
                        borderColor={
                            selectedRoomId === room.id ? selectedRoomBorder : borderColor
                        }
                        _hover={{
                            bg: selectedRoomId === room.id ? selectedRoomBg : roomHoverBg,
                        }}
                        cursor="pointer"
                        onClick={() => onSelectRoom(room.id)}
                        align="center"
                        transition="all 0.2s"
                    >
                        <Box flex="1">
                            <Flex justify="space-between" align="center" mb={1}>
                                <Text fontWeight="medium" fontSize="md" color={textColorHeading}>
                                    {room.name}
                                </Text>
                                <AvatarGroup gap="0" size="xs">
                                    {room.active_users.slice(0, 3).map((user, idx) => (
                                        <Avatar.Root key={idx}>
                                            <Avatar.Fallback name={user.username} />
                                            <Avatar.Image src={user.avatar} />
                                        </Avatar.Root>
                                    ))}
                                    {room.active_users.length > 3 && (
                                        <Avatar.Root variant="solid">
                                            <Avatar.Fallback>
                                                +{room.active_users.length - 3}
                                            </Avatar.Fallback>
                                        </Avatar.Root>
                                    )}
                                </AvatarGroup>
                            </Flex>

                            <Flex justify="space-between" align="center">
                                <Text fontSize="sm" color={textColor} maxW="160px">
                                    {new Date(room.last_updated).toLocaleString(undefined, {
                                        month: "short",
                                        day: "numeric",
                                        hour: "2-digit",
                                        minute: "2-digit",
                                    })}
                                </Text>
                                {unreadCounts[room.id] > 0 && (
                                    <Badge
                                        borderRadius="full"
                                        colorScheme="blue"
                                        fontSize="xs"
                                        px={2}
                                    >
                                        {unreadCounts[room.id]}
                                    </Badge>
                                )}
                            </Flex>
                        </Box>
                    </Flex>
                ))}
            </VStack>
        </Box>
    );
};