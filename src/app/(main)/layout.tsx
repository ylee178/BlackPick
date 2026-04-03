import Link from "next/link";
import type { ReactNode } from "react";
import { I18nProvider } from "@/lib/i18n-provider";
import LanguagePicker from "@/components/LanguagePicker";
import MainNav from "@/components/MainNav";

export default function MainLayout({ children }: { children: ReactNode }) {
  return (
    <I18nProvider>
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
