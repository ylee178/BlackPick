import Link from "next/link";
import type { ReactNode } from "react";
import { I18nProvider } from "@/lib/i18n-provider";
import MainNav from "@/components/MainNav";
import LanguagePicker from "@/components/LanguagePicker";
import { getLocale } from "@/lib/i18n-server";
import RingNameOnboarding from "@/components/RingNameOnboarding";
import { createSupabaseServer } from "@/lib/supabase-server";
import {
  retroButtonClassName,
  retroInsetClassName,
  retroPanelClassName,
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
  const supabase = await createSupabaseServer();
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();

  const { data: publicUser } = authUser
    ? await supabase
        .from("users")
        .select("ring_name")
        .eq("id", authUser.id)
        .maybeSingle()
    : { data: null };

  const needsRingNameOnboarding = Boolean(authUser && !publicUser?.ring_name?.trim());

  return (
    <I18nProvider initialLocale={locale} initialMessages={messages}>
      <div className="min-h-[100dvh] bg-[var(--retro-bg)] text-[var(--retro-ink)]">
        {/* Header */}
        <header className="sticky top-0 z-40 px-4 pt-4 sm:px-8">
          <div
            className={retroPanelClassName({
              tone: "muted",
              className:
                "retro-grid mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-4 backdrop-blur-xl sm:px-5",
            })}
          >
            {/* Logo */}
            <Link href="/" className="group flex items-center gap-3">
              <div className={retroInsetClassName("flex h-11 w-11 items-center justify-center")}>
                <span
                  className="relative text-lg font-black text-[var(--retro-accent)]"
                  style={{ fontFamily: "var(--font-display)" }}
                >
                  BP
                </span>
              </div>
              <div>
                <span
                  className="block text-lg font-bold uppercase tracking-[0.15em] text-[var(--retro-ink)] transition group-hover:text-[var(--retro-accent)]"
                  style={{ fontFamily: "var(--font-display)" }}
                >
                  Black Pick
                </span>
                <span className="block text-[9px] uppercase tracking-[0.3em] text-[var(--retro-muted)]">
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
              {authUser ? (
                <Link
                  href="/profile"
                  className={retroButtonClassName({
                    variant: "ghost",
                    size: "sm",
                    className: "hidden sm:inline-flex",
                  })}
                >
                  {publicUser?.ring_name?.trim() || authUser.email?.split("@")[0] || "Profile"}
                </Link>
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
                    Log in
                  </Link>
                  <Link
                    href="/signup"
                    className={retroButtonClassName({
                      variant: "primary",
                      size: "sm",
                      className: "hidden sm:inline-flex",
                    })}
                  >
                    Sign up
                  </Link>
                </>
              )}
            </div>
          </div>
        </header>

        {/* Main */}
        <main className="mx-auto max-w-7xl px-4 pb-32 pt-6 sm:px-8 lg:pb-12">
          {children}
        </main>

        {needsRingNameOnboarding ? (
          <RingNameOnboarding email={authUser?.email ?? null} />
        ) : null}

        {/* Mobile tab bar */}
        <nav className="bottom-safe fixed inset-x-0 bottom-0 z-50 px-3 pb-3 md:hidden">
          <MainNav mobile />
        </nav>
      </div>
    </I18nProvider>
  );
}
