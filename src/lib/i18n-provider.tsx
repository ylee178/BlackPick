"use client";

import { useLocale, useMessages, useTranslations } from "next-intl";
import { useRouter, usePathname } from "@/i18n/navigation";
import type { Locale } from "@/i18n/locales";

function getNestedValue(messages: Record<string, unknown>, key: string): string {
  const parts = key.split(".");
  let current: unknown = messages;

  for (const part of parts) {
    if (typeof current !== "object" || current === null || !(part in (current as Record<string, unknown>))) {
      return key;
    }
    current = (current as Record<string, unknown>)[part];
  }

  return typeof current === "string" ? current : key;
}

/**
 * Tiny `{var}`-style interpolator. Deliberately simple — no format
 * specifiers, no plural rules, no HTML. If a key is missing from the
 * `vars` map the placeholder is left as-is so missing data is visible.
 */
function interpolate(template: string, vars?: Record<string, string | number>): string {
  if (!vars) return template;
  return template.replace(/\{(\w+)\}/g, (match, key: string) => {
    const value = vars[key];
    return value === undefined || value === null ? match : String(value);
  });
}

/**
 * Adapter: wraps next-intl hooks to match the legacy useI18n() API.
 * This lets existing components keep using `const { t, locale, setLocale } = useI18n()`
 * without changing every import.
 */
export function useI18n() {
  const locale = useLocale() as Locale;
  const messages = useMessages();
  const router = useRouter();
  const pathname = usePathname();

  function t(key: string, vars?: Record<string, string | number>): string {
    const template = getNestedValue(messages as Record<string, unknown>, key);
    return interpolate(template, vars);
  }

  function setLocale(newLocale: Locale) {
    router.replace(pathname, { locale: newLocale });
  }

  return { locale, t, setLocale };
}

/**
 * Legacy I18nProvider — now a no-op passthrough.
 * next-intl's NextIntlClientProvider in [locale]/layout.tsx handles everything.
 */
export function I18nProvider({
  children,
}: {
  children: React.ReactNode;
  initialLocale?: string;
  initialMessages?: Record<string, unknown>;
}) {
  return <>{children}</>;
}

export type { Locale };
