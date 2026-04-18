"use client";

import { useEffect, useRef, useState } from "react";
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

  const overlayRef = useRef<HTMLDivElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const previouslyFocusedRef = useRef<HTMLElement | null>(null);
  const activeControllerRef = useRef<AbortController | null>(null);

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
      // Abort any in-flight submission on unmount so a hung fetch does
      // not keep the tab spinning after the modal closes.
      activeControllerRef.current?.abort();
    };
  }, []);

  // Focus management + Escape + Tab focus trap. Mirrors SignupGateModal so
  // keyboard + screen-reader users get consistent behavior across dialogs:
  //  - On open: capture the previously focused element, move focus to the
  //    close button (safest initial landing target).
  //  - Escape closes (unless submitting).
  //  - Tab / Shift+Tab cycle focus through the dialog's focusable
  //    descendants. The focusable set is recomputed per keystroke because
  //    the error panel + submit button's disabled state can change while
  //    the modal is open.
  //  - On unmount: restore focus to the previously focused element.
  useEffect(() => {
    previouslyFocusedRef.current =
      (document.activeElement as HTMLElement | null) ?? null;
    closeButtonRef.current?.focus();

    function getFocusable(): HTMLElement[] {
      const root = dialogRef.current;
      if (!root) return [];
      return Array.from(
        root.querySelectorAll<HTMLElement>(
          'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])',
        ),
      ).filter((el) => !el.hasAttribute("aria-hidden"));
    }

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        if (submit.status !== "submitting") onClose();
        return;
      }
      if (e.key !== "Tab") return;
      const focusable = getFocusable();
      if (focusable.length === 0) return;
      const first = focusable[0]!;
      const last = focusable[focusable.length - 1]!;
      const active = document.activeElement as HTMLElement | null;
      if (e.shiftKey) {
        if (active === first || !dialogRef.current?.contains(active)) {
          e.preventDefault();
          last.focus();
        }
      } else {
        if (active === last || !dialogRef.current?.contains(active)) {
          e.preventDefault();
          first.focus();
        }
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      previouslyFocusedRef.current?.focus?.();
    };
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

    // Generated once per submission attempt and reused across the retry, so
    // Resend (via our route) dedupes if it accepted the first send but
    // returned 5xx on response. Modern browsers expose crypto.randomUUID;
    // fall back gracefully if it isn't available.
    const idempotencyKey =
      typeof crypto !== "undefined" && "randomUUID" in crypto
        ? crypto.randomUUID()
        : null;

    // 30s timeout per attempt so a hung fetch (DNS stall, upstream Resend
    // not responding) cannot pin `submit.status = "submitting"` forever
    // and trap the user inside the modal (Escape/backdrop/close are all
    // gated on !submitting).
    const tryOnce = async (): Promise<Response | null> => {
      const controller = new AbortController();
      activeControllerRef.current = controller;
      const timeout = setTimeout(() => controller.abort(), 30_000);
      try {
        const headers: Record<string, string> = {
          "Content-Type": "application/json",
        };
        if (idempotencyKey) headers["x-feedback-idempotency-key"] = idempotencyKey;
        return await fetch("/api/feedback", {
          method: "POST",
          headers,
          body: payload,
          signal: controller.signal,
        });
      } catch {
        return null;
      } finally {
        clearTimeout(timeout);
        if (activeControllerRef.current === controller) {
          activeControllerRef.current = null;
        }
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
      ref={overlayRef}
      onClick={(e) => {
        if (e.target === overlayRef.current && !submitting) onClose();
      }}
      className="fixed inset-0 z-[80] flex items-center justify-center bg-[rgba(15,17,21,0.85)] px-4 py-10 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="feedback-modal-title"
    >
      <div
        ref={dialogRef}
        className={retroPanelClassName({ className: "relative w-full max-w-md p-5 sm:p-6" })}
      >
        <button
          ref={closeButtonRef}
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
                  charCount >= FEEDBACK_BODY_MAX
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
            <div
              role="alert"
              className="rounded-[10px] border border-[rgba(239,68,68,0.2)] bg-[rgba(239,68,68,0.08)] px-3.5 py-2.5 text-sm text-[var(--bp-danger)]"
            >
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
