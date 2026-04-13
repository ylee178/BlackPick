"use client";

import { Link } from "@/i18n/navigation";
import { useI18n } from "@/lib/i18n-provider";
import { Sparkles, X } from "lucide-react";
import {
  retroPanelClassName,
  retroButtonClassName,
} from "@/components/ui/retro";
import {
  useOnboardingDismissal,
  ONBOARDING_KEYS,
} from "@/lib/onboarding-dismissal";

type Props = {
  featuredEventHref: string;
};

export default function AnonFirstPickCta({ featuredEventHref }: Props) {
  const { t } = useI18n();
  const { status, dismiss } = useOnboardingDismissal(ONBOARDING_KEYS.anonFirstPickCta());

  if (status !== "show") return null;

  return (
    <div
      className={retroPanelClassName({
        className:
          "relative mb-4 flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between sm:gap-4",
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
      <div className="flex min-w-0 flex-1 items-start gap-3 pr-8 sm:pr-0">
        <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[rgba(229,169,68,0.12)] text-[var(--bp-accent)]">
          <Sparkles className="h-4 w-4" strokeWidth={2} />
        </span>
        <div className="min-w-0">
          <p className="text-sm font-semibold text-[var(--bp-ink)]">
            {t("onboarding.anonCtaTitle")}
          </p>
          <p className="mt-1 text-xs text-[var(--bp-muted)]">
            {t("onboarding.anonCtaDescription")}
          </p>
        </div>
      </div>
      <Link
        href={featuredEventHref}
        className={retroButtonClassName({
          variant: "primary",
          size: "sm",
          className: "shrink-0 self-stretch sm:self-auto",
        })}
      >
        {t("onboarding.anonCtaButton")}
      </Link>
    </div>
  );
}
