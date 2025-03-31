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
        chatModeHeading: useColorModeValue("green.600", "green.400"),
        borderColor: useColorModeValue("gray.200", "gray.700"),
        bgSubtle: useColorModeValue("bg.subtle", "gray.800"),
        cardBg: useColorModeValue("white", "gray.800"),
        hoverBg: useColorModeValue("gray.50", "gray.700"),
        buttonHoverBg: useColorModeValue("gray.300", "gray.600"),
        buttonActiveBg: useColorModeValue("gray.400", "gray.500"),
    };
};

