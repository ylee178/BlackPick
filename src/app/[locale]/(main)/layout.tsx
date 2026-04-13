import { Link } from "@/i18n/navigation";
import type { ReactNode } from "react";
import MainNav from "@/components/MainNav";
import NotificationBell from "@/components/NotificationBell";
import LanguagePicker from "@/components/LanguagePicker";
import AccountDropdown from "@/components/AccountDropdown";
import { getTranslations } from "@/lib/i18n-server";
import RingNameOnboarding from "@/components/RingNameOnboarding";
import { ToastProvider } from "@/components/Toast";
import { isAdminUser } from "@/lib/admin-auth";
import { createSupabaseServer } from "@/lib/supabase-server";
import {
  retroButtonClassName,
} from "@/components/ui/retro";

export default async function MainLayout({ children }: { children: ReactNode }) {
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
  const isAdmin = authUser ? await isAdminUser(authUser) : false;

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
