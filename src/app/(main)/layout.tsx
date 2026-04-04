import Link from "next/link";
import type { ReactNode } from "react";
import { I18nProvider } from "@/lib/i18n-provider";
import MainNav from "@/components/MainNav";
import LanguagePicker from "@/components/LanguagePicker";
import AccountDropdown from "@/components/AccountDropdown";
import { getLocale, getTranslations } from "@/lib/i18n-server";
import RingNameOnboarding from "@/components/RingNameOnboarding";
import { createSupabaseServer } from "@/lib/supabase-server";
import {
  retroButtonClassName,
} from "@/components/ui/retro";

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
  const { t } = await getTranslations();
  const supabase = await createSupabaseServer();
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();

  const { data: publicUser } = authUser
    ? await supabase
        .from("users")
        .select("ring_name, score, wins, losses")
        .eq("id", authUser.id)
        .maybeSingle()
    : { data: null };

  const needsRingNameOnboarding = Boolean(authUser && !publicUser?.ring_name?.trim());

  return (
    <I18nProvider initialLocale={locale} initialMessages={messages}>
      <div className="min-h-[100dvh] bg-[var(--bp-bg)] text-[var(--bp-ink)]">
        {/* Header */}
        <header className="sticky top-0 z-40 border-b border-[var(--bp-line)] bg-[var(--bp-bg)]">
          <div className="mx-auto flex max-w-[1200px] items-center justify-between gap-3 px-4 py-3 sm:px-6">
            {/* Logo */}
            <Link href="/" className="group flex items-center gap-2.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-[10px] bg-[var(--bp-accent)] text-sm font-extrabold text-[var(--bp-bg)]">
                BP
              </div>
              <span className="text-base font-bold tracking-[-0.01em] text-[var(--bp-ink)] transition group-hover:text-[var(--bp-accent)]">
                Black Pick
              </span>
            </Link>

            {/* Desktop Nav */}
            <div className="hidden lg:flex">
              <MainNav />
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2">
              <LanguagePicker />
              {authUser && publicUser ? (
                <AccountDropdown
                  ringName={publicUser.ring_name?.trim() || authUser.email?.split("@")[0] || "User"}
                  score={publicUser.score ?? 0}
                  wins={publicUser.wins ?? 0}
                  losses={publicUser.losses ?? 0}
                />
              ) : (
                <>
                  <Link
                    href="/login"
                    className={retroButtonClassName({
                      variant: "ghost",
                      size: "sm",
                      className: "hidden sm:inline-flex",
                    })}
                  >
                    {t("nav.login")}
                  </Link>
                  <Link
                    href="/signup"
                    className={retroButtonClassName({
                      variant: "primary",
                      size: "sm",
                      className: "hidden sm:inline-flex",
                    })}
                  >
                    {t("nav.signup")}
                  </Link>
                </>
              )}
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="mx-auto max-w-[1200px] px-4 pb-28 pt-5 sm:px-6 sm:pt-6 lg:pb-10">
          {children}
        </main>

        {needsRingNameOnboarding ? (
          <RingNameOnboarding email={authUser?.email ?? null} />
        ) : null}

        {/* Mobile Tab Bar */}
        <nav className="bottom-safe fixed inset-x-0 bottom-0 z-50 border-t border-[var(--bp-line)] bg-[var(--bp-bg)] md:hidden">
          <div className="mx-auto max-w-md px-2 pb-1">
            <MainNav mobile />
          </div>
        </nav>
      </div>
    </I18nProvider>
  );
}
