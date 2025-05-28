// src/components/providers.tsx
"use client";

import React, { useEffect } from "react";
import { Provider as ReduxProvider } from "react-redux";
import { PersistGate } from "redux-persist/integration/react";
import { Provider as ChakraProvider } from "@/components/ui/provider";
import { store, persistor } from "@/store/store";
import { AuthProvider } from "@/providers/auth_provider";
import SocketProvider from "@/providers/socket_provider";
import { Toaster } from "@/components/ui/toaster";
import { defaultSystem } from "@chakra-ui/react"
import { ColorModeProvider } from "@/components/ui/color-mode"
import { usePathname } from 'next/navigation';
import { setCurrentRoute } from '@/store/features/assistantSlice';
import { useDispatch } from "react-redux";
import { checkSessionExpiration } from "@/store/features/userSlice";
import ActivityTracker from '@/components/ActivityTracker';
import AppLayout from "@/components/app_layout"

// Session expiration checker component
function SessionExpirationChecker() {
  const dispatch = useDispatch();

  useEffect(() => {
    // Check session on mount
    dispatch(checkSessionExpiration());

    // Set up periodic checks
    const interval = setInterval(() => {
      dispatch(checkSessionExpiration());
    }, 60000); // Check every minute

    return () => clearInterval(interval);
  }, [dispatch]);

  return null; // This component doesn't render anything
}

export default function Providers({
  children,
  session,
}: {
  children: React.ReactNode;
  session: any;
}) {
  const pathname = usePathname();

  // Track route changes
  React.useEffect(() => {
    if (store) {
      store.dispatch(setCurrentRoute(pathname));
    }
  }, [pathname]);

  return (
    <AuthProvider session={session}>
      <ReduxProvider store={store}>
        <PersistGate loading={null} persistor={persistor}>
          <SessionExpirationChecker />
          <ActivityTracker />
          <SocketProvider>
            <ChakraProvider>
              {/* @ts-ignore */}
              <ColorModeProvider value={defaultSystem}>
                <Toaster />
                <AppLayout>
                  {children}
                </AppLayout>
              </ColorModeProvider>
            </ChakraProvider>
          </SocketProvider>
        </PersistGate>
      </ReduxProvider>
    </AuthProvider>
  );
}
