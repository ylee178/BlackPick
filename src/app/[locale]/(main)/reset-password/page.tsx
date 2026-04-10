"use client";

import { useState } from "react";
import { Link } from "@/i18n/navigation";
import { buildAuthRedirectUrl } from "@/lib/auth-redirect";
import { useI18n } from "@/lib/i18n-provider";
import { createBrowserSupabaseClient } from "@/lib/supabase";
import LoadingButtonContent from "@/components/ui/LoadingButtonContent";
import {
  retroButtonClassName,
  retroFieldClassName,
  retroPanelClassName,
} from "@/components/ui/retro";

export default function ResetPasswordPage() {
  const supabase = createBrowserSupabaseClient();
  const { t, locale } = useI18n();

  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleReset = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: buildAuthRedirectUrl("/update-password", {
        locale,
        fallbackOrigin: window.location.origin,
      }),
    });

    setLoading(false);

    if (resetError) {
      setError(t("auth.resetLinkFailed"));
      return;
    }

    setSent(true);
  };

  return (
    <div className="mx-auto max-w-md">
      <section className={retroPanelClassName({ className: "p-5 sm:p-6" })}>
        <h1 className="text-xl font-bold text-[var(--bp-ink)]">{t("auth.resetPassword")}</h1>
        <p className="mt-1 text-sm text-[var(--bp-muted)]">{t("auth.resetPasswordDescription")}</p>

        {sent ? (
          <div className="mt-5 rounded-[10px] border border-[rgba(34,197,94,0.2)] bg-[rgba(34,197,94,0.08)] px-3.5 py-3 text-sm text-[var(--bp-success)]">
            {t("auth.resetLinkSent")}
          </div>
        ) : (
          <form onSubmit={handleReset} className="mt-5 space-y-4">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-[var(--bp-ink)]">
                {t("auth.email")}
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className={retroFieldClassName("px-3.5 py-2.5")}
                placeholder={t("auth.emailPlaceholder")}
              />
            </div>

            {error ? (
              <div className="rounded-[10px] border border-[rgba(239,68,68,0.2)] bg-[rgba(239,68,68,0.08)] px-3.5 py-2.5 text-sm text-[var(--bp-danger)]">
                {error}
              </div>
            ) : null}

            <button
              type="submit"
              disabled={loading}
              aria-busy={loading}
              className={retroButtonClassName({ variant: "primary", size: "lg", block: true })}
            >
              <LoadingButtonContent loading={loading} loadingLabel={t("auth.sending")}>
                {t("auth.sendResetLink")}
              </LoadingButtonContent>
            </button>
          </form>
        )}

        <p className="mt-4 text-center text-sm text-[var(--bp-muted)]">
          <Link href="/login" className="font-semibold text-[var(--bp-accent)]">
            {t("auth.login")}
          </Link>
        </p>
      </section>
    </div>
  );
}
