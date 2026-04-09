import "./globals.css";
import { Geist } from "next/font/google";
import { Home } from "lucide-react";
import type { Metadata } from "next";

const geist = Geist({ subsets: ["latin"], variable: "--font-sans" });

export const metadata: Metadata = {
  title: "404 — K.O. | Black Pick",
  description: "Page not found.",
};

export default function GlobalNotFound() {
  return (
    <html lang="en" className={`font-sans ${geist.variable}`}>
      <head>
        <link rel="preconnect" href="https://cdn.jsdelivr.net" crossOrigin="anonymous" />
        <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/pretendard/dist/web/static/pretendard.css" />
        <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
        <meta name="theme-color" content="#000000" />
      </head>
      <body>
        <div className="flex min-h-dvh flex-col items-center justify-center bg-[var(--bp-bg)] px-4 text-center">
          {/* LCD 404 — bigger than FlipTimer */}
          <div className="rounded-[16px] bg-[#060606] px-8 py-8 sm:px-12 sm:py-10">
            <div className="flex items-center justify-center gap-3 sm:gap-4">
              <div className="lcd-digit-404">
                <span>4</span>
              </div>
              <div className="lcd-digit-404">
                <span>0</span>
              </div>
              <div className="lcd-digit-404">
                <span>4</span>
              </div>
            </div>
          </div>

          <p className="mt-6 text-lg font-bold text-[var(--bp-ink)]">
            Wrong corner. No fight here.
          </p>
          <p className="mt-1 text-sm text-[var(--bp-muted)]">
            The page you are looking for does not exist.
          </p>

          <div className="mt-8">
            <a
              href="/"
              className="inline-flex cursor-pointer items-center gap-2 rounded-[12px] bg-[var(--bp-accent)] px-6 py-3 text-sm font-bold text-black transition-all hover:opacity-90"
            >
              <Home className="h-4 w-4" strokeWidth={2} />
              Back to the ring
            </a>
          </div>
        </div>
      </body>
    </html>
  );
}
