// src/components/providers.tsx
"use client";

import React from "react";
import { Provider as ReduxProvider } from "react-redux";
import { PersistGate } from "redux-persist/integration/react";
import { Provider as ChakraProvider } from "@/components/ui/provider";
import { Box, Container, Flex } from "@chakra-ui/react";
import { store, persistor } from "@/store/store";
import { AuthProvider } from "@/providers/auth_provider";
import SocketProvider from "@/providers/socket_provider";
import Navbar from "@/components/navbar";
import { Toaster } from "@/components/ui/toaster";
import { defaultSystem } from "@chakra-ui/react"
import { ColorModeProvider } from "@/components/ui/color-mode"


export default function Providers({
  children,
  session,
}: {
  children: React.ReactNode;
  session: any;
}) {
  const [navExpanded, setNavExpanded] = React.useState(false);

  // Function to handle navbar expansion state
  const handleNavExpansion = (expanded: boolean) => {
    setNavExpanded(expanded);
  };

  return (
    <AuthProvider session={session}>
      <ReduxProvider store={store}>
        <PersistGate loading={null} persistor={persistor}>
          <SocketProvider>
            <ChakraProvider>
              {/* @ts-ignore */}
              <ColorModeProvider value={defaultSystem}>
                <Toaster />
                <Flex direction="row" minH="100vh" position="relative" bg="bg.subtle">
                  <Navbar onExpansionChange={handleNavExpansion} />
                  <Box
                    as="main"
                    flex="1"
                    ml="70px"
                    transition="margin-left 0.4s cubic-bezier(0.22, 1, 0.36, 1)"
                    overflow="hidden"
                    display="flex"
                    flexDirection="column"
                    height="calc(100vh - 64px)" // Assuming header is 64px
                    position="relative"
                  >
                    <Box
                      position="absolute"
                      top="0"
                      left="0"
                      right="0"
                      bottom="0"
                      background={{
                        base: "linear-gradient(to right, rgba(255, 255, 255, 0.08), rgba(255, 255, 255, 0.02) 50%)",
                        _dark: "linear-gradient(to right, rgba(30, 30, 30, 0.3), rgba(15, 15, 15, 0.1) 50%)"
                      }}
                      backdropFilter={navExpanded ? "blur(12px)" : "blur(0px)"}
                      zIndex="5"
                      pointerEvents="none"
                      opacity={navExpanded ? 1 : 0}
                      transform={navExpanded ? "translateX(0)" : "translateX(-10px)"}
                      transition="opacity 0.4s ease, transform 0.4s ease, backdrop-filter 0.4s ease"
                    />
                    <Container
                      maxW="container.xl"
                      py={4}
                      height="100%"
                      overflow="hidden"
                      display="flex"
                      flexDirection="column"
                      position="relative"
                      zIndex="1"
                    >
                      {children}
                    </Container>
                  </Box>
                  {/* <Footer /> */}
                </Flex>
              </ColorModeProvider>
            </ChakraProvider>
          </SocketProvider>
        </PersistGate>
      </ReduxProvider>
    </AuthProvider>
  );
}
