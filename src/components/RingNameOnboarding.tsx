"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useI18n } from "@/lib/i18n-provider";
import { getRingNameValidationError, normalizeRingName } from "@/lib/ring-name";
import LoadingButtonContent from "@/components/ui/LoadingButtonContent";
import {
  retroButtonClassName,
  retroFieldClassName,
  retroPanelClassName,
} from "@/components/ui/retro";
import {
  useOnboardingDismissal,
  ONBOARDING_KEYS,
  ONBOARDING_TTL_30_DAYS,
} from "@/lib/onboarding-dismissal";

type RingNameOnboardingProps = {
  email: string | null;
  /**
   * Pass a user id to opt the modal into the dismissible first-time
   * onboarding flow: users can tap "Skip for now", which writes a
   * localStorage record keyed to the user and suppresses the modal for
   * 30 days. Omit to keep the legacy forced-modal behavior.
   */
  userId?: string | null;
};

function getErrorMessage(code: string, t: (key: string) => string) {
  switch (code) {
    case "too_short":
      return t("onboarding.tooShort");
    case "too_long":
      return t("onboarding.tooLong");
    case "invalid_characters":
      return t("onboarding.invalidCharacters");
    case "ring_name_taken":
      return t("onboarding.taken");
    case "unauthorized":
      return t("onboarding.notAuthenticated");
    default:
      return t("onboarding.unexpected");
  }
}

export default function RingNameOnboarding({ email, userId }: RingNameOnboardingProps) {
  const router = useRouter();
  const { t } = useI18n();

  const [ringName, setRingName] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [suggestions, setSuggestions] = useState<string[]>([]);

  const dismissible = userId !== undefined;
  const dismissalKey = dismissible && userId ? ONBOARDING_KEYS.ringNamePrompt(userId) : null;
  const { status, dismiss } = useOnboardingDismissal(
    dismissible ? dismissalKey : null,
    ONBOARDING_TTL_30_DAYS,
  );

  const visible = dismissible ? status === "show" : true;

  useEffect(() => {
    if (!visible) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [visible]);

  const helperText = useMemo(() => t("onboarding.helper"), [t]);

  if (!visible) return null;

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const normalizedRingName = normalizeRingName(ringName);
    const validationError = getRingNameValidationError(normalizedRingName);

    if (validationError) {
      setError(getErrorMessage(validationError, t));
      setSuggestions([]);
      return;
    }

    setSubmitting(true);
    setError(null);
    setSuggestions([]);

    try {
      const response = await fetch("/api/profile/ring-name", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ringName: normalizedRingName }),
      });

      const payload = (await response.json().catch(() => null)) as
        | { code?: string; suggestions?: string[] }
        | null;

      if (!response.ok) {
        setError(getErrorMessage(payload?.code ?? "unexpected_error", t));
        setSuggestions(payload?.suggestions ?? []);
        setSubmitting(false);
        return;
      }

      router.refresh();
    } catch {
      setError(t("onboarding.unexpected"));
      setSuggestions([]);
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-[rgba(15,17,21,0.85)] px-4 py-10 backdrop-blur-sm">
      <div className={retroPanelClassName({ className: "w-full max-w-md p-5 sm:p-6" })}>
        <h2 className="text-xl font-bold text-[var(--bp-ink)]">{t("onboarding.title")}</h2>
        <p className="mt-2 text-sm text-[var(--bp-muted)]">{t("onboarding.description")}</p>

        {email ? (
          <p className="mt-2 text-xs text-[var(--bp-muted)]">
            {t("onboarding.signedInAs")} {email}
          </p>
        ) : null}

        <form onSubmit={handleSubmit} className="mt-5 space-y-4">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-[var(--bp-ink)]">
              {t("onboarding.label")}
            </label>
            <input
              type="text"
              autoFocus
              value={ringName}
              onChange={(event) => setRingName(event.target.value)}
              placeholder={t("onboarding.placeholder")}
              className={retroFieldClassName("px-3.5 py-3 text-base font-semibold")}
            />
            <p className="mt-1.5 text-xs text-[var(--bp-muted)]">{helperText}</p>
          </div>

          {error ? (
            <div className="rounded-[10px] border border-[rgba(239,68,68,0.2)] bg-[rgba(239,68,68,0.08)] px-3.5 py-2.5 text-sm text-[var(--bp-danger)]">
              {error}
            </div>
          ) : null}

          {suggestions.length > 0 ? (
            <div className="space-y-2">
              <p className="text-xs font-semibold text-[var(--bp-accent)]">{t("onboarding.suggestions")}</p>
              <div className="flex flex-wrap gap-1.5">
                {suggestions.map((suggestion) => (
                  <button
                    key={suggestion}
                    type="button"
                    onClick={() => {
                      setRingName(suggestion);
                      setError(null);
                    }}
                    className={retroButtonClassName({ variant: "ghost", size: "sm" })}
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
            </div>
          ) : null}

          <button
            type="submit"
            disabled={submitting}
            aria-busy={submitting}
            className={retroButtonClassName({ variant: "primary", size: "lg", block: true })}
          >
            <LoadingButtonContent loading={submitting} loadingLabel={t("onboarding.submitting")}>
              {t("onboarding.submit")}
            </LoadingButtonContent>
          </button>

          {dismissible ? (
            <button
              type="button"
              onClick={dismiss}
              disabled={submitting}
              className={retroButtonClassName({ variant: "ghost", size: "sm", block: true })}
            >
              {t("onboarding.skipForNow")}
            </button>
          ) : null}
        </form>
      </div>
    </div>
  );
}
