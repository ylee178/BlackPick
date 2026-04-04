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
    case "ko": return (await import("@/messages/ko.json")).default;
    case "ja": return (await import("@/messages/ja.json")).default;
    case "pt-BR": return (await import("@/messages/pt-BR.json")).default;
    default: return (await import("@/messages/en.json")).default;
  }
}

export default async function MainLayout({ children }: { children: ReactNode }) {
  const locale = await getLocale();
  const messages = await loadMessages(locale);

  return (
    <I18nProvider initialLocale={locale} initialMessages={messages}>
      <div className="min-h-[100dvh] bg-black text-white">
        {/* Header */}
        <header className="sticky top-0 z-40 bg-black/90 backdrop-blur-xl">
          <div className="gold-line" />
          <div className="mx-auto flex max-w-7xl items-center justify-between px-5 py-5 sm:px-8">
            {/* Logo */}
            <Link href="/" className="group flex items-center gap-3">
              <div className="relative flex h-10 w-10 items-center justify-center">
                <div className="absolute inset-0 rotate-45 border border-[#ffba3c]/40" />
                <span
                  className="relative text-lg font-black text-[#ffba3c]"
                  style={{ fontFamily: "var(--font-display)" }}
                >
                  BP
                </span>
              </div>
              <div>
                <span
                  className="block text-lg font-bold uppercase tracking-[0.15em] text-white group-hover:text-[#ffba3c] transition"
                  style={{ fontFamily: "var(--font-display)" }}
                >
                  Black Pick
                </span>
                <span className="block text-[9px] uppercase tracking-[0.3em] text-[#ffba3c]/60">
                  Who Is The Pick?
                </span>
              </div>
            </Link>

            {/* Center Nav */}
            <div className="hidden md:flex">
              <MainNav />
            </div>

            {/* Right */}
            <div className="flex items-center gap-3">
              <LanguagePicker />
              <Link
                href="/login"
                className="hidden rounded border border-white/10 px-5 py-2 text-sm font-medium text-white/70 transition hover:border-[#ffba3c]/30 hover:text-white sm:inline-flex"
              >
                Log in
              </Link>
              <Link
                href="/signup"
                className="hidden rounded bg-[#ffba3c] px-5 py-2 text-sm font-bold text-black transition hover:bg-[#ffd06b] sm:inline-flex"
              >
                Sign up
              </Link>
            </div>
          </div>
        </header>

        {/* Main */}
        <main className="mx-auto max-w-7xl px-5 pb-28 pt-8 sm:px-8 lg:pb-12">
          {children}
        </main>

        {/* Mobile tab bar */}
        <nav className="bottom-safe fixed inset-x-0 bottom-0 z-50 border-t border-[#ffba3c]/10 bg-black/95 backdrop-blur-xl md:hidden">
          <MainNav mobile />
        </nav>
      </div>
    </I18nProvider>
  );
}
