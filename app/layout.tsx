import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Project LIFE",
  description: "毎日の予定と生活リズムを管理するLifeOS",
  applicationName: "Project LIFE",
  manifest: "/manifest.json",
  icons: {
    icon: [
      {
        url: "/favicon.ico?v=20260714-1",
        sizes: "any",
        type: "image/x-icon",
      },
      {
        url: "/favicon-32x32.png?v=20260714-1",
        sizes: "32x32",
        type: "image/png",
      },
      {
        url: "/favicon-16x16.png?v=20260714-1",
        sizes: "16x16",
        type: "image/png",
      },
      {
        url: "/icon-192.png?v=20260714-1",
        sizes: "192x192",
        type: "image/png",
      },
      {
        url: "/icon-512.png?v=20260714-1",
        sizes: "512x512",
        type: "image/png",
      },
    ],
    apple: [
      {
        url: "/apple-touch-icon.png?v=20260714-1",
        sizes: "180x180",
        type: "image/png",
      },
    ],
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "LifeOS",
  },
  other: {
    "apple-mobile-web-app-capable": "yes",
  },
};

export const viewport: Viewport = {
  themeColor: "#0f172a",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
