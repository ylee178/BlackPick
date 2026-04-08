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
 * Adapter: wraps next-intl hooks to match the legacy useI18n() API.
 * This lets existing components keep using `const { t, locale, setLocale } = useI18n()`
 * without changing every import.
 */
export function useI18n() {
  const locale = useLocale() as Locale;
  const messages = useMessages();
  const router = useRouter();
  const pathname = usePathname();

  function t(key: string): string {
    return getNestedValue(messages as Record<string, unknown>, key);
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
