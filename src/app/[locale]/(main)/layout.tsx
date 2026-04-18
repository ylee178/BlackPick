import { Link } from "@/i18n/navigation";
import type { ReactNode } from "react";
import MainNav from "@/components/MainNav";
import NotificationBell from "@/components/NotificationBell";
import LanguagePicker from "@/components/LanguagePicker";
import AccountDropdown from "@/components/AccountDropdown";
import { getTranslations } from "@/lib/i18n-server";
import RingNameOnboarding from "@/components/RingNameOnboarding";
import StreakPrToast from "@/components/StreakPrToast";
import { ToastProvider } from "@/components/Toast";
import { isAdminUser } from "@/lib/admin-auth";
import { createSupabaseServer } from "@/lib/supabase-server";
import {
  retroButtonClassName,
} from "@/components/ui/retro";

// 2026-04-14: force dynamic so `publicUser` (ring_name / streak /
// score) re-fetches on every request. Without this, DevPanel's
// "온보딩 다시 보기" action can't trigger `RingNameOnboarding`
// because the layout's `publicUser.ring_name` stays cached at the
// prior value and `needsRingNameOnboarding` never flips to true.
export const dynamic = "force-dynamic";

export default async function MainLayout({ children }: { children: ReactNode }) {
  const { t } = await getTranslations();
  const supabase = await createSupabaseServer();
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();

  const { data: publicUser } = authUser
    ? await supabase
        .from("users")
        .select("ring_name, score, wins, losses, current_streak, best_streak")
        .eq("id", authUser.id)
        .maybeSingle()
    : { data: null };
  const isAdmin = authUser ? await isAdminUser(authUser) : false;

  // OAuth-only accounts (Google / Facebook) have no password to rotate.
  // Supabase exposes the provider list via `identities` — the "email"
  // identity is present iff the user registered with email+password or
  // later linked one. Used to gate the "Change password" menu item.
  const hasPassword = Boolean(
    authUser?.identities?.some((i) => i.provider === "email"),
  );

  const needsRingNameOnboarding = Boolean(authUser && !publicUser?.ring_name?.trim());

  return (
      <ToastProvider>
      <div className="flex min-h-[100dvh] flex-col bg-[var(--bp-bg)] text-[var(--bp-ink)]">
        <a href="#main-content" className="sr-only focus:not-sr-only focus:absolute focus:z-50 focus:bg-[var(--bp-bg)] focus:px-4 focus:py-2 focus:text-[var(--bp-ink)]">
          Skip to main content
        </a>
        {/* Header */}
        <header id="main-header" className="sticky top-0 z-40 border-b border-[var(--bp-line)] bg-[var(--bp-bg-translucent)] backdrop-blur-xl">
          <div className="mx-auto flex max-w-[1200px] items-center justify-between gap-3 px-4 py-3 sm:px-6">
            {/* Logo */}
            <Link href="/" className="group flex items-center">
              <img
                src="/bp-logo.svg"
                alt="Black Pick"
                className="h-9 transition group-hover:opacity-80"
              />
            </Link>

            {/* Desktop Nav */}
            <div className="hidden lg:flex">
              <MainNav />
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2">
              <LanguagePicker />
              {authUser ? <NotificationBell /> : null}
              {authUser && publicUser ? (
                <AccountDropdown
                  ringName={publicUser.ring_name?.trim() || authUser.email?.split("@")[0] || "User"}
                  score={publicUser.score ?? 0}
                  wins={publicUser.wins ?? 0}
                  losses={publicUser.losses ?? 0}
                  isAdmin={isAdmin}
                  hasPassword={hasPassword}
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
        <main id="main-content" className="mx-auto flex w-full max-w-[1200px] flex-1 flex-col px-4 pb-28 pt-10 sm:px-6 lg:pb-10">
          {children}
        </main>

        {/* Footer */}
        <footer className="hidden lg:block border-t border-[var(--bp-line)] py-6">
          <div className="mx-auto max-w-[1200px] flex items-center justify-between px-4 sm:px-6 text-xs text-[var(--bp-muted)]">
            <span>&copy; {new Date().getFullYear()} BlackPick</span>
            <div className="flex items-center gap-4">
              <Link href="/terms" className="hover:text-[var(--bp-ink)] transition-colors cursor-pointer">
                {t("nav.terms")}
              </Link>
              <Link href="/privacy" className="hover:text-[var(--bp-ink)] transition-colors cursor-pointer">
                {t("nav.privacy")}
              </Link>
            </div>
          </div>
        </footer>

        {needsRingNameOnboarding && authUser ? (
          <RingNameOnboarding email={authUser.email ?? null} userId={authUser.id} />
        ) : null}

        {authUser && publicUser ? (
          <StreakPrToast
            userId={authUser.id}
            currentStreak={publicUser.current_streak ?? 0}
            bestStreak={publicUser.best_streak ?? 0}
          />
        ) : null}

        {/* Mobile Tab Bar */}
        <nav aria-label="Mobile navigation" className="bottom-safe fixed inset-x-0 bottom-0 z-50 border-t border-[var(--bp-line)] bg-[var(--bp-bg)] md:hidden">
          <div className="mx-auto max-w-md px-2 pb-1">
            <MainNav mobile />
          </div>
        </nav>
      </div>
      </ToastProvider>
  );
}
