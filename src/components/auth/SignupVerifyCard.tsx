"use client";

import { useState } from "react";
import { ArrowLeft, ExternalLink, Mail } from "lucide-react";
import { useI18n } from "@/lib/i18n-provider";
import {
  retroButtonClassName,
  retroPanelClassName,
} from "@/components/ui/retro";
import { detectEmailProvider } from "@/lib/email-provider";

type Props = {
  email: string;
  onStartOver: () => void;
};

type ResendState = "idle" | "sending" | "sent" | "error";

export default function SignupVerifyCard({ email, onStartOver }: Props) {
  const { t } = useI18n();
  const provider = detectEmailProvider(email);
  const [resend, setResend] = useState<ResendState>("idle");

  const handleResend = async () => {
    if (resend === "sending" || resend === "sent") return;
    setResend("sending");
    try {
      const resp = await fetch("/api/auth/resend-signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      setResend(resp.ok ? "sent" : "error");
    } catch {
      setResend("error");
    }
  };

  const resendLabel =
    resend === "sending"
      ? t("auth.verifyResending")
      : resend === "sent"
        ? t("auth.verifyResent")
        : resend === "error"
          ? t("auth.verifyResendError")
          : t("auth.verifyResend");

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
      <p className="mt-2 text-sm text-[var(--bp-muted)]">
        {t("auth.verifySentTo")}
      </p>
      <p className="mt-1 break-all text-base font-semibold text-[var(--bp-ink)]">
        {email}
      </p>
      <p className="mt-4 text-sm leading-relaxed text-[var(--bp-muted)]">
        {t("auth.verifyInstructions")}
      </p>

      {provider ? (
        <a
          href={provider.webmailUrl}
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
          {t("auth.verifyOpenProvider", { name: provider.name })}
        </a>
      ) : null}

      <div className="mt-4 flex flex-col items-center gap-2 text-xs sm:flex-row sm:justify-center sm:gap-5">
        <button
          type="button"
          onClick={handleResend}
          disabled={resend === "sending" || resend === "sent"}
          className="inline-flex cursor-pointer items-center font-semibold text-[var(--bp-accent)] transition hover:underline disabled:cursor-not-allowed disabled:opacity-60"
        >
          {resendLabel}
        </button>
        <button
          type="button"
          onClick={onStartOver}
          className="inline-flex cursor-pointer items-center gap-1.5 font-semibold text-[var(--bp-muted)] transition hover:text-[var(--bp-ink)]"
        >
          <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
          {t("auth.verifyUseDifferentEmail")}
        </button>
      </div>

      <p className="mt-6 text-xs leading-relaxed text-[var(--bp-muted)]">
        {t("auth.verifySpamHint")}
      </p>
    </section>
  );
}
