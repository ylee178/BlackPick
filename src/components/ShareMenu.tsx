"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  Share2,
  X,
  Link as LinkIcon,
  Mail,
  MessageCircle,
  Check,
} from "lucide-react";
import { useI18n } from "@/lib/i18n-provider";
import { useToast } from "@/components/Toast";
import { retroPanelClassName, retroButtonClassName } from "@/components/ui/retro";
import { cn } from "@/lib/utils";

/**
 * Cross-channel share menu.
 *
 * Strategy — progressive enhancement:
 *   1. If the browser exposes `navigator.share` (modern mobile + Safari desktop),
 *      use it. That gets the user the best system sheet with all their installed
 *      apps in one tap.
 *   2. Otherwise, render a dialog with explicit channel buttons: Twitter/X,
 *      Facebook, WhatsApp, KakaoTalk (big in Korea, BlackPick's primary market),
 *      email (mailto:), SMS (sms:), and a copy-link fallback.
 *
 * All buttons open plain `https://` share endpoints and the `mailto:` /
 * `sms:` URI schemes — no third-party SDKs, no tracking pixels, no cookies.
 * The copy-link button uses `navigator.clipboard.writeText` and surfaces a
 * toast confirmation via the existing Toast provider.
 *
 * Accessibility: portal-mounted dialog with `aria-modal`, Escape to close,
 * backdrop click to close, focus moved to the close button on open and
 * restored to the trigger on close.
 */
type Props = {
  /** Relative path or absolute URL of the shared resource. */
  url: string;
  /** Title suitable for share intents (Twitter text, email subject). */
  title: string;
  /** Longer body text for share intents that accept it. */
  text: string;
  /** Optional className to pass through to the trigger button. */
  className?: string;
  /**
   * Override the trigger button label. Defaults to the i18n
   * `share.trigger` key ("Share"). Used by `EventShareCta` to show
   * state-driven dynamic copy like "5/5 locked in — share your card".
   */
  triggerLabel?: string;
  /**
   * Override the trigger button visual variant. Defaults to
   * `secondary`. `primary` gives the stronger gold-on-black CTA used
   * by the event-page hero share button.
   */
  triggerVariant?: "primary" | "secondary" | "soft";
  /**
   * Override the trigger size. Defaults to `sm`. `md` gives the
   * larger CTA-sized button.
   */
  triggerSize?: "sm" | "md" | "lg";
  /** Hide the leading Share2 icon (e.g. in tight mobile layouts). */
  hideIcon?: boolean;
};

type Channel = {
  id: string;
  labelKey: string;
  icon: React.ReactNode;
  buildHref: (absoluteUrl: string, title: string, text: string) => string;
};

function XLogo() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden="true" fill="currentColor">
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    </svg>
  );
}

function FacebookLogo() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden="true" fill="currentColor">
      <path d="M22 12c0-5.523-4.477-10-10-10S2 6.477 2 12c0 4.991 3.657 9.128 8.438 9.878v-6.987h-2.54V12h2.54V9.797c0-2.506 1.492-3.89 3.777-3.89 1.094 0 2.238.195 2.238.195v2.46h-1.26c-1.243 0-1.63.771-1.63 1.562V12h2.773l-.443 2.89h-2.33v6.988C18.343 21.128 22 16.991 22 12z" />
    </svg>
  );
}

function WhatsAppLogo() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden="true" fill="currentColor">
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
    </svg>
  );
}

const CHANNELS: Channel[] = [
  {
    id: "twitter",
    labelKey: "share.channelTwitter",
    icon: <XLogo />,
    buildHref: (url, _title, text) =>
      `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`,
  },
  {
    id: "facebook",
    labelKey: "share.channelFacebook",
    icon: <FacebookLogo />,
    buildHref: (url) =>
      `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`,
  },
  {
    id: "whatsapp",
    labelKey: "share.channelWhatsApp",
    icon: <WhatsAppLogo />,
    buildHref: (url, _title, text) =>
      `https://wa.me/?text=${encodeURIComponent(`${text} ${url}`)}`,
  },
  // KakaoTalk is deliberately omitted from the manual-fallback channel list.
  // Without the Kakao JS SDK we cannot produce a real Kakao share, and
  // labelling a button "KakaoTalk" while actually opening `sms:` misleads
  // users. Korean visitors still get a native Kakao path via
  // `navigator.share` on mobile when their browser + Kakao installation
  // support it — that covers the common case honestly.
  {
    id: "email",
    labelKey: "share.channelEmail",
    icon: <Mail className="h-4 w-4" strokeWidth={2} />,
    buildHref: (url, title, text) =>
      `mailto:?subject=${encodeURIComponent(title)}&body=${encodeURIComponent(`${text}\n\n${url}`)}`,
  },
  {
    id: "sms",
    labelKey: "share.channelSms",
    icon: <MessageCircle className="h-4 w-4" strokeWidth={2} />,
    buildHref: (url, _title, text) =>
      `sms:?&body=${encodeURIComponent(`${text} ${url}`)}`,
  },
];

export default function ShareMenu({
  url,
  title,
  text,
  className,
  triggerLabel,
  triggerVariant = "secondary",
  triggerSize = "sm",
  hideIcon = false,
}: Props) {
  const { t } = useI18n();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const overlayRef = useRef<HTMLDivElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const previouslyFocusedRef = useRef<HTMLElement | null>(null);

  // Build absolute URL once per render from the relative path (or pass
  // through if already absolute). We construct it lazily inside the click
  // handler so SSR never hits `window`.
  function resolveAbsoluteUrl(): string {
    if (/^https?:\/\//i.test(url)) return url;
    if (typeof window === "undefined") return url;
    return `${window.location.origin}${url}`;
  }

  async function handleTriggerClick() {
    const absoluteUrl = resolveAbsoluteUrl();
    if (typeof navigator !== "undefined" && typeof navigator.share === "function") {
      try {
        await navigator.share({ title, text, url: absoluteUrl });
        return;
      } catch (err) {
        // User dismissed — not an error. Only fall through to the manual
        // menu if the native share actually failed (AbortError === user
        // cancel, we stay silent).
        if (err instanceof Error && err.name === "AbortError") return;
      }
    }
    setOpen(true);
  }

  async function handleCopy() {
    const absoluteUrl = resolveAbsoluteUrl();
    try {
      await navigator.clipboard.writeText(absoluteUrl);
      setCopied(true);
      toast(t("share.copied"), "success");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast(t("share.copyFailed"), "error");
    }
  }

  // Focus management + Escape + Tab focus trap for the dialog.
  //
  // The trap is a minimal implementation: on Tab / Shift+Tab we look up
  // all focusable descendants inside the dialog panel and, when focus
  // reaches either end, cycle it back to the other end. No library, no
  // observers — the focusable set is recomputed per keydown because the
  // dialog is small and this runs at most a few times per open session.
  const dialogRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    // Capture the trigger ref at effect start so the cleanup closure
    // doesn't read a potentially-changed ref on unmount.
    const trigger = triggerRef.current;
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
        setOpen(false);
        return;
      }
      if (e.key !== "Tab") return;
      const focusable = getFocusable();
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
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
      (previouslyFocusedRef.current ?? trigger)?.focus?.();
    };
  }, [open]);

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        onClick={() => void handleTriggerClick()}
        className={cn(
          retroButtonClassName({ variant: triggerVariant, size: triggerSize }),
          className,
        )}
        aria-label={triggerLabel ?? t("share.trigger")}
      >
        {!hideIcon ? <Share2 className="h-4 w-4" strokeWidth={2} /> : null}
        {triggerLabel ?? t("share.trigger")}
      </button>

      {open
        ? createPortal(
            <div
              ref={overlayRef}
              className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-4"
              onClick={(e) => {
                if (e.target === overlayRef.current) setOpen(false);
              }}
              role="dialog"
              aria-modal="true"
              aria-labelledby="share-menu-title"
            >
              <div
                ref={dialogRef}
                className={retroPanelClassName({
                  className: "w-full max-w-sm p-6",
                })}
              >
                <div className="flex items-start justify-between gap-3">
                  <p
                    id="share-menu-title"
                    className="text-base font-semibold text-[var(--bp-ink)]"
                  >
                    {t("share.dialogTitle")}
                  </p>
                  <button
                    ref={closeButtonRef}
                    type="button"
                    onClick={() => setOpen(false)}
                    aria-label={t("common.close")}
                    className="flex h-8 w-8 shrink-0 cursor-pointer items-center justify-center rounded-full text-[var(--bp-muted)] transition hover:bg-[rgba(255,255,255,0.08)] hover:text-[var(--bp-ink)]"
                  >
                    <X className="h-4 w-4" strokeWidth={2} />
                  </button>
                </div>

                <div className="mt-4 grid grid-cols-2 gap-2">
                  {CHANNELS.map((channel) => (
                    <a
                      key={channel.id}
                      href={channel.buildHref(resolveAbsoluteUrl(), title, text)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={retroButtonClassName({
                        variant: "secondary",
                        size: "sm",
                        block: true,
                      })}
                    >
                      {channel.icon}
                      {t(channel.labelKey)}
                    </a>
                  ))}
                </div>

                <button
                  type="button"
                  onClick={() => void handleCopy()}
                  className={cn(
                    retroButtonClassName({
                      variant: "primary",
                      size: "sm",
                      block: true,
                      className: "mt-3",
                    }),
                  )}
                >
                  {copied ? (
                    <Check className="h-4 w-4" strokeWidth={2} />
                  ) : (
                    <LinkIcon className="h-4 w-4" strokeWidth={2} />
                  )}
                  {copied ? t("share.copied") : t("share.copyLink")}
                </button>
              </div>
            </div>,
            document.body,
          )
        : null}
    </>
  );
}
