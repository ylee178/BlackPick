"use client";

import { useEffect, useState } from "react";
import { X } from "lucide-react";
import { useI18n } from "@/lib/i18n-provider";
import { useToast } from "@/components/Toast";
import LoadingButtonContent from "@/components/ui/LoadingButtonContent";
import {
  retroButtonClassName,
  retroFieldClassName,
  retroPanelClassName,
} from "@/components/ui/retro";
import {
  FEEDBACK_BODY_MAX,
  FEEDBACK_CATEGORIES,
  type FeedbackCategory,
} from "@/lib/feedback-validation";

type Props = {
  authed: boolean;
  onClose: () => void;
};

type SubmitState =
  | { status: "idle" }
  | { status: "submitting" }
  | { status: "error"; message: string };

export default function FeedbackModal({ authed, onClose }: Props) {
  const { t } = useI18n();
  const { toast } = useToast();

  const [category, setCategory] = useState<FeedbackCategory>("bug");
  const [body, setBody] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [submit, setSubmit] = useState<SubmitState>({ status: "idle" });

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && submit.status !== "submitting") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose, submit.status]);

  const submitting = submit.status === "submitting";
  const errorMessage = submit.status === "error" ? submit.message : null;
  const trimmedBody = body.trim();
  const canSubmit = trimmedBody.length > 0 && !submitting;
  const charCount = body.length;

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!canSubmit) return;

    setSubmit({ status: "submitting" });

    const payload = JSON.stringify({
      category,
      body,
      contactEmail: authed ? undefined : contactEmail || undefined,
    });

    const tryOnce = async (): Promise<Response | null> => {
      try {
        return await fetch("/api/feedback", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: payload,
        });
      } catch {
        return null;
      }
    };

    let resp = await tryOnce();

    // Per spec: retry once on transport failure or 503 (Resend upstream
    // failure). 4xx errors — including 400 validation and 429 rate-limit —
    // are terminal; retrying would just waste the user's window.
    if (resp === null || resp.status === 503) {
      resp = await tryOnce();
    }

    if (resp === null) {
      setSubmit({ status: "error", message: t("feedback.errorGeneric") });
      return;
    }

    if (resp.status === 429) {
      setSubmit({ status: "error", message: t("feedback.errorRateLimit") });
      return;
    }

    if (!resp.ok) {
      setSubmit({ status: "error", message: t("feedback.errorGeneric") });
      return;
    }

    toast(t("feedback.successToast"), "success");
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-[80] flex items-center justify-center bg-[rgba(15,17,21,0.85)] px-4 py-10 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="feedback-modal-title"
    >
      <div className={retroPanelClassName({ className: "relative w-full max-w-md p-5 sm:p-6" })}>
        <button
          type="button"
          aria-label={t("common.close")}
          onClick={() => !submitting && onClose()}
          disabled={submitting}
          className="absolute right-3 top-3 inline-flex h-8 w-8 cursor-pointer items-center justify-center rounded-[8px] border border-transparent text-[var(--bp-muted)] transition hover:border-[var(--bp-line)] hover:text-[var(--bp-ink)] disabled:cursor-not-allowed disabled:opacity-50"
        >
          <X className="h-4 w-4" aria-hidden="true" />
        </button>

        <h2 id="feedback-modal-title" className="text-xl font-bold text-[var(--bp-ink)]">
          {t("feedback.modalTitle")}
        </h2>
        <p className="mt-2 text-sm text-[var(--bp-muted)]">
          {authed ? t("feedback.modalDescription") : t("feedback.authOptionalHint")}
        </p>

        <form onSubmit={handleSubmit} className="mt-5 space-y-4">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-[var(--bp-ink)]">
              {t("feedback.categoryLabel")}
            </label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value as FeedbackCategory)}
              disabled={submitting}
              className={retroFieldClassName("px-3.5 py-2.5 text-sm")}
            >
              {FEEDBACK_CATEGORIES.map((cat) => (
                <option key={cat} value={cat}>
                  {t(`feedback.categories.${cat}`)}
                </option>
              ))}
            </select>
          </div>

          <div>
            <div className="mb-1.5 flex items-center justify-between">
              <label className="text-sm font-medium text-[var(--bp-ink)]" htmlFor="feedback-body">
                {t("feedback.bodyLabel")}
              </label>
              <span
                className={
                  charCount > FEEDBACK_BODY_MAX
                    ? "text-xs text-[var(--bp-danger)]"
                    : "text-xs text-[var(--bp-muted)]"
                }
              >
                {charCount} / {FEEDBACK_BODY_MAX}
              </span>
            </div>
            <textarea
              id="feedback-body"
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder={t("feedback.bodyPlaceholder")}
              disabled={submitting}
              rows={5}
              maxLength={FEEDBACK_BODY_MAX}
              className={retroFieldClassName("resize-y px-3.5 py-2.5 text-sm")}
            />
          </div>

          {!authed ? (
            <div>
              <label
                className="mb-1.5 block text-sm font-medium text-[var(--bp-ink)]"
                htmlFor="feedback-email"
              >
                {t("feedback.contactEmailLabel")}
              </label>
              <input
                id="feedback-email"
                type="email"
                value={contactEmail}
                onChange={(e) => setContactEmail(e.target.value)}
                placeholder={t("feedback.contactEmailPlaceholder")}
                disabled={submitting}
                className={retroFieldClassName("px-3.5 py-2.5 text-sm")}
              />
            </div>
          ) : null}

          {errorMessage ? (
            <div className="rounded-[10px] border border-[rgba(239,68,68,0.2)] bg-[rgba(239,68,68,0.08)] px-3.5 py-2.5 text-sm text-[var(--bp-danger)]">
              {errorMessage}
            </div>
          ) : null}

          <button
            type="submit"
            disabled={!canSubmit}
            aria-busy={submitting}
            className={retroButtonClassName({ variant: "primary", size: "lg", block: true })}
          >
            <LoadingButtonContent loading={submitting} loadingLabel={t("feedback.submitting")}>
              {t("feedback.submit")}
            </LoadingButtonContent>
          </button>
        </form>
      </div>
    </div>
  );
}
