import type { Metadata, Viewport } from "next";
import { PreferencesProvider } from "@/components/PreferencesProvider";
import { RouteProgress } from "@/components/RouteProgress";
import "./globals.css";

export const metadata: Metadata = {
  title: "Saans — a family air copilot for smog season",
  description:
    "A location-aware assistant that turns severe winter smog into a practical, low-emission daily plan for families and communities.",
  applicationName: "Saans",
  authors: [{ name: "Saans" }],
  keywords: [
    "air quality",
    "winter smog",
    "PM2.5",
    "family health",
    "sustainable living",
    "Indo-Gangetic plain",
  ],
  openGraph: {
    title: "Saans — a family air copilot",
    description:
      "A clearer day, one choice at a time. Practical, location-aware plans for smoky seasons.",
    type: "website",
  },
  manifest: "/manifest.webmanifest",
  icons: {
    icon: [{ url: "/icon.svg", type: "image/svg+xml" }],
    apple: [{ url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" }],
  },
  appleWebApp: {
    capable: true,
    title: "Saans",
    statusBarStyle: "default",
  },
  robots: { index: true, follow: true },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#f4efe4",
  colorScheme: "light",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" data-scroll-behavior="smooth">
      <body>
        <PreferencesProvider>
          <RouteProgress />
          {children}
        </PreferencesProvider>
      </body>
    </html>
  );
}
