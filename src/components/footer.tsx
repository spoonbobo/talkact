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
      <Text fontSize="sm" color="gray.500">
        Version {process.env.NEXT_PUBLIC_VERSION}
      </Text>
    </Box>
  );
};

export default Footer;
