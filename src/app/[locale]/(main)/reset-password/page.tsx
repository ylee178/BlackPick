"use client";

import { useEffect, useState } from "react";
import { Link } from "@/i18n/navigation";
import { buildAuthRedirectUrl } from "@/lib/auth-redirect";
import { useI18n } from "@/lib/i18n-provider";
import { createBrowserSupabaseClient } from "@/lib/supabase";
import CheckEmailCard from "@/components/auth/CheckEmailCard";
import LoadingButtonContent from "@/components/ui/LoadingButtonContent";
import {
  retroButtonClassName,
  retroFieldClassName,
  retroPanelClassName,
} from "@/components/ui/retro";

type Stage =
  | { kind: "form" }
  | { kind: "check-email"; email: string };

export default function ResetPasswordPage() {
  const supabase = createBrowserSupabaseClient();
  const { t, locale } = useI18n();

  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [stage, setStage] = useState<Stage>({ kind: "form" });
  const [error, setError] = useState<string | null>(null);

  // If the page opens while the user is signed in (reached via the
  // AccountDropdown "Change password" link), prefill + lock the email
  // field — the flow targets the account they're logged into. For
  // logged-out visitors coming from /login "Forgot password?", the field
  // stays editable.
  const [signedInEmail, setSignedInEmail] = useState<string | null>(null);
  const [sessionLoaded, setSessionLoaded] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (cancelled) return;
      if (user?.email) {
        setSignedInEmail(user.email);
        setEmail(user.email);
      }
      setSessionLoaded(true);
    })();
    return () => {
      cancelled = true;
    };
  }, [supabase]);

  const handleReset = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const normalizedEmail = email.trim().toLowerCase();

    const { error: resetError } = await supabase.auth.resetPasswordForEmail(
      normalizedEmail,
      {
        redirectTo: buildAuthRedirectUrl("/update-password", {
          locale,
          fallbackOrigin: window.location.origin,
          preferFallbackOrigin: true,
        }),
      },
    );

    setLoading(false);

    if (resetError) {
      setError(t("auth.resetLinkFailed"));
      return;
    }

    setStage({ kind: "check-email", email: normalizedEmail });
  };

  const handleStartOver = () => {
    setStage({ kind: "form" });
    setError(null);
  };

  if (stage.kind === "check-email") {
    return (
      <div className="flex w-full flex-1 items-center justify-center">
        <CheckEmailCard
          email={stage.email}
          variant="reset"
          onStartOver={handleStartOver}
        />
      </div>
    );
  }

  const isSignedIn = Boolean(signedInEmail);
  const title = isSignedIn ? t("auth.changePassword") : t("auth.resetPassword");
  const description = isSignedIn
    ? t("auth.changePasswordDescription")
    : t("auth.resetPasswordDescription");
  const submitLabel = isSignedIn
    ? t("auth.sendChangeLink")
    : t("auth.sendResetLink");

  return (
    <div className="flex w-full flex-1 items-center justify-center">
      <section className={retroPanelClassName({ className: "w-full max-w-md p-5 sm:p-6" })}>
        <h1 className="text-xl font-bold text-[var(--bp-ink)]">{title}</h1>
        <p className="mt-1 text-sm text-[var(--bp-muted)]">{description}</p>

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
              readOnly={isSignedIn}
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
            disabled={loading || !sessionLoaded}
            aria-busy={loading}
            className={retroButtonClassName({ variant: "primary", size: "lg", block: true })}
          >
            <LoadingButtonContent loading={loading} loadingLabel={t("auth.sending")}>
              {submitLabel}
            </LoadingButtonContent>
          </button>
        </form>

        {!isSignedIn ? (
          <p className="mt-4 text-center text-sm text-[var(--bp-muted)]">
            <Link href="/login" className="font-semibold text-[var(--bp-accent)]">
              {t("auth.login")}
            </Link>
          </p>
        ) : null}
      </section>
    </div>
  );
}
