"use client";

import React from "react";
import { Flex, Text, Stack, Link } from "@chakra-ui/react";

const Footer = () => {
  return (
    <FooterContainer>
      <Stack
        align="center"
        justify={["center", "space-between", "flex-end", "flex-end"]}
        direction={["column", "row", "row", "row"]}
        pt={[4, 4, 0, 0]}
      >
        <FooterItem to="/">Home</FooterItem>
        <FooterItem to="/about">About Us</FooterItem>
        <FooterItem to="/services">Services</FooterItem>
        <FooterItem to="/contact">Contact</FooterItem>
        <FooterItem to="/privacy">Privacy Policy</FooterItem>
      </Stack>
    </FooterContainer>
  );
};

const FooterItem = ({
  children,
  to = "/",
  ...rest
}: {
  children: React.ReactNode;
  to?: string;
}) => {
  return (
    <Link href={to}>
      <Text display="block" {...rest}>
        {children}
      </Text>
    </Link>
  );
};

const FooterContainer = ({
  children,
  ...props
}: {
  children: React.ReactNode;
}) => {
  return (
    <Flex
      as="footer"
      align="center"
      justify="space-between"
      wrap="wrap"
      w="100%"
      p={8}
      bg={["primary.500", "primary.500", "transparent", "transparent"]}
      color={["white", "white", "primary.700", "primary.700"]}
      {...props}
    >
      {children}
    </Flex>
  );
};

export default Footer;
