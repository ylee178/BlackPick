"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import { Link } from "@/i18n/navigation";
import SocialAuthButtons from "@/components/auth/SocialAuthButtons";
import { retroPanelClassName, retroButtonClassName } from "@/components/ui/retro";
import { useI18n } from "@/lib/i18n-provider";

/**
 * Signup gate shown when an anonymous user tries to pick a fighter.
 *
 * Two escape hatches into real auth flows:
 *  1) `SocialAuthButtons` (Google / Facebook) — same component used on the
 *     /signup and /login pages, kept in sync for free.
 *  2) Email signup link — sends the user to the full `/signup` page (the
 *     auth pages already forward `next` params from `window.location`).
 *
 * The modal itself does not persist any selection state. The caller
 * (FightCardPicker) stashes the pending pick to localStorage before opening
 * the modal, and restores it in a mount effect once the user is back and
 * authenticated.
 *
 * The post-auth return URL is derived from `window.location.pathname +
 * search` at the moment the modal opens. No `returnTo` prop — we do not
 * expose a sink for untrusted input. Any future need for a custom return
 * URL should pass it through `buildLocalizedAuthPath` with explicit
 * same-origin validation, not through this component.
 */
type Props = {
  open: boolean;
  onClose: () => void;
};

export default function SignupGateModal({ open, onClose }: Props) {
  const { t } = useI18n();
  const overlayRef = useRef<HTMLDivElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const previouslyFocusedRef = useRef<HTMLElement | null>(null);
  const [authError, setAuthError] = useState<string | null>(null);

  // Focus management + Escape key. We save the element that had focus when
  // the modal opened, move focus onto the close button (which is both the
  // safest initial landing target and an obvious way out), and restore
  // focus back to the originating element when the modal closes. This is
  // the 80/20 of a full focus trap — keyboard users get a predictable
  // entry/exit without pulling in a trapping library.
  useEffect(() => {
    if (!open) return;
    previouslyFocusedRef.current =
      (document.activeElement as HTMLElement | null) ?? null;
    // Move focus after the portal has mounted.
    closeButtonRef.current?.focus();

    function handleEsc(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", handleEsc);
    return () => {
      document.removeEventListener("keydown", handleEsc);
      previouslyFocusedRef.current?.focus?.();
    };
  }, [open, onClose]);

  if (!open) return null;

  // Build return URL from the current location at render time. This is a
  // pure local-origin path — no prop input, no URL construction — so there
  // is no sink for open-redirect payloads from callers.
  const resolvedReturnTo =
    typeof window !== "undefined"
      ? `${window.location.pathname}${window.location.search}`
      : "/";

  return createPortal(
    <div
      ref={overlayRef}
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-4"
      onClick={(e) => {
        if (e.target === overlayRef.current) onClose();
      }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="signup-gate-title"
    >
      <div
        className={retroPanelClassName({
          className: "w-full max-w-sm p-6",
        })}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <p
              id="signup-gate-title"
              className="text-base font-semibold text-[var(--bp-ink)]"
            >
              {t("auth.pickGateTitle")}
            </p>
            <p className="mt-1.5 text-sm leading-relaxed text-[var(--bp-muted)]">
              {t("auth.pickGateDescription")}
            </p>
          </div>
          <button
            ref={closeButtonRef}
            type="button"
            onClick={onClose}
            aria-label={t("common.close")}
            className="flex h-8 w-8 shrink-0 cursor-pointer items-center justify-center rounded-full text-[var(--bp-muted)] transition hover:bg-[rgba(255,255,255,0.08)] hover:text-[var(--bp-ink)]"
          >
            <X className="h-4 w-4" strokeWidth={2} />
          </button>
        </div>

        <div className="mt-5">
          <SocialAuthButtons
            redirectTo={resolvedReturnTo}
            onError={setAuthError}
            onStart={() => setAuthError(null)}
          />
        </div>

        {authError ? (
          <p className="mt-3 text-xs text-[var(--bp-danger)]" role="alert">
            {authError}
          </p>
        ) : null}

        <div className="mt-5 flex items-center gap-3">
          <div className="h-px flex-1 bg-[var(--bp-line)]" />
          <span className="text-[11px] uppercase tracking-[0.08em] text-[var(--bp-muted)]">
            {t("auth.or")}
          </span>
          <div className="h-px flex-1 bg-[var(--bp-line)]" />
        </div>

        <Link
          href="/signup"
          className={retroButtonClassName({
            variant: "primary",
            size: "sm",
            block: true,
            className: "mt-4",
          })}
        >
          {t("auth.pickGateEmailSignup")}
        </Link>

        <p className="mt-4 text-center text-xs text-[var(--bp-muted)]">
          {t("auth.alreadyHaveAccount")}{" "}
          <Link
            href="/login"
            className="font-semibold text-[var(--bp-accent)] transition hover:opacity-80"
          >
            {t("auth.login")}
          </Link>
        </p>
      </div>
    </div>,
    document.body,
  );
}
