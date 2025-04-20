import React from "react";
import {
    Box,
    Text,
    VStack,
    Flex,
    Separator,
    Badge
} from "@chakra-ui/react";

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
    textColorStrong: string;
    cardBg: string;
    borderColor: string;
}

interface UserPermissionsProps {
    selectedUser: User | null;
    t: (key: string) => string;
    colors: ColorProps;
}

const UserPermissions: React.FC<UserPermissionsProps> = ({
    selectedUser,
    t,
    colors
}) => {
    if (!selectedUser) {
        return (
            <Text color={colors.textColorMuted}>{t("select_user_to_view_permissions")}</Text>
        );
    }

    return (
        <VStack align="stretch" gap={4}>
            <Text fontSize="sm" fontWeight="medium" color={colors.textColorStrong}>
                {t("user_permissions")}
            </Text>
            <Box
                p={4}
                bg={colors.cardBg}
                borderRadius="md"
                borderWidth="1px"
                borderColor={colors.borderColor}
            >
                <Flex direction="column" gap={3}>
                    <Flex justify="space-between" align="center">
                        <Text fontSize="sm" color={colors.textColorStrong}>{t("can_manage_tasks")}</Text>
                        <Badge colorScheme="green">{t("enabled")}</Badge>
                    </Flex>
                </Flex>
            </Box>
        </VStack>
    );
};

export default UserPermissions; 