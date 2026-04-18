"use client";

import { useState } from "react";
import { MessageSquare } from "lucide-react";
import { useI18n } from "@/lib/i18n-provider";
import FeedbackModal from "@/components/FeedbackModal";

/**
 * Floating feedback button.
 *
 * Prod-only gate: NODE_ENV === 'production'. In development, DevPanel owns
 * the bottom-right slot. The two are mutually exclusive.
 *
 * Server endpoint (/api/feedback) is auth-optional, so this button is
 * rendered for every viewer — including signed-out users who hit an
 * auth error and can't log in but still need a way to reach us.
 */
type Props = {
  authed: boolean;
};

export default function FeedbackButton({ authed }: Props) {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);

  if (process.env.NODE_ENV !== "production") return null;

  return (
    <>
      <button
        type="button"
        aria-label={t("feedback.button")}
        onClick={() => setOpen(true)}
        className="fixed bottom-20 right-4 z-[70] inline-flex h-12 w-12 cursor-pointer items-center justify-center rounded-full border border-[var(--bp-line-strong)] bg-[var(--bp-card)] text-[var(--bp-ink)] shadow-lg transition hover:border-[var(--bp-accent)] hover:text-[var(--bp-accent)] md:bottom-6"
      >
        <MessageSquare className="h-5 w-5" aria-hidden="true" />
      </button>
      {open ? <FeedbackModal authed={authed} onClose={() => setOpen(false)} /> : null}
    </>
  );
}
