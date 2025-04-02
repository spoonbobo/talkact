import React from "react";
import {
    Box,
    Text,
    Flex,
    Input,
    Spinner,
    Table,
    Portal,
    Select,
    Badge,
    createListCollection
} from "@chakra-ui/react";

interface User {
    id: string;
    user_id: string;
    username: string;
    email: string;
    avatar?: string;
    role: string;
    created_at: string;
    updated_at: string;
}

interface PaginationState {
    total: number;
    limit: number;
    offset: number;
}

interface ColorProps {
    textColor: string;
    textColorHeading: string;
    textColorStrong: string;
    inputBgColor: string;
    borderColor: string;
    inputBorderHoverColor: string;
    tableHeaderBg: string;
    errorBg: string;
    errorText: string;
    emptyBg: string;
    hoverBg: string;
    paginationBg: string;
    paginationDisabledBg: string;
    paginationColor: string;
    paginationDisabledColor: string;
    refreshButtonHoverBg: string;
}

interface UserTableProps {
    users: User[];
    loading: boolean;
    error: string | null;
    search: string;
    setSearch: (search: string) => void;
    pagination: PaginationState;
    setPagination: (pagination: PaginationState) => void;
    selectedUser: User | null;
    onUserSelect: (user: User) => void;
    formatDate: (date: string | undefined) => string;
    formatUserId: (userId: string) => string;
    t: (key: string) => string;
    colors: ColorProps;
}

const UserTable: React.FC<UserTableProps> = ({
    users,
    loading,
    error,
    search,
    setSearch,
    pagination,
    setPagination,
    selectedUser,
    onUserSelect,
    formatDate,
    formatUserId,
    t,
    colors
}) => {
    // Pagination helpers
    const totalPages = Math.ceil(pagination.total / pagination.limit);
    const currentPage = Math.floor(pagination.offset / pagination.limit) + 1;

    const handlePageChange = (newPage: number) => {
        if (newPage < 1 || newPage > totalPages) return;

        setPagination({
            ...pagination,
            offset: (newPage - 1) * pagination.limit
        });
    };

    return (
        <>
            <Flex
                justifyContent="space-between"
                alignItems="center"
                mb={4}
                flexDirection={{ base: "column", md: "row" }}
                gap={2}
            >
                <Text fontSize="md" fontWeight="bold" textAlign="left" color={colors.textColorHeading}>
                    {t("user_list")}
                </Text>
                <Input
                    color={colors.textColor}
                    placeholder={t("search_users")}
                    maxW="300px"
                    bg={colors.inputBgColor}
                    borderColor={colors.borderColor}
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    _hover={{ borderColor: colors.inputBorderHoverColor }}
                    _focus={{ borderColor: "blue.500", boxShadow: "0 0 0 1px var(--chakra-colors-blue-500)" }}
                    size="sm"
                />
            </Flex>

            {loading ? (
                <Flex justify="center" align="center" height="200px">
                    <Spinner size="lg" color="blue.500" />
                </Flex>
            ) : error ? (
                <Box p={5} textAlign="center" bg={colors.errorBg} borderRadius="md">
                    <Text color={colors.errorText}>{error}</Text>
                </Box>
            ) : users.length === 0 ? (
                <Box p={5} textAlign="center" bg={colors.emptyBg} borderRadius="md">
                    <Text color={colors.textColor}>{t("no_users_found")}</Text>
                </Box>
            ) : (
                <>
                    <Box overflowX="auto" width="100%">
                        <Table.Root variant="outline" size="md" colorScheme="gray">
                            <Table.Header
                                bg={colors.tableHeaderBg}
                                position="sticky"
                                top={0}
                                zIndex={1}
                            >
                                <Table.Row>
                                    <Table.ColumnHeader
                                        fontWeight="semibold"
                                        width="20%"
                                        color={colors.textColorHeading}
                                    >
                                        {t("username")}
                                    </Table.ColumnHeader>
                                    <Table.ColumnHeader
                                        fontWeight="semibold"
                                        width="30%"
                                        color={colors.textColorHeading}
                                    >
                                        {t("email")}
                                    </Table.ColumnHeader>
                                    <Table.ColumnHeader
                                        fontWeight="semibold"
                                        width="15%"
                                        color={colors.textColorHeading}
                                        display={{ base: "none", md: "table-cell" }}
                                    >
                                        {t("user_id")}
                                    </Table.ColumnHeader>
                                    <Table.ColumnHeader
                                        fontWeight="semibold"
                                        width="20%"
                                        color={colors.textColorHeading}
                                        display={{ base: "none", md: "table-cell" }}
                                    >
                                        {t("created_at")}
                                    </Table.ColumnHeader>
                                    <Table.ColumnHeader
                                        fontWeight="semibold"
                                        width="10%"
                                        color={colors.textColorHeading}
                                        textAlign="center"
                                    >
                                        {t("role")}
                                    </Table.ColumnHeader>
                                </Table.Row>
                            </Table.Header>
                            <Table.Body>
                                {users.map((user) => (
                                    <Table.Row
                                        key={user.id}
                                        cursor="pointer"
                                        _hover={{ bg: colors.hoverBg }}
                                        onClick={() => onUserSelect(user)}
                                        bg={selectedUser && selectedUser.id === user.id ? colors.hoverBg : undefined}
                                    >
                                        <Table.Cell fontSize={{ base: "xs", md: "sm" }} color={colors.textColorStrong}>
                                            <Flex align="center" gap={2}>
                                                {user.username}
                                            </Flex>
                                        </Table.Cell>
                                        <Table.Cell fontSize={{ base: "xs", md: "sm" }} color={colors.textColorStrong}>
                                            {user.email}
                                        </Table.Cell>
                                        <Table.Cell
                                            fontSize={{ base: "xs", md: "sm" }}
                                            color={colors.textColorStrong}
                                            display={{ base: "none", md: "table-cell" }}
                                        >
                                            {formatUserId(user.user_id)}
                                        </Table.Cell>
                                        <Table.Cell
                                            fontSize={{ base: "xs", md: "sm" }}
                                            color={colors.textColorStrong}
                                            display={{ base: "none", md: "table-cell" }}
                                        >
                                            {formatDate(user.created_at)}
                                        </Table.Cell>
                                        <Table.Cell fontSize={{ base: "xs", md: "sm" }} textAlign="center">
                                            <Badge colorScheme={user.role === 'admin' ? 'red' : 'blue'}>
                                                {user.role || "User"}
                                            </Badge>
                                        </Table.Cell>
                                    </Table.Row>
                                ))}
                            </Table.Body>
                        </Table.Root>
                    </Box>

                    <Flex
                        justifyContent="space-between"
                        alignItems="center"
                        mt={4}
                        flexDirection={{ base: "column", md: "row" }}
                        gap={3}
                    >
                        <Flex flex="1" justifyContent="flex-start" alignItems="center">
                            <Flex gap={1} alignItems="center">
                                <Box
                                    as="button"
                                    px={2}
                                    py={1}
                                    borderRadius="md"
                                    bg={currentPage === 1 ? colors.paginationDisabledBg : colors.paginationBg}
                                    color={currentPage === 1 ? colors.paginationDisabledColor : colors.paginationColor}
                                    _hover={{
                                        bg: currentPage === 1 ? colors.paginationDisabledBg : colors.refreshButtonHoverBg,
                                    }}
                                    onClick={() => handlePageChange(1)}
                                    aria-disabled={currentPage === 1}
                                    pointerEvents={currentPage === 1 ? "none" : "auto"}
                                >
                                    «
                                </Box>
                                <Box
                                    as="button"
                                    px={2}
                                    py={1}
                                    borderRadius="md"
                                    bg={currentPage === 1 ? colors.paginationDisabledBg : colors.paginationBg}
                                    color={currentPage === 1 ? colors.paginationDisabledColor : colors.paginationColor}
                                    _hover={{
                                        bg: currentPage === 1 ? colors.paginationDisabledBg : colors.refreshButtonHoverBg,
                                    }}
                                    onClick={() => handlePageChange(currentPage - 1)}
                                    aria-disabled={currentPage === 1}
                                    pointerEvents={currentPage === 1 ? "none" : "auto"}
                                >
                                    ‹
                                </Box>
                            </Flex>
                        </Flex>

                        <Flex flex="1" justifyContent="center" alignItems="center">
                            <Text fontSize="sm" color={colors.textColor}>
                                {t("page")} {currentPage} {t("of")} {totalPages || 1}
                            </Text>
                        </Flex>

                        <Flex flex="1" justifyContent="flex-end" alignItems="center">
                            <Flex gap={1} alignItems="center">
                                <Box
                                    as="button"
                                    px={2}
                                    py={1}
                                    borderRadius="md"
                                    bg={
                                        currentPage === totalPages || totalPages === 0
                                            ? colors.paginationDisabledBg
                                            : colors.paginationBg
                                    }
                                    color={
                                        currentPage === totalPages || totalPages === 0
                                            ? colors.paginationDisabledColor
                                            : colors.paginationColor
                                    }
                                    _hover={{
                                        bg:
                                            currentPage === totalPages || totalPages === 0
                                                ? colors.paginationDisabledBg
                                                : colors.refreshButtonHoverBg,
                                    }}
                                    onClick={() => handlePageChange(currentPage + 1)}
                                    aria-disabled={
                                        currentPage === totalPages || totalPages === 0
                                    }
                                    pointerEvents={
                                        currentPage === totalPages || totalPages === 0
                                            ? "none"
                                            : "auto"
                                    }
                                >
                                    ›
                                </Box>
                                <Box
                                    as="button"
                                    px={2}
                                    py={1}
                                    borderRadius="md"
                                    bg={
                                        currentPage === totalPages || totalPages === 0
                                            ? colors.paginationDisabledBg
                                            : colors.paginationBg
                                    }
                                    color={
                                        currentPage === totalPages || totalPages === 0
                                            ? colors.paginationDisabledColor
                                            : colors.paginationColor
                                    }
                                    _hover={{
                                        bg:
                                            currentPage === totalPages || totalPages === 0
                                                ? colors.paginationDisabledBg
                                                : colors.refreshButtonHoverBg,
                                    }}
                                    onClick={() => handlePageChange(totalPages)}
                                    aria-disabled={
                                        currentPage === totalPages || totalPages === 0
                                    }
                                    pointerEvents={
                                        currentPage === totalPages || totalPages === 0
                                            ? "none"
                                            : "auto"
                                    }
                                >
                                    »
                                </Box>
                            </Flex>
                        </Flex>
                    </Flex>

                    <Text fontSize="sm" color={colors.textColor} textAlign="center" mt={2}>
                        {t("showing")} {users.length > 0 ? pagination.offset + 1 : 0} - {Math.min(pagination.offset + pagination.limit, pagination.total)} {t("of")} {pagination.total} {t("users")}
                    </Text>
                </>
            )}
        </>
    );
};

export default UserTable; 