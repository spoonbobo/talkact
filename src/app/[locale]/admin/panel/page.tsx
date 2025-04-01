"use client";

import React, { useState, useEffect } from "react";
import { FaUsers } from "react-icons/fa";
import { useTranslations } from "next-intl";
import { useSession } from "next-auth/react";
import { useSelector } from 'react-redux';
import { RootState } from "@/store/store";
import { useRouter } from "next/navigation";
import Loading from "@/components/loading";
import { useColorModeValue } from "@/components/ui/color-mode";
import { toaster } from "@/components/ui/toaster";
import AdminPanelLayout from "@/components/admin/panel/layout/AdminPanelLayout";
import UserManagementTab from "@/components/admin/panel/tabs/UserManagementTab";

// Define the User interface if it's not already defined in your types/user.d.ts
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

export default function AdminPanelPage() {
  const t = useTranslations("AdminPanel");
  const { data: session } = useSession();
  const router = useRouter();
  const { currentUser, isAuthenticated, isLoading, isOwner } = useSelector(
    (state: RootState) => state.user
  );

  // Keep tab state for future expansion
  const [activeTab, setActiveTab] = useState(0);

  // Add state for users data
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [pagination, setPagination] = useState({
    total: 0,
    limit: 10,
    offset: 0
  });

  // Add debounced search
  const [debouncedSearch, setDebouncedSearch] = useState('');

  // Define custom colors using useColorModeValue for dark mode support
  const borderColor = useColorModeValue("gray.200", "gray.700");
  const hoverBg = useColorModeValue("gray.50", "gray.700");
  const textColor = useColorModeValue("gray.800", "gray.100");
  const cardBg = useColorModeValue("white", "gray.800");
  const textColorHeading = useColorModeValue("gray.800", "gray.100");
  const textColorStrong = useColorModeValue("gray.800", "gray.100");
  const textColorMuted = useColorModeValue("gray.600", "gray.400");
  const bgSubtle = useColorModeValue("gray.50", "gray.800");
  const tableHeaderBg = useColorModeValue("gray.50", "gray.800");
  const errorBg = useColorModeValue("red.50", "red.900");
  const errorText = useColorModeValue("red.500", "red.300");
  const emptyBg = useColorModeValue("gray.50", "gray.800");
  const paginationBg = useColorModeValue("gray.200", "gray.700");
  const paginationDisabledBg = useColorModeValue("gray.100", "gray.800");
  const paginationColor = useColorModeValue("gray.700", "gray.300");
  const paginationDisabledColor = useColorModeValue("gray.400", "gray.600");
  const refreshButtonHoverBg = useColorModeValue("gray.100", "gray.600");
  const inputBgColor = useColorModeValue("white", "gray.700");
  const inputBorderHoverColor = useColorModeValue("gray.300", "gray.600");

  // Define the tab items with proper typing
  const tabItems = [
    { icon: FaUsers, label: t("users"), id: 0 },
    // More tabs can be added here in the future
  ];

  // Fetch users function
  const fetchUsers = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        limit: pagination.limit.toString(),
        offset: pagination.offset.toString()
      });

      if (debouncedSearch) {
        params.append('search', debouncedSearch);
      }

      const response = await fetch(`/api/user/get_users?${params.toString()}`);

      if (!response.ok) {
        throw new Error(`Error: ${response.status}`);
      }

      const data = await response.json();
      setUsers(data.users);
      setPagination(data.pagination);
      setError(null);
    } catch (err) {
      toaster.create({
        title: "Error fetching users",
        description: "Failed to fetch users. Please try again later.",
        type: "error"
      })
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
    }, 500);

    return () => clearTimeout(timer);
  }, [search]);

  // Fetch users when search or pagination changes
  useEffect(() => {
    if (isAuthenticated && activeTab === 0) {
      fetchUsers();
    }
  }, [debouncedSearch, pagination.limit, pagination.offset, activeTab, isAuthenticated]);

  // Format date helper
  const formatDate = (dateString: string | undefined) => {
    if (!dateString) return "N/A";
    return new Date(dateString).toLocaleString();
  };

  // Format UUID helper to get first substring
  const formatUserId = (userId: string) => {
    if (!userId) return "N/A";
    return userId.split('-')[0];
  };

  // Add this function if you want to refresh user list after creation
  const handleUserCreated = () => {
    fetchUsers();
  };

  // Use useEffect for navigation instead of doing it during render
  useEffect(() => {
    if (currentUser && !isOwner) {
      router.push('/redirect/no_access?reason=Not available for UAT');
    }
  }, [currentUser, isOwner, router]);

  // Show loading state while checking authentication
  if (isLoading || !session) {
    return <Loading />;
  }

  // Redirect if not authenticated
  if (!isAuthenticated && !session) {
    router.push('/login');
    return null;
  }

  return (
    <AdminPanelLayout
      title={t("admin_panel")}
      titleIcon={FaUsers}
      tabItems={tabItems}
      activeTab={activeTab}
      setActiveTab={setActiveTab}
      textColorHeading={textColorHeading}
      textColor={textColor}
      hoverBg={hoverBg}
    >
      {activeTab === 0 && (
        <UserManagementTab
          users={users}
          loading={loading}
          error={error}
          search={search}
          setSearch={setSearch}
          pagination={pagination}
          setPagination={setPagination}
          formatDate={formatDate}
          formatUserId={formatUserId}
          t={t}
          colors={{
            textColor,
            textColorHeading,
            textColorStrong,
            textColorMuted,
            inputBgColor,
            borderColor,
            inputBorderHoverColor,
            tableHeaderBg,
            errorBg,
            errorText,
            emptyBg,
            hoverBg,
            paginationBg,
            paginationDisabledBg,
            paginationColor,
            paginationDisabledColor,
            refreshButtonHoverBg,
            cardBg,
            bgSubtle
          }}
          handleUserCreated={handleUserCreated}
        />
      )}
    </AdminPanelLayout>
  );
}