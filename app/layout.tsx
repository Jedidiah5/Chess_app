import type { Metadata, Viewport } from "next";
import { Newsreader } from "next/font/google";
import "./paper-tokens.css";
import "./globals.css";
import { OfflineIndicator, OfflineUploadOnReconnect } from "@/components/offline/OfflineUI";
import { ServiceWorkerRegister } from "@/components/offline/ServiceWorkerRegister";

const newsreader = Newsreader({
  subsets: ["latin"],
  weight: ["400", "600"],
  variable: "--font-newsreader",
  display: "swap",
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
  themeColor: "#2c2419",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={newsreader.variable} suppressHydrationWarning>
      <body suppressHydrationWarning>
        <OfflineIndicator />
        <OfflineUploadOnReconnect />
        <ServiceWorkerRegister />
        {children}
      </body>
    </html>
  );
}
