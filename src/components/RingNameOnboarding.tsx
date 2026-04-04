"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useI18n } from "@/lib/i18n-provider";
import { getRingNameValidationError, normalizeRingName } from "@/lib/ring-name";

type RingNameOnboardingProps = {
  email: string | null;
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

export default function RingNameOnboarding({ email }: RingNameOnboardingProps) {
  const router = useRouter();
  const { t } = useI18n();

  const [ringName, setRingName] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [suggestions, setSuggestions] = useState<string[]>([]);

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, []);

  const helperText = useMemo(() => t("onboarding.helper"), [t]);

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
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ringName: normalizedRingName,
        }),
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
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/80 px-4 py-10 backdrop-blur-md">
      <div className="relative w-full max-w-2xl overflow-hidden rounded-[2rem] border border-[#ffba3c]/20 bg-[#090909] shadow-[0_32px_120px_rgba(0,0,0,0.45)]">
        <div className="absolute inset-0 opacity-25" style={{
          backgroundImage: "radial-gradient(#ffba3c 0.8px, transparent 0.8px)",
          backgroundSize: "18px 18px",
        }} />
        <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-transparent via-[#ffba3c] to-transparent" />

        <div className="relative p-6 sm:p-8">
          <div className="inline-flex items-center rounded-full border border-[#ffba3c]/20 bg-[#ffba3c]/10 px-3 py-1 text-[11px] font-black uppercase tracking-[0.3em] text-[#ffba3c]">
            {t("onboarding.badge")}
          </div>

          <h2
            className="mt-5 max-w-xl text-3xl font-black uppercase leading-[0.95] text-white sm:text-4xl"
            style={{ fontFamily: "var(--font-display)" }}
          >
            {t("onboarding.title")}
          </h2>

          <p className="mt-4 max-w-xl text-sm leading-6 text-white/65">
            {t("onboarding.description")}
          </p>

          <p className="mt-3 max-w-xl text-sm font-medium text-[#ffba3c]/90">
            {t("onboarding.duplicateHint")}
          </p>

          {email ? (
            <p className="mt-4 text-xs uppercase tracking-[0.22em] text-white/35">
              {t("onboarding.signedInAs")} {email}
            </p>
          ) : null}

          <form onSubmit={handleSubmit} className="mt-8 space-y-4">
            <div>
              <label className="mb-2 block text-sm font-semibold text-white/85">
                {t("onboarding.label")}
              </label>
              <input
                type="text"
                autoFocus
                value={ringName}
                onChange={(event) => setRingName(event.target.value)}
                placeholder={t("onboarding.placeholder")}
                className="w-full rounded-2xl border border-white/10 bg-black px-5 py-4 text-lg font-semibold text-white outline-none transition placeholder:text-white/20 focus:border-[#ffba3c]"
              />
              <p className="mt-2 text-xs text-white/45">{helperText}</p>
            </div>

            {error ? (
              <div className="rounded-2xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-200">
                {error}
              </div>
            ) : null}

            {suggestions.length > 0 ? (
              <div className="rounded-2xl border border-white/8 bg-white/[0.03] p-4">
                <p className="text-xs font-bold uppercase tracking-[0.24em] text-[#ffba3c]">
                  {t("onboarding.suggestions")}
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {suggestions.map((suggestion) => (
                    <button
                      key={suggestion}
                      type="button"
                      onClick={() => {
                        setRingName(suggestion);
                        setError(null);
                      }}
                      className="rounded-full border border-[#ffba3c]/20 bg-[#ffba3c]/10 px-4 py-2 text-sm font-semibold text-[#ffba3c] transition hover:border-[#ffba3c]/35 hover:bg-[#ffba3c]/15"
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
              className="w-full rounded-2xl bg-[#ffba3c] px-5 py-4 text-sm font-black uppercase tracking-[0.18em] text-black transition hover:bg-[#ffd06b] disabled:cursor-not-allowed disabled:opacity-70"
            >
              {submitting ? t("onboarding.submitting") : t("onboarding.submit")}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
