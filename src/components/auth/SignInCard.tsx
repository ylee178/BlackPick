"use client";

import { useMemo, useState } from "react";
import { Link } from "@/i18n/navigation";
import { cn } from "@/lib/utils";
import { mapAuthErrorMessage } from "@/lib/auth-error";
import { useI18n } from "@/lib/i18n-provider";
import { createBrowserSupabaseClient } from "@/lib/supabase";
import SocialAuthButtons from "@/components/auth/SocialAuthButtons";
import LoadingButtonContent from "@/components/ui/LoadingButtonContent";
import {
  retroButtonClassName,
  retroFieldClassName,
  retroPanelClassName,
} from "@/components/ui/retro";

type SignInCardProps = {
  eyebrow?: string;
  title: string;
  description?: string;
  redirectTo?: string;
  showSignupLink?: boolean;
  signupHref?: string;
  className?: string;
  /** Pre-seed the error banner (e.g. from a failed OAuth callback redirect). */
  initialError?: string | null;
};

export default function SignInCard({
  eyebrow,
  title,
  description,
  redirectTo = "/",
  showSignupLink = false,
  signupHref = "/signup",
  className,
  initialError = null,
}: SignInCardProps) {
  const supabase = useMemo(() => createBrowserSupabaseClient(), []);
  const { t } = useI18n();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(initialError);

  const handleLogin = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoading(true);
    setError(null);

    const { error: loginError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    setLoading(false);

    if (loginError) {
      setError(mapAuthErrorMessage(loginError.message, t));
      return;
    }

    window.location.assign(redirectTo);
  };

  return (
    <section className={retroPanelClassName({ className: cn("p-5 sm:p-6", className) })}>
      {eyebrow ? (
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--bp-accent)]">
          {eyebrow}
        </p>
      ) : null}
      <h1 className="mt-2 text-xl font-bold text-[var(--bp-ink)]">{title}</h1>
      {description ? (
        <p className="mt-1 text-sm text-[var(--bp-muted)]">{description}</p>
      ) : null}

      <form onSubmit={handleLogin} className="mt-5 space-y-4">
        <div>
          <label htmlFor="login-email" className="mb-1.5 block text-sm font-medium text-[var(--bp-ink)]">
            {t("auth.email")}
          </label>
          <input
            id="login-email"
            type="email"
            required
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            className={retroFieldClassName("px-3.5 py-2.5")}
            placeholder={t("auth.emailPlaceholder")}
          />
        </div>

        <div>
          <label htmlFor="login-password" className="mb-1.5 block text-sm font-medium text-[var(--bp-ink)]">
            {t("auth.password")}
          </label>
          <input
            id="login-password"
            type="password"
            required
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            className={retroFieldClassName("px-3.5 py-2.5")}
            placeholder={t("auth.passwordPlaceholder")}
          />
        </div>

        <div className="flex justify-end">
          <Link href="/reset-password" className="text-xs text-[var(--bp-muted)] transition hover:text-[var(--bp-accent)]">
            {t("auth.forgotPassword")}
          </Link>
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
          <LoadingButtonContent loading={loading} loadingLabel={t("auth.signingIn")}>
            {t("auth.login")}
          </LoadingButtonContent>
        </button>

        <div className="flex items-center gap-3">
          <div className="h-px flex-1 bg-[var(--bp-line)]" />
          <span className="text-xs text-[var(--bp-muted)]">{t("auth.or")}</span>
          <div className="h-px flex-1 bg-[var(--bp-line)]" />
        </div>

        <SocialAuthButtons
          redirectTo={redirectTo}
          onError={setError}
          onStart={() => setError(null)}
        />

        {showSignupLink ? (
          <p className="text-center text-sm text-[var(--bp-muted)]">
            {t("auth.noAccount")}{" "}
            <Link href={signupHref} className="font-semibold text-[var(--bp-accent)]">
              {t("auth.signup")}
            </Link>
          </p>
        ) : null}
      </form>
    </section>
  );
}
