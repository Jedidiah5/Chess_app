import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import "./paper-tokens.css";
import "./globals.css";
import { OfflineIndicator, OfflineUploadOnReconnect } from "@/components/offline/OfflineUI";
import { ServiceWorkerRegister } from "@/components/offline/ServiceWorkerRegister";

// Latin subsets self-hosted from Google Fonts so builds never depend on fonts.googleapis.com.
const newsreader = localFont({
  src: [
    { path: "./fonts/newsreader-normal.woff2", weight: "400 700", style: "normal" },
    { path: "./fonts/newsreader-italic.woff2", weight: "400 700", style: "italic" },
  ],
  variable: "--font-newsreader",
  display: "swap",
  adjustFontFallback: "Times New Roman",
});

const cormorant = localFont({
  src: [
    { path: "./fonts/cormorant-normal.woff2", weight: "400 700", style: "normal" },
    { path: "./fonts/cormorant-italic.woff2", weight: "400 700", style: "italic" },
  ],
  variable: "--font-cormorant",
  display: "swap",
  adjustFontFallback: "Times New Roman",
});

const cinzel = localFont({
  src: [{ path: "./fonts/cinzel-normal.woff2", weight: "600 900", style: "normal" }],
  variable: "--font-cinzel",
  display: "swap",
  adjustFontFallback: "Times New Roman",
});

const spaceMono = localFont({
  src: [
    { path: "./fonts/space-mono-400.woff2", weight: "400", style: "normal" },
    { path: "./fonts/space-mono-400-italic.woff2", weight: "400", style: "italic" },
    { path: "./fonts/space-mono-700.woff2", weight: "700", style: "normal" },
    { path: "./fonts/space-mono-700-italic.woff2", weight: "700", style: "italic" },
  ],
  variable: "--font-space-mono",
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
      { url: "/icons/favicon-32.png", sizes: "32x32", type: "image/png" },
      { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [{ url: "/icons/apple-touch-icon.png", sizes: "180x180", type: "image/png" }],
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
