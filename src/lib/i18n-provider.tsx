"use client";

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

type Locale = "en" | "ko" | "ja" | "pt-BR";

interface Messages {
  [key: string]: string | Messages;
}

type I18nContextValue = {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: (key: string) => string;
};

const LOCALE_COOKIE = "locale";
const DEFAULT_LOCALE: Locale = "en";
const SUPPORTED_LOCALES: Locale[] = ["en", "ko", "ja", "pt-BR"];

const I18nContext = createContext<I18nContextValue | null>(null);

function getCookie(name: string): string | null {
  if (typeof document === "undefined") return null;

  const value = `; ${document.cookie}`;
  const parts = value.split(`; ${name}=`);
  if (parts.length === 2) {
    return parts.pop()?.split(";").shift() ?? null;
  }
  return null;
}

function setCookie(name: string, value: string, days = 365) {
  if (typeof document === "undefined") return;

  const expires = new Date(Date.now() + days * 24 * 60 * 60 * 1000).toUTCString();
  document.cookie = `${name}=${encodeURIComponent(
    value
  )}; expires=${expires}; path=/; SameSite=Lax`;
}

function isValidLocale(value: string | null): value is Locale {
  return !!value && SUPPORTED_LOCALES.includes(value as Locale);
}

function getNestedValue(messages: Messages, key: string): string | undefined {
  const parts = key.split(".");
  let current: string | Messages | undefined = messages;

  for (const part of parts) {
    if (typeof current !== "object" || current === null || !(part in current)) {
      return undefined;
    }
    current = current[part];
  }

  return typeof current === "string" ? current : undefined;
}

async function loadMessages(locale: Locale): Promise<Messages> {
  switch (locale) {
    case "ko":
      return (await import("@/messages/ko.json")).default;
    case "ja":
      return (await import("@/messages/ja.json")).default;
    case "pt-BR":
      return (await import("@/messages/pt-BR.json")).default;
    case "en":
    default:
      return (await import("@/messages/en.json")).default;
  }
}

export function I18nProvider({
  children,
  initialLocale,
  initialMessages,
}: {
  children: React.ReactNode;
  initialLocale: Locale;
  initialMessages: Messages;
}) {
  const [locale, setLocaleState] = useState<Locale>(initialLocale);
  const [messages, setMessages] = useState<Messages>(initialMessages);

  useEffect(() => {
    const cookieLocale = getCookie(LOCALE_COOKIE);
    const nextLocale = isValidLocale(cookieLocale) ? cookieLocale : initialLocale;

    if (nextLocale !== locale) {
      setLocaleState(nextLocale);
    }
  }, [initialLocale, locale]);

  useEffect(() => {
    let mounted = true;

    loadMessages(locale)
      .then((loadedMessages) => {
        if (mounted) {
          setMessages(loadedMessages);
        }
      })
      .catch(() => {
        if (mounted) {
          setMessages({});
        }
      });

    return () => {
      mounted = false;
    };
  }, [locale]);

  const setLocale = useCallback((nextLocale: Locale) => {
    if (!SUPPORTED_LOCALES.includes(nextLocale)) return;
    setCookie(LOCALE_COOKIE, nextLocale);
    setLocaleState(nextLocale);
    window.location.reload();
  }, []);

  const t = useCallback(
    (key: string) => {
      const value = getNestedValue(messages, key);
      return value ?? key;
    },
    [messages]
  );

  const value = useMemo(
    () => ({
      locale,
      setLocale,
      t,
    }),
    [locale, setLocale, t]
  );

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  const context = useContext(I18nContext);

  if (!context) {
    throw new Error("useI18n must be used within an I18nProvider");
  }

  return context;
}

export type { Locale };
