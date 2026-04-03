import type { Metadata } from "next";
import "./globals.css";
import DevPanel from "@/components/DevPanel";

export const metadata: Metadata = {
  title: "Black Pick",
  description: "Fight prediction platform for Black Combat",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        {children}
        <DevPanel />
      </body>
    </html>
  );
}
