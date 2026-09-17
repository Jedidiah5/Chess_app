import type { Metadata, Viewport } from "next";
import "./globals.css";
import { OfflineIndicator, OfflineUploadOnReconnect } from "@/components/offline/OfflineUI";
import { ServiceWorkerRegister } from "@/components/offline/ServiceWorkerRegister";

export const metadata: Metadata = {
  title: "Chess",
  description: "Multiplayer chess",
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
  themeColor: "#2c2a26",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body suppressHydrationWarning>
        <OfflineIndicator />
        <OfflineUploadOnReconnect />
        <ServiceWorkerRegister />
        {children}
      </body>
    </html>
  );
}
