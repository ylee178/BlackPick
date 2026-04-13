"use client";

import { useI18n } from "@/lib/i18n-provider";
import { MousePointerClick, X } from "lucide-react";
import { retroPanelClassName } from "@/components/ui/retro";
import {
  useOnboardingDismissal,
  ONBOARDING_KEYS,
  ONBOARDING_TTL_30_DAYS,
} from "@/lib/onboarding-dismissal";

type Props = {
  userId: string;
  fightId: string;
};

export default function FirstPickHintCard({ userId, fightId }: Props) {
  const { t } = useI18n();
  const { status, dismiss } = useOnboardingDismissal(
    ONBOARDING_KEYS.firstPickHint(userId, fightId),
    ONBOARDING_TTL_30_DAYS,
  );

  if (status !== "show") return null;

  return (
    <div
      className={retroPanelClassName({
        className: "relative flex items-start gap-3 p-4 pr-10",
      })}
      role="note"
    >
      <button
        type="button"
        onClick={dismiss}
        aria-label={t("onboarding.dismiss")}
        className="absolute right-2 top-2 flex h-7 w-7 cursor-pointer items-center justify-center rounded-full text-[var(--bp-muted)] transition hover:bg-[var(--bp-card-inset)] hover:text-[var(--bp-ink)]"
      >
        <X className="h-4 w-4" strokeWidth={2} />
      </button>
      <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[rgba(229,169,68,0.12)] text-[var(--bp-accent)]">
        <MousePointerClick className="h-4 w-4" strokeWidth={2} />
      </span>
      <div className="min-w-0">
        <p className="text-sm font-semibold text-[var(--bp-ink)]">
          {t("onboarding.firstPickHintTitle")}
        </p>
        <p className="mt-1 text-xs text-[var(--bp-muted)]">
          {t("onboarding.firstPickHintDescription")}
        </p>
      </div>
    </div>
  );
}
