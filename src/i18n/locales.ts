export const locales = ["en", "ko", "ja", "es", "zh-CN", "mn"] as const;
export type Locale = (typeof locales)[number];

export const defaultLocale: Locale = "en";

/** Map legacy locale codes to new ones during migration */
export const legacyLocaleMap: Record<string, Locale> = {
  "pt-BR": "en",
};

/** Display names in their own script (for language picker) */
export const localeDisplayNames: Record<Locale, string> = {
  en: "English",
  ko: "한국어",
  ja: "日本語",
  es: "Español",
  "zh-CN": "简体中文",
  mn: "Монгол",
};
