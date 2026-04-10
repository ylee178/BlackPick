"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import { Link } from "@/i18n/navigation";
import { buildLocalizedAuthPath, getSafeAuthNext } from "@/lib/auth-next";
import { mapAuthErrorCode } from "@/lib/auth-error";
import { useI18n } from "@/lib/i18n-provider";
import SocialAuthButtons from "@/components/auth/SocialAuthButtons";
import LoadingButtonContent from "@/components/ui/LoadingButtonContent";
import {
  retroButtonClassName,
  retroFieldClassName,
  retroPanelClassName,
} from "@/components/ui/retro";

export default function SignupPage() {
  const searchParams = useSearchParams();
  const { t, locale } = useI18n();
  const nextPath = getSafeAuthNext(searchParams.get("next"));

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const handleSignup = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoading(true);
    setError(null);
    setMessage(null);

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

    const signupPayload = (await signupResponse.json().catch(() => null)) as
      | { code?: string; mode?: "signed_in" | "check_email" }
      | null;

    if (!signupResponse.ok) {
      setLoading(false);
      setError(mapAuthErrorCode(signupPayload?.code, t));
      return;
    }

    setLoading(false);

    if (signupPayload?.mode === "signed_in") {
      window.location.assign(nextPath);
      return;
    }

    if (signupPayload?.mode === "check_email") {
      setPassword("");
      setMessage(t("auth.signupCheckEmail"));
      return;
    }

    setError(t("auth.authUnexpected"));
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

          {message ? (
            <div className="rounded-[10px] border border-[rgba(59,130,246,0.18)] bg-[rgba(59,130,246,0.10)] px-3.5 py-2.5 text-sm text-[var(--bp-accent)]">
              {message}
            </div>
          ) : null}

          <button
            type="submit"
            disabled={loading}
            aria-busy={loading}
            className={retroButtonClassName({ variant: "primary", size: "lg", block: true })}
          >
            <LoadingButtonContent loading={loading} loadingLabel={t("auth.creatingAccount")}>
              {t("auth.signup")}
            </LoadingButtonContent>
          </button>

          <div className="flex items-center gap-3">
            <div className="h-px flex-1 bg-[var(--bp-line)]" />
            <span className="text-xs text-[var(--bp-muted)]">{t("auth.or")}</span>
            <div className="h-px flex-1 bg-[var(--bp-line)]" />
          </div>

          <SocialAuthButtons
            redirectTo={nextPath}
            onError={setError}
            onStart={() => {
              setError(null);
              setMessage(null);
            }}
          />

          <p className="text-center text-sm text-[var(--bp-muted)]">
            {t("auth.alreadyHaveAccount")}{" "}
            <Link
              href={buildLocalizedAuthPath("login", locale, nextPath)}
              className="font-semibold text-[var(--bp-accent)]"
            >
              {t("auth.login")}
            </Link>
          </p>
        </form>
      </section>
    </div>
  );
}
