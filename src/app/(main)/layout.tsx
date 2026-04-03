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
      <div className="min-h-[100dvh] bg-background text-foreground">
        <header className="sticky top-0 z-40 border-b border-white/10 bg-[#0b0b0c]/92 backdrop-blur-xl">
          <div className="mx-auto grid max-w-[1400px] grid-cols-[auto_1fr_auto] items-center gap-4 px-4 py-4 sm:px-6 lg:px-8">
            <Link href="/" className="group inline-flex items-center gap-3">
              <span className="relative block h-9 w-9 overflow-hidden rounded-sm border border-white/10 bg-[#111214]">
                <span className="absolute inset-y-0 left-0 w-1.5 bg-[#e10600]" />
                <span className="absolute inset-0 bg-[linear-gradient(135deg,rgba(255,255,255,0.08),transparent_55%)]" />
                <span className="display-font absolute bottom-1.5 right-1.5 text-lg font-extrabold leading-none text-white">
                  BP
                </span>
              </span>
              <span className="display-font text-[1.35rem] font-bold uppercase tracking-[0.08em] text-white transition-colors group-hover:text-[#f5f7fa]">
                Black Pick
              </span>
            </Link>

            <div className="hidden justify-center md:flex">
              <MainNav />
            </div>

            <div className="ml-auto flex items-center gap-2 sm:gap-3">
              <LanguagePicker />
              <Link
                href="/login"
                className="hidden rounded-md border border-white/12 bg-white/[0.03] px-4 py-2 text-sm font-medium text-white/88 transition hover:border-white/20 hover:bg-white/[0.06] hover:text-white sm:inline-flex"
              >
                Log in
              </Link>
              <Link
                href="/signup"
                className="hidden rounded-md bg-[#e10600] px-4 py-2 text-sm font-semibold text-white shadow-[0_10px_24px_rgba(225,6,0,0.28)] transition hover:bg-[#f20f09] sm:inline-flex"
              >
                Sign up
              </Link>
            </div>
          </div>
        </header>

        <main className="mx-auto max-w-[1400px] px-4 pb-28 pt-6 sm:px-6 lg:px-8 lg:pb-12">
          {children}
        </main>

        <nav className="bottom-safe fixed inset-x-0 bottom-0 z-50 border-t border-white/10 bg-[#0d0f11]/96 backdrop-blur-xl md:hidden">
          <MainNav mobile />
        </nav>
      </div>
    </I18nProvider>
  );
}
