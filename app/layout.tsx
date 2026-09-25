import type { Metadata, Viewport } from "next";
import {
  Cinzel,
  Cormorant_Garamond,
  Newsreader,
  Space_Mono,
} from "next/font/google";
import "./paper-tokens.css";
import "./globals.css";
import { OfflineIndicator, OfflineUploadOnReconnect } from "@/components/offline/OfflineUI";
import { ServiceWorkerRegister } from "@/components/offline/ServiceWorkerRegister";

const newsreader = Newsreader({
  subsets: ["latin"],
  weight: ["400", "600"],
  style: ["normal"],
  variable: "--font-newsreader",
  display: "swap",
  preload: true,
});

const cormorant = Cormorant_Garamond({
  subsets: ["latin"],
  weight: ["600"],
  style: ["normal"],
  variable: "--font-cormorant",
  display: "swap",
  preload: true,
});

const cinzel = Cinzel({
  subsets: ["latin"],
  weight: ["600"],
  variable: "--font-cinzel",
  display: "swap",
  preload: false,
});

const spaceMono = Space_Mono({
  subsets: ["latin"],
  weight: ["400", "700"],
  style: ["normal"],
  variable: "--font-space-mono",
  display: "swap",
  preload: true,
});

export const metadata: Metadata = {
  title: "Chess",
  description: "Classic paper-and-ink chess — online, vs computer, or pass and play.",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Chess",
  },
  icons: {
    icon: [
      { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [{ url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" }],
  },
};

export const viewport: Viewport = {
  themeColor: "#1F1915",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${newsreader.variable} ${cormorant.variable} ${cinzel.variable} ${spaceMono.variable}`}
      suppressHydrationWarning
    >
      <body suppressHydrationWarning>
        <OfflineIndicator />
        <OfflineUploadOnReconnect />
        <ServiceWorkerRegister />
        {children}
      </body>
    </html>
  );
}
