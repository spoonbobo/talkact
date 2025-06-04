"use client";

import React, { useState, useEffect } from "react";
import {
  Box,
  Container,
  Typography,
  Link,
  Stack,
  IconButton,
  Select,
  MenuItem,
  FormControl
} from "@mui/material";
import {
  GitHub,
  Language as LanguageIcon,
  LightMode,
  DarkMode
} from "@mui/icons-material";
import { useTranslations } from "next-intl";
import { useParams, useRouter, usePathname } from "next/navigation";
import { useSelector, useDispatch } from "react-redux";
import { RootState } from "@/store/store";
import { setUserSettings } from '@/store/features/userSlice';
import { toaster } from "@/components/ui/toaster";

const Footer: React.FC = () => {
  const t = useTranslations("Footer");
  const params = useParams();
  const router = useRouter();
  const pathname = usePathname();
  const dispatch = useDispatch();
  const { currentUser, isAuthenticated } = useSelector((state: RootState) => state.user);
  const userSettings = useSelector((state: RootState) => state.user.currentUser?.settings);

  const currentLocale = params.locale as string;
  const [selectedLanguage, setSelectedLanguage] = useState(currentLocale || 'en');
  const [currentTheme, setCurrentTheme] = useState('light');

  // Initialize theme
  useEffect(() => {
    const storedTheme = localStorage.getItem("chakra-ui-color-mode") ||
      userSettings?.general?.theme ||
      'light';
    setCurrentTheme(storedTheme);
  }, [userSettings]);

  // Language options with correct locale codes
  const languages = [
    { code: 'en', name: 'English' },
    { code: 'zh-HK', name: '中文' },
    { code: 'ja', name: '日本語' },
    { code: 'ko', name: '한국어' }
  ];

  const handleLanguageChange = async (newLocale: string) => {
    setSelectedLanguage(newLocale);

    try {
      // Update user settings if authenticated
      if (isAuthenticated && currentUser) {
        const updatedUserSettings = {
          ...userSettings,
          general: {
            ...userSettings?.general,
            language: newLocale,
            theme: userSettings?.general?.theme || 'light',
          }
        };

        // Save to database
        await fetch('/api/user/update_user', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ settings: updatedUserSettings }),
        });

        // Update Redux store
        dispatch(setUserSettings(updatedUserSettings));
      }

      // Get current path and replace locale
      const pathParts = pathname.split('/');
      pathParts[1] = newLocale;
      const newPath = pathParts.join('/');

      // Navigate to new locale
      window.location.href = newPath;
    } catch (error) {
      console.error("Error saving language settings:", error);
      toaster.create({
        title: "Error",
        description: "Failed to save language preference",
        type: "error"
      });
    }
  };

  const handleThemeToggle = async () => {
    const newTheme = currentTheme === 'light' ? 'dark' : 'light';
    setCurrentTheme(newTheme);

    try {
      // Save to localStorage
      localStorage.setItem("chakra-ui-color-mode", newTheme);

      // Update user settings if authenticated
      if (isAuthenticated && currentUser) {
        const updatedUserSettings = {
          ...userSettings,
          general: {
            ...userSettings?.general,
            language: userSettings?.general?.language || 'en',
            theme: newTheme,
          }
        };

        // Save to database
        await fetch('/api/user/update_user', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ settings: updatedUserSettings }),
        });

        // Update Redux store
        dispatch(setUserSettings(updatedUserSettings));
      }

      // Apply theme change to document
      document.documentElement.setAttribute('data-theme', newTheme);

      toaster.create({
        title: "Theme Updated",
        description: `Switched to ${newTheme} mode`,
        type: "success"
      });
    } catch (error) {
      console.error("Error saving theme settings:", error);
      toaster.create({
        title: "Error",
        description: "Failed to save theme preference",
        type: "error"
      });
    }
  };

  return (
    <Box
      component="footer"
      sx={{
        py: 6,
        px: { xs: 2, sm: 3, md: 6 },
        mt: 'auto',
        borderTop: '1px solid',
        borderColor: 'divider'
      }}
    >
      <Container maxWidth="lg">
        <Box sx={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: 4,
          justifyContent: 'space-between'
        }}>
          {/* Contact Section */}
          <Box sx={{ minWidth: '200px', flex: '1 1 auto' }}>
            <Typography variant="body2" color="text.secondary" gutterBottom>
              spoonbobo@onlysaid.com ↗
            </Typography>
            <Stack direction="row" spacing={1} sx={{ mt: 2 }}>
              <IconButton size="small" color="inherit" href="https://github.com/spoonbobo/onlysaid" target="_blank">
                <GitHub fontSize="small" />
              </IconButton>
            </Stack>
          </Box>

          {/* Resources Section */}
          <Box sx={{ minWidth: '120px' }}>
            <Typography variant="h6" gutterBottom>Resources</Typography>
            <Stack spacing={1}>
              <Link href="https://onlysaid.com/docs/#/" color="text.secondary" underline="none" target="_blank">
                <Typography variant="body2">Documentation</Typography>
              </Link>
              <Link href="https://github.com/spoonbobo/onlysaid" color="text.secondary" underline="none" target="_blank">
                <Typography variant="body2">GitHub</Typography>
              </Link>
              <Link href="https://github.com/spoonbobo/onlysaid/issues" color="text.secondary" underline="none" target="_blank">
                <Typography variant="body2">Issues</Typography>
              </Link>
              <Link href="https://github.com/spoonbobo/onlysaid/releases" color="text.secondary" underline="none" target="_blank">
                <Typography variant="body2">Releases</Typography>
              </Link>
            </Stack>
          </Box>

          {/* Community Section */}
          <Box sx={{ minWidth: '120px' }}>
            <Typography variant="h6" gutterBottom>Community</Typography>
            <Stack spacing={1}>
              <Link href="https://github.com/spoonbobo/onlysaid/discussions" color="text.secondary" underline="none" target="_blank">
                <Typography variant="body2">Discussions</Typography>
              </Link>
              <Link href="https://github.com/spoonbobo/onlysaid/blob/main/README.md" color="text.secondary" underline="none" target="_blank">
                <Typography variant="body2">Contributing</Typography>
              </Link>
            </Stack>
          </Box>

          {/* Legal Section */}
          <Box sx={{ minWidth: '120px' }}>
            <Typography variant="h6" gutterBottom>Legal</Typography>
            <Stack spacing={1}>
              <Link href="https://github.com/spoonbobo/onlysaid/blob/main/LICENSE" color="text.secondary" underline="none" target="_blank">
                <Typography variant="body2">Apache-2.0 License</Typography>
              </Link>
            </Stack>
          </Box>
        </Box>

        {/* Bottom Section */}
        <Box
          sx={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            mt: 4,
            pt: 2,
            borderTop: '1px solid',
            borderColor: 'divider',
            flexWrap: 'wrap',
            gap: 2
          }}
        >
          <Typography variant="body2" color="text.secondary">
            © 2025 Made by spoonbobo • Onlysaid
          </Typography>

          {/* Language and Theme Controls */}
          <Stack direction="row" spacing={2} alignItems="center">
            {/* Language Switcher */}
            <Stack direction="row" alignItems="center" spacing={1}>
              <LanguageIcon sx={{ fontSize: '1rem', color: 'text.secondary' }} />
              <FormControl size="small">
                <Select
                  value={selectedLanguage}
                  onChange={(e) => handleLanguageChange(e.target.value)}
                  variant="outlined"
                  sx={{
                    minWidth: 100,
                    '& .MuiOutlinedInput-notchedOutline': {
                      border: 'none'
                    },
                    '& .MuiSelect-select': {
                      py: 0.5,
                      fontSize: '0.875rem',
                      color: 'text.secondary'
                    }
                  }}
                >
                  {languages.map((lang) => (
                    <MenuItem key={lang.code} value={lang.code}>
                      {lang.name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Stack>

            {/* Theme Toggle */}
            <IconButton
              onClick={handleThemeToggle}
              size="small"
              sx={{
                color: 'text.secondary',
                border: '1px solid',
                borderColor: 'divider',
                borderRadius: 1
              }}
            >
              {currentTheme === 'dark' ? <LightMode fontSize="small" /> : <DarkMode fontSize="small" />}
            </IconButton>

            <Typography variant="body2" color="text.secondary">
              ⭐ 37 stars on GitHub
            </Typography>
          </Stack>
        </Box>
      </Container>
    </Box>
  );
};

export default Footer;
