// team-view

"use client";

import React from "react";
import { Link, Box, Icon, useBreakpointValue } from "@chakra-ui/react";
import { useTranslations } from "next-intl";
import { useSelector } from "react-redux";
import {
  FaTasks,
  FaComments,
  FaCog,
  FaSignOutAlt,
  FaSignInAlt,
  FaUserCog,
  FaTools,
} from "react-icons/fa";
import { useColorModeValue } from "@/components/ui/color-mode";
import { useParams } from "next/navigation";
import { RootState } from "@/store/store";

const NavBar = ({ onExpansionChange }: { onExpansionChange?: (expanded: boolean) => void }) => {
  const isMobile = useBreakpointValue({ base: true, md: false });
  const [isExpanded, setIsExpanded] = React.useState(false);

  const handleMouseEnter = () => {
    setIsExpanded(true);
    if (onExpansionChange) onExpansionChange(true);
  };

  const handleMouseLeave = () => {
    setIsExpanded(false);
    if (onExpansionChange) onExpansionChange(false);
  };

  return (
    <NavBarContainer
      isMobile={isMobile}
      isExpanded={isExpanded}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <MenuLinks isMobile={isMobile} isExpanded={isExpanded} />
    </NavBarContainer>
  );
};

const NavBarContainer = ({
  children,
  isMobile,
  isExpanded,
  onMouseEnter,
  onMouseLeave,
}: {
  children: React.ReactNode;
  isMobile?: boolean;
  isExpanded: boolean;
  onMouseEnter: () => void;
  onMouseLeave: () => void;
}) => {
  const bgColor = useColorModeValue("bg.subtle", "gray.800");
  const borderColor = useColorModeValue("gray.100", "gray.700");
  const shadowColor = useColorModeValue("rgba(0,0,0,0.06)", "rgba(0,0,0,0.3)");

  return (
    <div
      className={`
        fixed top-0 left-0 z-10 flex flex-col items-center justify-start
        ${isExpanded ? 'w-[260px]' : 'w-[60px]'}
        ${isMobile ? 'h-auto' : 'h-screen'}
        px-3 py-4 backdrop-blur-xl
        transition-all duration-400 ease-out
        overflow-hidden
      `}
      style={{
        backgroundColor: bgColor,
        borderRight: `1px solid ${borderColor}`,
        boxShadow: `0 3px 20px ${shadowColor}`,
        borderBottom: isMobile ? `1px solid ${borderColor}` : 'none',
        transitionTimingFunction: "cubic-bezier(0.22, 1, 0.36, 1)",
        transitionDelay: "0.1s"
      }}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
    >
      {children}
    </div>
  );
};

const MenuItem = ({
  children,
  to = "/",
  onClick,
  ...rest
}: {
  children: React.ReactNode;
  to?: string;
  onClick?: (e: React.MouseEvent<HTMLAnchorElement>) => void;
}) => {
  return (
    <Link href={to} onClick={onClick}>
      <Box display="block" {...rest}>
        {children}
      </Box>
    </Link>
  );
};

const NavIconButton = ({
  to,
  icon,
  label,
  tooltipContent,
  onClick,
  color,
  disabled = false,
  isMobile,
  isExpanded,
  mb,
}: {
  to?: string;
  icon: React.ElementType | (() => React.ReactNode);
  label: string;
  tooltipContent: string;
  onClick?: (e: React.MouseEvent<HTMLButtonElement>) => void;
  color?: string;
  disabled?: boolean;
  isMobile?: boolean;
  isExpanded?: boolean;
  mb?: number | string;
}) => {
  const t = useTranslations("Navbar");
  const tooltipBg = useColorModeValue("gray.800", "gray.200");
  const tooltipColor = useColorModeValue("white", "gray.800");
  const textColor = useColorModeValue("gray.600", "gray.300");
  const textColorDisabled = useColorModeValue("gray.300", "gray.600");
  const iconHoverBg = useColorModeValue("blue.50", "blue.900");

  return (
    <div className={`relative w-full ${mb ? `mb-${mb}` : 'mb-12'}`}>
      {!isExpanded && (
        <div
          className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-[110%] text-xs px-3 py-1.5 rounded-md opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none whitespace-nowrap z-10 shadow-lg"
          style={{
            backgroundColor: tooltipBg,
            color: tooltipColor
          }}
        >
          {tooltipContent}
        </div>
      )}

      <button
        className={`
          group flex items-center w-full p-3 rounded-xl transition-all duration-300 ease-in-out focus:outline-none
          ${disabled
            ? 'cursor-not-allowed opacity-50'
            : 'cursor-pointer hover:scale-105 hover:shadow-md active:scale-95'}
        `}
        style={{
          color: disabled ? textColorDisabled : color || textColor
        }}
        onClick={disabled ? undefined : onClick}
      >
        <Link
          href={disabled ? "#" : to || "#"}
          onClick={disabled ? (e) => e.preventDefault() : undefined}
          className={`flex items-center w-full ${disabled ? 'pointer-events-none' : ''}`}
        >
          <div
            className="w-14 h-14 flex justify-center items-center flex-shrink-0 rounded-full transition-all duration-200"
            style={{
              backgroundColor: 'transparent',
              // @ts-ignore
              '&:hover': {
                backgroundColor: iconHoverBg
              }
            }}
          >
            {typeof icon === 'function' ?
              // @ts-ignore
              icon() :
              <span className="text-2xl transition-all duration-300">
                <Icon
                  as={icon}
                  boxSize={7}
                  className="group-hover:text-blue-500"
                />
              </span>
            }
          </div>

          <div className={`
            relative ml-4 h-6 overflow-hidden transition-all duration-500 ease-in-out
            ${isExpanded ? 'w-[120px]' : 'w-0'}
          `}>
            <div
              className={`
                absolute top-0 left-0 font-medium whitespace-nowrap
                transition-all duration-500 ease-in-out
                ${isExpanded ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-2'}
              `}
              style={{
                transitionDelay: isExpanded ? '0.2s' : '0s'
              }}
            >
              <span className="relative inline-block after:content-[''] after:absolute after:left-0 after:bottom-0 after:w-full after:h-[2px] after:bg-blue-500 after:opacity-0 after:transition-all after:duration-300 after:origin-left after:scale-x-0 group-hover:after:scale-x-100 group-hover:after:opacity-100 group-hover:text-blue-600">
                {t(label.toLowerCase())}
              </span>
            </div>
          </div>
        </Link>
      </button>
    </div>
  );
};

const MenuLinks = ({ isMobile, isExpanded }: { isMobile?: boolean; isExpanded?: boolean }) => {
  const t = useTranslations("Navbar");
  const { currentUser, isAuthenticated } = useSelector(
    (state: RootState) => state.user
  );
  const lastOpenedTeam = currentUser?.lastOpenedTeam;
  const logoBgColor = useColorModeValue("gray.100", "gray.700");
  const logoTextColor = useColorModeValue("gray.800", "gray.100");
  const logoShadow = useColorModeValue("shadow-sm", "shadow-none");
  const params = useParams();
  const isLoggedIn = isAuthenticated;
  const withATeam = params.teamId !== undefined;
  const locale = currentUser?.settings?.general?.language || params.locale as string;

  return (
    <div className="flex flex-col items-center w-full h-full">
      {/* Top section with logo and main nav */}
      <div className="flex flex-col w-full items-center mt-4">
        {/* Logo section - always visible */}
        <NavIconButton
          to={`/${locale}/${lastOpenedTeam}`}
          icon={() => (
            <div
              className={`w-10 h-10 rounded-md flex items-center justify-center font-bold ${logoShadow} transition-all duration-300 ease-in-out hover:scale-105 active:scale-95 border border-gray-300 dark:border-gray-600`}
              style={{ backgroundColor: logoBgColor, color: logoTextColor }}
            >
              O
            </div>
          )}
          label="onlysaid"
          tooltipContent={t("onlysaid")}
          isMobile={isMobile}
          isExpanded={isExpanded}
          mb={10}
        />

        {/* Main navigation - only visible when logged in */}
        {isLoggedIn && (
          <div className="flex flex-col w-full items-center">
            <NavIconButton
              to={`/${locale}/${lastOpenedTeam}/chat`}
              icon={FaComments}
              label="Chat"
              tooltipContent={t("chat")}
              isMobile={isMobile}
              isExpanded={isExpanded}
            />

            <NavIconButton
              to={`/${locale}/${lastOpenedTeam}/plans`}
              icon={FaTasks}
              label="Plans"
              tooltipContent={t("plans")}
              isMobile={isMobile}
              isExpanded={isExpanded}
            />

            <NavIconButton
              to={`/${locale}/${lastOpenedTeam}/workbench`}
              icon={FaTools}
              label="Workbench"
              tooltipContent={t("workbench")}
              isMobile={isMobile}
              isExpanded={isExpanded}
            />

            <NavIconButton
              to={`/${locale}/${lastOpenedTeam}/admin/panel`}
              icon={FaUserCog}
              label="admin_panel"
              tooltipContent={t("admin_panel")}
              isMobile={isMobile}
              isExpanded={isExpanded}
            />
          </div>
        )}
      </div>

      {/* Bottom section with settings and sign out */}
      <div className="flex flex-col w-full mt-auto mb-4 items-center">
        {/* Settings - visible to all users, whether logged in or not */}
        <NavIconButton
          to={`/${locale}/settings`}
          icon={FaCog}
          label="Settings"
          tooltipContent={t("settings")}
          isMobile={isMobile}
          isExpanded={isExpanded}
        />

        {/* Sign in/out button - always visible */}
        <NavIconButton
          to={isLoggedIn ? `/signout` : "/signin"}
          icon={isLoggedIn ? FaSignOutAlt : FaSignInAlt}
          label={isLoggedIn ? "Sign_Out" : "Sign_In"}
          color={isLoggedIn ? "red.500" : "blue.500"}
          tooltipContent={isLoggedIn ? t("signout") : t("signin")}
          isMobile={isMobile}
          isExpanded={isExpanded}
        />
      </div>
    </div>
  );
};

export default NavBar;
