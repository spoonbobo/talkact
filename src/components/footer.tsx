"use client";

import React from "react";
import {
  Box,
  HStack,
  Image,
  Link,
  Text,
  Tooltip,
} from "@chakra-ui/react";
import { useTranslations } from "next-intl";
import { useColorMode } from "@/components/ui/color-mode";

const Footer: React.FC = () => {
  const t = useTranslations("Footer");
  const { colorMode } = useColorMode();
  return (
    <Box
      position="fixed"
      bottom="20px"
      right="20px"
      zIndex="10"
      bg={colorMode === 'dark' ? 'transparent' : 'white'}
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
            <Text fontSize="sm" color="gray.500">31</Text>
          </HStack>
        </Link>
        <Text fontSize="sm" color="gray.500">
          {t("version")} {process.env.NEXT_PUBLIC_VERSION}
        </Text>
      </HStack>
    </Box>
  );
};

export default Footer;
