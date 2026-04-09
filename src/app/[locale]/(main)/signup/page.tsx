"use client";

import { useState } from "react";
import { Link } from "@/i18n/navigation";
import { useRouter } from "@/i18n/navigation";
import { mapAuthErrorCode, mapAuthErrorMessage } from "@/lib/auth-error";
import { buildAuthRedirectUrl } from "@/lib/auth-redirect";
import { useI18n } from "@/lib/i18n-provider";
import { createBrowserSupabaseClient } from "@/lib/supabase";
import {
  retroButtonClassName,
  retroFieldClassName,
  retroPanelClassName,
} from "@/components/ui/retro";

export default function SignupPage() {
  const router = useRouter();
  const supabase = createBrowserSupabaseClient();
  const { t, locale } = useI18n();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSignup = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoading(true);
    setError(null);

    const normalizedEmail = email.trim().toLowerCase();
    const signupResponse = await fetch("/api/auth/signup", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        email: normalizedEmail,
        password,
      }),
    });

    const signupPayload = (await signupResponse.json().catch(() => null)) as { code?: string } | null;

    if (!signupResponse.ok) {
      setLoading(false);
      setError(mapAuthErrorCode(signupPayload?.code, t));
      return;
    }

    const { error: loginError } = await supabase.auth.signInWithPassword({
      email: normalizedEmail,
      password,
    });

    setLoading(false);

    if (loginError) {
      setError(mapAuthErrorMessage(loginError.message, t));
      return;
    }

    router.push("/");
    router.refresh();
  };

  const handleGoogleSignup = async () => {
    setGoogleLoading(true);
    setError(null);

    const { error: oauthError } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: buildAuthRedirectUrl("/", {
          locale,
          fallbackOrigin: window.location.origin,
        }),
        queryParams: {
          access_type: "offline",
          prompt: "consent",
        },
      },
    });

    if (oauthError) {
      setError(mapAuthErrorMessage(oauthError.message, t));
      setGoogleLoading(false);
    }
  };

  return (
    <div className="mx-auto max-w-md">
      <section className={retroPanelClassName({ className: "p-5 sm:p-6" })}>
        <h1 className="text-xl font-bold text-[var(--bp-ink)]">{t("auth.createAccount")}</h1>
        <p className="mt-1 text-sm text-[var(--bp-muted)]">{t("auth.signupDescription")}</p>

        <form onSubmit={handleSignup} className="mt-5 space-y-4">
          <div>
            <label htmlFor="signup-email" className="mb-1.5 block text-sm font-medium text-[var(--bp-ink)]">
              {t("auth.email")}
            </label>
            <input
              id="signup-email"
              type="email"
              required
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className={retroFieldClassName("px-3.5 py-2.5")}
              placeholder={t("auth.emailPlaceholder")}
            />
          </div>

          <div>
            <label htmlFor="signup-password" className="mb-1.5 block text-sm font-medium text-[var(--bp-ink)]">
              {t("auth.password")}
            </label>
            <input
              id="signup-password"
              type="password"
              required
              minLength={6}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className={retroFieldClassName("px-3.5 py-2.5")}
              placeholder={t("auth.passwordHint")}
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
            className={retroButtonClassName({ variant: "primary", size: "lg", block: true })}
          >
            {loading ? t("auth.creatingAccount") : t("auth.signup")}
          </button>

          <div className="flex items-center gap-3">
            <div className="h-px flex-1 bg-[var(--bp-line)]" />
            <span className="text-xs text-[var(--bp-muted)]">{t("auth.or")}</span>
            <div className="h-px flex-1 bg-[var(--bp-line)]" />
          </div>

          <button
            type="button"
            onClick={handleGoogleSignup}
            disabled={googleLoading}
            className={retroButtonClassName({ variant: "secondary", block: true })}
          >
            <span className="flex items-center justify-center gap-2">
              <svg viewBox="0 0 24 24" className="h-[18px] w-[18px]" aria-hidden="true">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
              </svg>
              {googleLoading ? t("auth.redirecting") : t("auth.googleLogin")}
            </span>
          </button>

          <p className="text-center text-sm text-[var(--bp-muted)]">
            {t("auth.alreadyHaveAccount")}{" "}
            <Link href="/login" className="font-semibold text-[var(--bp-accent)]">
              {t("auth.login")}
            </Link>
          </p>
        </form>
      </section>
    </div>
  );
}
