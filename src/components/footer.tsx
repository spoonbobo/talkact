"use client";

import React, { useState, useEffect } from "react";
import {
  Box,
  HStack,
  Image,
  Link,
  Text,
  Spinner,
  // Tooltip,
  VStack,
} from "@chakra-ui/react";
import { Tooltip } from "@/components/ui/tooltip";
import { useTranslations } from "next-intl";
import { useColorMode } from "@/components/ui/color-mode";
import { useSelector } from "react-redux";
import { RootState } from "@/store/store";

const Footer: React.FC = () => {
  const t = useTranslations("Footer");
  const { colorMode } = useColorMode();
  const [timeRemaining, setTimeRemaining] = useState<string>("--:--");
  const [githubStats, setGithubStats] = useState<{ stars: number } | null>(null);

  // Get the expiration timestamp from Redux state
  const expiresAt = useSelector((state: RootState) => state.user.expiresAt);
  const isAuthenticated = useSelector((state: RootState) => state.user.isAuthenticated);

  useEffect(() => {
    // Fetch GitHub stats from our API endpoint
    const fetchGitHubStats = async () => {
      try {
        const response = await fetch('/api/github/stats');
        if (response.ok) {
          const data = await response.json();
          setGithubStats(data);
        } else {
          console.error('Failed to fetch GitHub stats');
        }
      } catch (error) {
        console.error('Error fetching GitHub stats:', error);
      }
    };

    fetchGitHubStats();

    // Refresh GitHub stats every hour
    const statsInterval = setInterval(fetchGitHubStats, 3600000);

    return () => clearInterval(statsInterval);
  }, []);

  useEffect(() => {
    // Only run the timer if user is authenticated and expiration exists
    if (!isAuthenticated || !expiresAt) {
      setTimeRemaining("--:--");
      return;
    }

    const updateTimer = () => {
      const now = Date.now();
      const remaining = expiresAt - now;

      if (remaining <= 0) {
        setTimeRemaining("00:00");
        return;
      }

      // Convert to minutes and seconds
      const minutes = Math.floor(remaining / 60000);
      const seconds = Math.floor((remaining % 60000) / 1000);

      // Format as MM:SS
      setTimeRemaining(
        `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
      );
    };

    // Update immediately
    updateTimer();

    // Set interval to update every second
    const interval = setInterval(updateTimer, 1000);

    return () => clearInterval(interval);
  }, [expiresAt, isAuthenticated]);

  return (
    <Box
      position="fixed"
      bottom="20px"
      right="20px"
      zIndex="10"
    >
      <HStack gap={4}>
        <Link href="https://github.com/spoonbobo/onlysaid" target="_blank">
          <HStack gap={1}>
            <Image
              src="https://github.githubassets.com/images/modules/logos_page/GitHub-Mark.png"
              alt="GitHub"
              boxSize="20px"
              filter={colorMode === 'dark' ? 'invert(1)' : 'none'}
            />
            {githubStats ? (
              <Text fontSize="sm" color="gray.500">
                {githubStats.stars}
              </Text>
            ) : (
              <Spinner size="xs" color="gray.500" />
            )}
          </HStack>
        </Link>
        <Text fontSize="sm" color="gray.500">
          {t("version")} {process.env.NEXT_PUBLIC_VERSION}
        </Text>
        <Tooltip
          content={
            <VStack align="start">
              <Text>Auth: {isAuthenticated ? "Yes" : "No"}</Text>
              <Text>Expires: {expiresAt ? new Date(expiresAt).toLocaleTimeString() : "Not set"}</Text>
              <Text>Now: {new Date().toLocaleTimeString()}</Text>
            </VStack>
          }
        >
          <Text fontSize="sm" color={timeRemaining === "00:00" ? "red.500" : "gray.500"}>
            TTL: {timeRemaining}
          </Text>
        </Tooltip>
      </HStack>
    </Box>
  );
};

export default Footer;
