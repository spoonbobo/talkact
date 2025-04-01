import { useColorModeValue } from "@/components/ui/color-mode";

// Chat room list colors
export const useChatRoomColors = () => {
    return {
        bgSubtle: useColorModeValue("bg.subtle", "gray.800"),
        textColor: useColorModeValue("gray.600", "gray.400"),
        textColorHeading: useColorModeValue("gray.800", "gray.100"),
        borderColor: useColorModeValue("gray.200", "gray.700"),
        selectedRoomBg: useColorModeValue("blue.50", "blue.900"),
        selectedRoomBorder: useColorModeValue("blue.300", "blue.600"),
        roomHoverBg: useColorModeValue("gray.50", "gray.700"),
        buttonHoverBg: useColorModeValue("gray.300", "gray.600"),
        buttonActiveBg: useColorModeValue("gray.400", "gray.500"),
    };
};

// Settings page colors
export const useSettingsColors = () => {
    return {
        accentColor: "blue.500",
        bgColor: useColorModeValue("bg.subtle", "gray.800"),
        borderColor: useColorModeValue("gray.200", "gray.700"),
        hoverBg: useColorModeValue("gray.50", "gray.700"),
        textColor: useColorModeValue("gray.800", "gray.100"),
        cardBg: useColorModeValue("white", "gray.800"),
        dangerZoneBg: useColorModeValue("red.50", "red.900"),
        dangerZoneBorder: useColorModeValue("red.200", "red.700"),
        dangerZoneText: useColorModeValue("red.700", "red.200"),
        dangerZoneHeading: useColorModeValue("red.600", "red.300"),
        textColorHeading: useColorModeValue("gray.800", "gray.100"),
    };
};

// Admin panel colors
export const useAdminPanelColors = () => {
    return {
        accentColor: "blue.500",
        borderColor: useColorModeValue("gray.200", "gray.700"),
        hoverBg: useColorModeValue("gray.50", "gray.700"),
        textColor: useColorModeValue("gray.800", "gray.100"),
        cardBg: useColorModeValue("white", "gray.800"),
        textColorHeading: useColorModeValue("gray.800", "gray.100"),
        textColorStrong: useColorModeValue("gray.800", "gray.100"),
        textColorMuted: useColorModeValue("gray.600", "gray.400"),
        bgSubtle: useColorModeValue("gray.50", "gray.800"),
        tableHeaderBg: useColorModeValue("gray.50", "gray.800"),
        errorBg: useColorModeValue("red.50", "red.900"),
        errorText: useColorModeValue("red.500", "red.300"),
        emptyBg: useColorModeValue("gray.50", "gray.800"),
        paginationBg: useColorModeValue("gray.200", "gray.700"),
        paginationDisabledBg: useColorModeValue("gray.100", "gray.800"),
        paginationColor: useColorModeValue("gray.700", "gray.300"),
        paginationDisabledColor: useColorModeValue("gray.400", "gray.600"),
        refreshButtonHoverBg: useColorModeValue("gray.100", "gray.600"),
        inputBgColor: useColorModeValue("white", "gray.700"),
        inputBorderHoverColor: useColorModeValue("gray.300", "gray.600"),
    };
};

// Chat page colors
export const useChatPageColors = () => {
    return {
        textColor: useColorModeValue("gray.600", "gray.400"),
        textColorHeading: useColorModeValue("gray.800", "gray.100"),
        textColorSecondary: useColorModeValue("gray.500", "gray.500"),
        chatModeHeading: useColorModeValue("green.600", "green.400"),
        borderColor: useColorModeValue("gray.200", "gray.700"),
        bgSubtle: useColorModeValue("rgba(249, 250, 251, 0.8)", "rgba(26, 32, 44, 0.8)"),
        cardBg: useColorModeValue("white", "gray.800"),
        hoverBg: useColorModeValue("gray.50", "gray.700"),
        buttonHoverBg: useColorModeValue("gray.300", "gray.600"),
        buttonActiveBg: useColorModeValue("gray.400", "gray.500"),
        userBgTask: useColorModeValue("blue.500", "blue.600"),
        userBgChat: useColorModeValue("teal.500", "teal.600"),
        otherBgTask: useColorModeValue("gray.100", "gray.700"),
        otherBgChat: useColorModeValue("gray.100", "gray.700"),
        otherTextTask: useColorModeValue("gray.800", "gray.100"),
        otherTextChat: useColorModeValue("gray.800", "gray.200"),
        chatInputBg: useColorModeValue("rgba(240, 255, 244, 0.8)", "rgba(25, 45, 35, 0.8)"),
        chatInputButtonBg: useColorModeValue("green.600", "green.700"),
        chatInputButtonHoverBg: useColorModeValue("green.700", "green.600"),
        chatInputCancelHoverBg: useColorModeValue("red.600", "red.500"),
        emptyStateBg: useColorModeValue("rgba(245, 250, 248, 0.3)", "rgba(30, 40, 38, 0.3)"),
        emptyStateTextColor: useColorModeValue("teal.700", "teal.300"),
        emptyStateSubtleColor: useColorModeValue("teal.600", "teal.400"),
        aiNameColor: useColorModeValue("teal.600", "teal.400"),
        formTextColor: useColorModeValue("gray.600", "gray.400"),
        formButtonBg: useColorModeValue("gray.200", "gray.700"),
        formButtonHoverBg: useColorModeValue("gray.300", "gray.600"),
        formButtonActiveBg: useColorModeValue("gray.400", "gray.500"),
        formInputBg: useColorModeValue("white", "gray.700"),
        createButtonBg: useColorModeValue("blue.500", "blue.500"),
        createButtonHoverBg: useColorModeValue("blue.600", "blue.600"),
        createButtonActiveBg: useColorModeValue("blue.700", "blue.700"),
        messageTextColor: useColorModeValue("gray.600", "gray.400"),
        scrollbarTrackBg: useColorModeValue("#f1f1f1", "#2d3748"),
        scrollbarThumbBg: useColorModeValue("#c5c5c5", "#4a5568"),
        scrollbarThumbHoverBg: useColorModeValue("#a8a8a8", "#718096"),
        chatModeBg: useColorModeValue("rgba(245, 250, 248, 0.3)", "rgba(30, 40, 38, 0.3)"),
        chatModeBorder: useColorModeValue("gray.300", "gray.600"),
        chatModeColor: useColorModeValue("green.500", "green.500"),
        taskModeColor: useColorModeValue("blue.500", "blue.500"),
        taskModeHoverColor: useColorModeValue("blue.600", "blue.600"),
        chatModeHoverColor: useColorModeValue("green.600", "green.600"),
    };
};

