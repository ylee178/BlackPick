import type { Metadata } from "next";
import "./globals.css";
import DevPanel from "@/components/DevPanel";
import { Geist } from "next/font/google";
import { cn } from "@/lib/utils";
import { getSiteUrl } from "@/lib/env";

const geist = Geist({subsets:['latin'],variable:'--font-sans'});

const siteUrl = getSiteUrl();

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
    index: process.env.NODE_ENV === "production",
    follow: process.env.NODE_ENV === "production",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={cn("font-sans", geist.variable)}>
      <head>
        <link
          rel="preconnect"
          href="https://cdn.jsdelivr.net"
          crossOrigin="anonymous"
        />
        <link
          rel="stylesheet"
          href="https://cdn.jsdelivr.net/npm/pretendard/dist/web/static/pretendard.css"
        />
        <link
          rel="preconnect"
          href="https://fonts.googleapis.com"
          crossOrigin="anonymous"
        />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@500;600;700;800&display=swap"
        />
        <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
        <meta name="theme-color" content="#000000" />
      </head>
      <body>
        {children}
        <DevPanel />
      </body>
    </html>
  );
}
