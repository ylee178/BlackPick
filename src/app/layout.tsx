import type { Metadata } from "next";
import "./globals.css";
import { getSiteUrl } from "@/lib/env";
import { isProductionApp } from "@/lib/app-env";

const siteUrl = getSiteUrl();
const shouldIndex = isProductionApp();

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "Black Pick — Who Is The Pick?",
    template: "%s | Black Pick",
  },
  description: "Black Combat fight prediction platform. Predict fights, build your record, prove you know the game.",
  openGraph: {
    type: "website",
    siteName: "Black Pick",
    title: "Black Pick — Who Is The Pick?",
    description: "Black Combat fight prediction platform. Predict fights, build your record.",
    url: siteUrl,
    images: [{ url: "/og/default.png", width: 1200, height: 630, alt: "Black Pick" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Black Pick — Who Is The Pick?",
    description: "Black Combat fight prediction platform.",
    images: ["/og/default.png"],
  },
  robots: {
    index: shouldIndex,
    follow: shouldIndex,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // html/body is rendered by [locale]/layout.tsx for dynamic lang attribute
  return children;
}
