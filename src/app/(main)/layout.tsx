import Link from "next/link";
import type { ReactNode } from "react";
import { I18nProvider } from "@/lib/i18n-provider";
import LanguagePicker from "@/components/LanguagePicker";
import MainNav from "@/components/MainNav";
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
      <div className="min-h-screen bg-gray-950 text-white">
        <header className="border-b border-gray-800 bg-gray-950/95 backdrop-blur supports-[backdrop-filter]:bg-gray-950/80">
          <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-4 sm:px-6 lg:px-8">
            <Link
              href="/"
              className="text-lg font-bold tracking-wide text-white transition hover:text-amber-400"
            >
              <span className="text-amber-400">Black</span> Pick
            </Link>

            <div className="flex items-center gap-3 sm:gap-6">
              <MainNav />
              <LanguagePicker />
            </div>
          </div>
        </header>

        <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">{children}</main>
      </div>
    </I18nProvider>
  );
}
