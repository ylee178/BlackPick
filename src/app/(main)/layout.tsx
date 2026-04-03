import Link from "next/link";
import type { ReactNode } from "react";
import { I18nProvider } from "@/lib/i18n-provider";
import MainNav from "@/components/MainNav";
import LanguagePicker from "@/components/LanguagePicker";
import { getLocale } from "@/lib/i18n-server";

interface Messages {
  [key: string]: string | Messages;
}

async function loadMessages(locale: "en" | "ko" | "ja" | "pt-BR"): Promise<Messages> {
  switch (locale) {
    case "ko":
      return (await import("@/messages/ko.json")).default;
    case "ja":
      return (await import("@/messages/ja.json")).default;
    case "pt-BR":
      return (await import("@/messages/pt-BR.json")).default;
    case "en":
    default:
      return (await import("@/messages/en.json")).default;
  }
}

export default async function MainLayout({ children }: { children: ReactNode }) {
  const locale = await getLocale();
  const messages = await loadMessages(locale);

  return (
    <I18nProvider initialLocale={locale} initialMessages={messages}>
      <div className="min-h-[100dvh] bg-black text-white">
        {/* Header */}
        <header className="sticky top-0 z-40 border-b border-white/8 bg-black/95 backdrop-blur-xl">
          <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-4 sm:px-6 lg:px-8">
            {/* Logo */}
            <Link href="/" className="flex items-center gap-2">
              <span
                className="text-xl font-black uppercase tracking-wider text-[#ffba3c]"
                style={{ fontFamily: "var(--font-display)" }}
              >
                Black Pick
              </span>
            </Link>

            {/* Center Nav (desktop) */}
            <div className="hidden md:flex">
              <MainNav />
            </div>

            {/* Right: Lang + Auth */}
            <div className="flex items-center gap-3">
              <LanguagePicker />
              <Link
                href="/login"
                className="hidden rounded-lg border border-white/12 px-4 py-2 text-sm font-medium text-white/80 transition hover:border-[#ffba3c]/30 hover:text-white sm:inline-flex"
              >
                Log in
              </Link>
              <Link
                href="/signup"
                className="hidden rounded-lg bg-[#ffba3c] px-4 py-2 text-sm font-bold text-black transition hover:bg-[#ffc85c] sm:inline-flex"
              >
                Sign up
              </Link>
            </div>
          </div>
        </header>

        {/* Main */}
        <main className="mx-auto max-w-7xl px-4 pb-28 pt-6 sm:px-6 lg:px-8 lg:pb-12">
          {children}
        </main>

        {/* Mobile tab bar */}
        <nav className="bottom-safe fixed inset-x-0 bottom-0 z-50 border-t border-white/8 bg-black/95 backdrop-blur-xl md:hidden">
          <MainNav mobile />
        </nav>
      </div>
    </I18nProvider>
  );
}
