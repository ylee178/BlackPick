import type { Metadata } from "next";
import "./globals.css";
import DevPanel from "@/components/DevPanel";

export const metadata: Metadata = {
  title: "Black Pick — Who Is The Pick?",
  description: "Black Combat fight prediction platform. Predict fights, build your record, prove you know the game.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
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
