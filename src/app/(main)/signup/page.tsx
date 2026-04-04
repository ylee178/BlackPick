"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { mapAuthErrorCode, mapAuthErrorMessage } from "@/lib/auth-error";
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
  const { t } = useI18n();

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

    const origin = window.location.origin;
    const { error: oauthError } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${origin}/`,
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
            <label className="mb-1.5 block text-sm font-medium text-[var(--bp-ink)]">
              {t("auth.email")}
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className={retroFieldClassName("px-3.5 py-2.5")}
              placeholder={t("auth.emailPlaceholder")}
            />
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-[var(--bp-ink)]">
              {t("auth.password")}
            </label>
            <input
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
            className={retroButtonClassName({ variant: "ghost", block: true })}
          >
            {googleLoading ? t("auth.redirecting") : t("auth.googleLogin")}
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
