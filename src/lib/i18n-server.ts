import { cookies } from "next/headers";

export type Locale = "en" | "ko" | "ja" | "pt-BR";

const SUPPORTED: Locale[] = ["en", "ko", "ja", "pt-BR"];

interface Messages {
  [key: string]: string | Messages;
}

export async function getLocale(): Promise<Locale> {
  const cookieStore = await cookies();
  const raw = cookieStore.get("locale")?.value || "en";
  return SUPPORTED.includes(raw as Locale) ? (raw as Locale) : "en";
}

async function loadMessages(locale: Locale): Promise<Messages> {
  switch (locale) {
    case "ko":
      return (await import("@/messages/ko.json")).default;
    case "ja":
      return (await import("@/messages/ja.json")).default;
    case "pt-BR":
      return (await import("@/messages/pt-BR.json")).default;
    default:
      return (await import("@/messages/en.json")).default;
  }
}

function getNestedValue(obj: Messages, key: string): string {
  const parts = key.split(".");
  let current: string | Messages = obj;
  for (const part of parts) {
    if (typeof current !== "object" || !(part in current)) return key;
    current = current[part];
  }
  return typeof current === "string" ? current : key;
}

export async function getTranslations() {
  const locale = await getLocale();
  const messages = await loadMessages(locale);
  return {
    locale,
    t: (key: string) => getNestedValue(messages, key),
  };
}
