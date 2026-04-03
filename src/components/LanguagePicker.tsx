"use client";

import { useI18n, type Locale } from "@/lib/i18n-provider";

const LANGUAGES: { code: Locale; label: string }[] = [
  { code: "en", label: "EN" },
  { code: "ko", label: "한국어" },
  { code: "ja", label: "日本語" },
  { code: "pt-BR", label: "Português" },
];

export default function LanguagePicker() {
  const { locale, setLocale } = useI18n();

  return (
    <div className="inline-flex items-center rounded-full border border-gray-800 bg-gray-900/80 p-1 shadow-sm backdrop-blur">
      {LANGUAGES.map((language) => {
        const active = locale === language.code;

        return (
          <button
            key={language.code}
            type="button"
            onClick={() => setLocale(language.code)}
            className={[
              "rounded-full px-3 py-1.5 text-xs font-medium transition-all duration-200 sm:text-sm",
              active
                ? "bg-amber-400 text-gray-950 shadow-sm"
                : "text-gray-300 hover:bg-gray-800 hover:text-white",
            ].join(" ")}
            aria-pressed={active}
            aria-label={`Switch language to ${language.label}`}
          >
            {language.label}
          </button>
        );
      })}
    </div>
  );
}
