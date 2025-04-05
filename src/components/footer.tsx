"use client";

import React from "react";
import {
  Box,
  HStack,
  Image,
  Link,
  Text,
  Tooltip
} from "@chakra-ui/react";

const Footer: React.FC = () => {
  return (
    <Box
      position="fixed"
      bottom="20px"
      right="20px"
      zIndex="10"
    >
      <Text mb={2}>Powered by</Text>
      <HStack gap={4}>
        <Link
          href="https://deepseek.ai"
          target="_blank"
          rel="noopener noreferrer"
          _hover={{ transform: "scale(1.05)" }}
          transition="transform 0.2s"
        >
          <Image
            src="https://openrouter.ai/images/icons/DeepSeek.png"
            alt="Powered by DeepSeek"
            height="40px"
            className="animate-pulse opacity-0 transition-opacity duration-300 ease-in-out"
            onLoad={(e) => {
              e.currentTarget.classList.remove('animate-pulse', 'opacity-0');
              e.currentTarget.classList.add('opacity-100');
            }}
          />
        </Link>
        <Link
          href="https://ai.google.dev/gemma"
          target="_blank"
          rel="noopener noreferrer"
          _hover={{ transform: "scale(1.05)" }}
          transition="transform 0.2s"
        >
          <Image
            src="https://ai.google.dev/static/gemma/images/gemma3.png"
            alt="Powered by Gemma 3"
            height="40px"
            className="animate-pulse opacity-0 transition-opacity duration-300 ease-in-out"
            onLoad={(e) => {
              e.currentTarget.classList.remove('animate-pulse', 'opacity-0');
              e.currentTarget.classList.add('opacity-100');
            }}
          />
        </Link>
      </HStack>
      {/* </Tooltip> */}
    </Box>
  );
};

export default Footer;
