"use client";

import { useEffect, useState } from "react";
import { ExternalLink, Info, Mail } from "lucide-react";
import { useI18n } from "@/lib/i18n-provider";
import {
  retroButtonClassName,
  retroPanelClassName,
} from "@/components/ui/retro";
import { detectEmailProvider } from "@/lib/email-provider";
import { buildAuthRedirectUrl } from "@/lib/auth-redirect";
import { createBrowserSupabaseClient } from "@/lib/supabase";
import type { Locale } from "@/i18n/locales";

type Variant = "signup" | "reset";

type Props = {
  email: string;
  variant: Variant;
  onStartOver: () => void;
};

type ResendState = "idle" | "sending" | "sent" | "error";

// Client-side cooldowns. Belt-and-braces on top of Supabase's per-address
// cooldown (~60s) and, for the signup variant, the server route's
// 3/5min per (IP, email) rate-limit.
const SUCCESS_COOLDOWN_SECONDS = 60;
const ERROR_COOLDOWN_SECONDS = 30;

export default function CheckEmailCard({ email, variant, onStartOver }: Props) {
  const { t, locale } = useI18n();
  const provider = detectEmailProvider(email);
  const [resend, setResend] = useState<ResendState>("idle");
  const [cooldown, setCooldown] = useState(0);

  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setTimeout(() => setCooldown((c) => Math.max(0, c - 1)), 1000);
    return () => clearTimeout(timer);
  }, [cooldown]);

  const resendDisabled = resend === "sending" || cooldown > 0;

  const handleResend = async () => {
    if (resendDisabled) return;
    setResend("sending");
    try {
      const ok =
        variant === "signup"
          ? await resendSignup(email)
          : await resendReset(email, locale);
      if (ok) {
        setResend("sent");
        setCooldown(SUCCESS_COOLDOWN_SECONDS);
      } else {
        setResend("error");
        setCooldown(ERROR_COOLDOWN_SECONDS);
      }
    } catch {
      setResend("error");
      setCooldown(ERROR_COOLDOWN_SECONDS);
    }
  };

  const resendLabel = (() => {
    if (cooldown > 0) return t("auth.verifyResendCooldown", { seconds: cooldown });
    if (resend === "sending") return t("auth.verifyResending");
    if (resend === "sent") return t("auth.verifyResent");
    if (resend === "error") return t("auth.verifyResendError");
    return t("auth.verifyResend");
  })();

  const sentToLabel =
    variant === "reset" ? t("auth.verifyResetSentTo") : t("auth.verifySentTo");

  return (
    <section
      className={retroPanelClassName({
        className: "w-full max-w-md p-6 sm:p-7 text-center",
      })}
    >
      <div className="mx-auto inline-flex h-16 w-16 items-center justify-center rounded-full border border-[var(--bp-line)] bg-[var(--bp-card-inset)]">
        <Mail className="h-8 w-8 text-[var(--bp-accent)]" aria-hidden="true" />
      </div>

      <h1 className="mt-5 text-xl font-bold text-[var(--bp-ink)]">
        {t("auth.verifyTitle")}
      </h1>
      <p className="mt-2 text-sm text-[var(--bp-muted)]">{sentToLabel}</p>
      <p className="mt-1 break-all text-base font-semibold text-[var(--bp-ink)]">
        {email}
      </p>

      <p className="mt-3 text-xs text-[var(--bp-muted)]">
        {t("auth.verifyNotReceivedPrefix")}{" "}
        <button
          type="button"
          onClick={handleResend}
          disabled={resendDisabled}
          className="inline cursor-pointer font-semibold text-[var(--bp-accent)] transition hover:underline disabled:cursor-not-allowed disabled:opacity-60 disabled:no-underline"
        >
          {resendLabel}
        </button>
      </p>

      <a
        href={provider?.webmailUrl ?? "mailto:"}
        target="_blank"
        rel="noreferrer noopener"
        className={retroButtonClassName({
          variant: "primary",
          size: "lg",
          block: true,
          className: "mt-5 gap-2",
        })}
      >
        <ExternalLink className="h-4 w-4" aria-hidden="true" />
        {t("auth.verifyOpenInbox")}
      </a>

      <button
        type="button"
        onClick={onStartOver}
        className="mt-3 inline-flex cursor-pointer items-center justify-center text-xs font-semibold text-[var(--bp-muted)] transition hover:text-[var(--bp-ink)]"
      >
        {t("auth.verifyUseDifferentEmail")}
      </button>

      <div className="mt-6 inline-flex items-start justify-center gap-1.5 text-xs leading-relaxed text-[var(--bp-muted)]">
        <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
        <span>{t("auth.verifySpamHint")}</span>
      </div>
    </section>
  );
}

async function resendSignup(email: string): Promise<boolean> {
  const resp = await fetch("/api/auth/resend-signup", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email }),
  });
  return resp.ok;
}

// Reset-password resend goes directly through the browser Supabase client,
// mirroring the initial send in reset-password/page.tsx. Supabase's own
// per-address cooldown (~60s) is the primary rate-limit, with the component's
// cooldown above as the UI-level guard.
async function resendReset(email: string, locale: Locale): Promise<boolean> {
  const supabase = createBrowserSupabaseClient();
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: buildAuthRedirectUrl("/update-password", {
      locale,
      fallbackOrigin:
        typeof window !== "undefined" ? window.location.origin : null,
      preferFallbackOrigin: true,
    }),
  });
  return !error;
}
