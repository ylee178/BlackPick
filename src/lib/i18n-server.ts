import { getLocale as nextIntlGetLocale, getMessages } from "next-intl/server";
import type { Locale } from "@/i18n/locales";

export type { Locale };

export async function getLocale(): Promise<Locale> {
  return (await nextIntlGetLocale()) as Locale;
}

function getNestedValue(obj: Record<string, unknown>, key: string): string {
  const parts = key.split(".");
  let current: unknown = obj;
  for (const part of parts) {
    if (typeof current !== "object" || current === null || !(part in (current as Record<string, unknown>))) return key;
    current = (current as Record<string, unknown>)[part];
  }
  return typeof current === "string" ? current : key;
}

/**
 * Tiny `{var}`-style interpolator mirroring the client-side helper in
 * `i18n-provider.tsx`. Kept literally identical on purpose so behavior
 * does not drift between server components and client components.
 */
function interpolate(template: string, vars?: Record<string, string | number>): string {
  if (!vars) return template;
  return template.replace(/\{(\w+)\}/g, (match, key: string) => {
    const value = vars[key];
    return value === undefined || value === null ? match : String(value);
  });
}

export async function getTranslations() {
  const locale = await getLocale();
  const messages = await getMessages();

  return {
    locale,
    t: (key: string, vars?: Record<string, string | number>) =>
      interpolate(getNestedValue(messages as Record<string, unknown>, key), vars),
  };
}
