import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  subsets: ["latin"],
  variable: "--font-geist-sans",
  display: "swap",
});

const geistMono = Geist_Mono({
  subsets: ["latin"],
  variable: "--font-geist-mono",
  display: "swap",
});

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://12minutesdaily.com";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "12 Minutes Daily — CLAT Current Affairs in 12 Minutes a Day",
    template: "%s · 12 Minutes Daily",
  },
  description:
    "12 shorts, 12 quiz questions, one daily battle. Master CLAT current affairs in 12 minutes a day. A 12 Minutes to CLAT product.",
  manifest: "/manifest.json",
  keywords: ["CLAT", "current affairs", "legal reasoning", "CLAT preparation", "law entrance"],
  openGraph: {
    type: "website",
    siteName: "12 Minutes Daily",
    title: "12 Minutes Daily — CLAT Current Affairs in 12 Minutes a Day",
    description:
      "12 shorts, 12 quiz questions, one daily battle. Master CLAT current affairs in 12 minutes a day.",
    url: SITE_URL,
  },
  twitter: {
    card: "summary_large_image",
    title: "12 Minutes Daily — CLAT Current Affairs in 12 Minutes a Day",
    description: "Master CLAT current affairs in 12 minutes a day.",
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "12 Minutes Daily",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#283593",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}>
      <body className="min-h-full font-sans">{children}</body>
    </html>
  );
}
