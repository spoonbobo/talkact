import React from "react";
import {
    Box,
    Heading,
    Text,
    Flex,
    Icon,
    Separator,
    Badge,
    Avatar
} from "@chakra-ui/react";
import { FaUsers } from "react-icons/fa";

interface User {
    id: string;
    username: string;
    email: string;
    avatar?: string;
    role: string;
    created_at: string;
    updated_at: string;
}

interface ColorProps {
    textColorMuted: string;
    textColorHeading: string;
    textColorStrong: string;
}

interface UserDetailsProps {
    selectedUser: User | null;
    formatDate: (date: string | undefined) => string;
    formatUserId: (userId: string) => string;
    t: (key: string) => string;
    colors: ColorProps;
}

const UserDetails: React.FC<UserDetailsProps> = ({
    selectedUser,
    formatDate,
    formatUserId,
    t,
    colors
}) => {
    if (!selectedUser) {
        return (
            <Flex justify="center" align="center" height="100%" direction="column" gap={4}>
                <Icon as={FaUsers} fontSize="4xl" color="gray.400" />
                <Text color={colors.textColorMuted}>{t("select_user_to_view_details")}</Text>
            </Flex>
        );
    }

    return (
        <Flex direction="column" gap={4}>
            <Flex align="center" gap={4}>
                <Avatar.Root size="lg">
                    <Avatar.Fallback name={selectedUser.username || selectedUser.email} />
                    {selectedUser.avatar && <Avatar.Image src={selectedUser.avatar} />}
                </Avatar.Root>
                <Box>
                    <Heading size="md" color={colors.textColorHeading}>{selectedUser.username}</Heading>
                    <Text color={colors.textColorMuted}>{selectedUser.email}</Text>
                    <Badge colorScheme={selectedUser.role === 'admin' ? 'red' : 'blue'} mt={1}>
                        {selectedUser.role || 'User'}
                    </Badge>
                </Box>
            </Flex>

            <Separator my={2} />

            <Flex wrap="wrap" gap={6}>
                <Box>
                    <Text fontSize="xs" color={colors.textColorMuted}>
                        {t("id")}
                    </Text>
                    <Text fontSize="sm" fontWeight="medium" color={colors.textColorStrong}>
                        {formatUserId(selectedUser.id)}
                    </Text>
                </Box>

                <Box>
                    <Text fontSize="xs" color={colors.textColorMuted}>
                        {t("created_at")}
                    </Text>
                    <Text fontSize="sm" color={colors.textColorStrong}>
                        {formatDate(selectedUser.created_at)}
                    </Text>
                </Box>

                <Box>
                    <Text fontSize="xs" color={colors.textColorMuted}>
                        {t("updated_at")}
                    </Text>
                    <Text fontSize="sm" color={colors.textColorStrong}>
                        {formatDate(selectedUser.updated_at)}
                    </Text>
                </Box>
            </Flex>
        </Flex>
    );
};

export default UserDetails; 