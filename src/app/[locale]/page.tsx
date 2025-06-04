"use client";

import React from "react";
import {
  Box,
  Container,
  Typography,
  Button,
  Stack,
  Paper,
  Chip,
} from "@mui/material";
import { motion } from "framer-motion";
import {
  Chat as ChatIcon,
  Language as LanguageIcon,
  Security as SecurityIcon,
  Extension as ExtensionIcon,
  GitHub as GitHubIcon,
  Launch as LaunchIcon,
} from "@mui/icons-material";
import { useTranslations } from "next-intl";

const MotionBox = motion.create(Box);
const MotionPaper = motion.create(Paper);

export default function HomePage() {
  const t = useTranslations("Home");

  const features = [
    {
      icon: ChatIcon,
      title: "Natural Language Collaboration",
      description: "Complete any tasks with your team and agents using only natural language in your workspaces"
    },
    {
      icon: ExtensionIcon,
      title: "Agentic Stack",
      description: "Ready-to-use agentic stack with highly configurable and extensible client & servers"
    },
    {
      icon: LanguageIcon,
      title: "Intelligent Planning",
      description: "Intelligent planning and execution system with full natural-language support"
    },
    {
      icon: SecurityIcon,
      title: "Privacy Preserved",
      description: "All messages and personal credentials are stored purely local for maximum privacy"
    }
  ];

  return (
    <Box
      sx={{
        width: "100%",
        background: "linear-gradient(135deg, rgba(138,43,226,0.05) 0%, rgba(0,191,255,0.05) 100%)"
      }}
    >
      <Container maxWidth="lg" sx={{ py: 8 }}>
        {/* Hero Section */}
        <MotionBox
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          textAlign="center"
          sx={{ mb: 8 }}
        >
          <Typography
            variant="h1"
            sx={{
              fontSize: { xs: "2.5rem", md: "3.5rem" },
              fontWeight: "bold",
              mb: 3,
              background: "linear-gradient(135deg, #8A2BE2, #00BFFF)",
              backgroundClip: "text",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent"
            }}
          >
            Onlysaid
          </Typography>

          <Typography
            variant="h4"
            color="text.secondary"
            sx={{ mb: 4, maxWidth: "800px", mx: "auto", lineHeight: 1.5 }}
          >
            Collaborate any tasks with only natural language
          </Typography>

          <Stack
            direction={{ xs: "column", sm: "row" }}
            spacing={2}
            justifyContent="center"
            sx={{ mb: 4 }}
          >
            <Button
              variant="contained"
              size="large"
              href="https://onlysaid.com/docs/#/"
              target="_blank"
              startIcon={<LaunchIcon />}
              sx={{ px: 4, py: 1.5 }}
            >
              Get Started
            </Button>
            <Button
              variant="outlined"
              size="large"
              href="https://github.com/spoonbobo/onlysaid"
              target="_blank"
              startIcon={<GitHubIcon />}
              sx={{ px: 4, py: 1.5 }}
            >
              View on GitHub
            </Button>
          </Stack>

          <Stack direction="row" spacing={1} justifyContent="center" flexWrap="wrap">
            <Chip label="Apache-2.0 License" variant="outlined" />
            <Chip label="37 Stars" variant="outlined" />
            <Chip label="TypeScript" variant="outlined" />
            <Chip label="Python" variant="outlined" />
          </Stack>
        </MotionBox>

        {/* Features Section */}
        <MotionBox
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.3 }}
          sx={{ mb: 8 }}
        >
          <Typography
            variant="h3"
            textAlign="center"
            sx={{ mb: 6, fontWeight: "bold" }}
          >
            Features
          </Typography>

          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: { xs: "1fr", md: "repeat(2, 1fr)" },
              gap: 3
            }}
          >
            {features.map((feature, index) => (
              <MotionPaper
                key={index}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: 0.1 * index }}
                elevation={2}
                sx={{
                  p: 3,
                  borderRadius: 2,
                  border: 1,
                  borderColor: "divider",
                  height: "100%"
                }}
              >
                <Stack direction="row" alignItems="flex-start" spacing={2}>
                  <Box
                    sx={{
                      p: 1.5,
                      backgroundColor: "primary.light",
                      borderRadius: 2,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center"
                    }}
                  >
                    <feature.icon sx={{ fontSize: "1.5rem", color: "primary.main" }} />
                  </Box>
                  <Box>
                    <Typography variant="h6" fontWeight="bold" sx={{ mb: 1 }}>
                      {feature.title}
                    </Typography>
                    <Typography color="text.secondary">
                      {feature.description}
                    </Typography>
                  </Box>
                </Stack>
              </MotionPaper>
            ))}
          </Box>
        </MotionBox>

        {/* Call to Action */}
        <MotionBox
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.6 }}
          textAlign="center"
        >
          <Paper
            elevation={3}
            sx={{
              p: 6,
              borderRadius: 3,
              background: "linear-gradient(135deg, rgba(138,43,226,0.1) 0%, rgba(0,191,255,0.1) 100%)"
            }}
          >
            <Typography variant="h4" fontWeight="bold" sx={{ mb: 2 }}>
              Ready to get started?
            </Typography>
            <Typography variant="h6" color="text.secondary" sx={{ mb: 4 }}>
              Experience seamless collaboration with natural language
            </Typography>
            <Button
              variant="contained"
              size="large"
              href="https://onlysaid.com/docs/#/"
              target="_blank"
              sx={{ px: 6, py: 2 }}
            >
              Start Now
            </Button>
          </Paper>
        </MotionBox>
      </Container>
    </Box>
  );
}
