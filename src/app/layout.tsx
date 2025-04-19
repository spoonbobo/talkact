import type { Metadata } from "next";
import { Roboto, Space_Mono } from "next/font/google";
import "./globals.css";
import Providers from "@/providers/providers";
import { NextIntlClientProvider, hasLocale } from "next-intl";

const roboto = Roboto({
  weight: '400',
  subsets: ['latin'],
})

const space_mono = Space_Mono({
  weight: '400',
  subsets: ['latin'],
})

export const metadata: Metadata = {
  title: "onlysaid",
  description: "onlysaid",
};

export default function RootLayout({
  children,
  session,
}: Readonly<{
  children: React.ReactNode;
  session: any;
}>) {
  return (
    <html suppressHydrationWarning>
      <body
        className={`antialiased`}
      >
        <NextIntlClientProvider>
          <Providers session={session}>{children}</Providers>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
