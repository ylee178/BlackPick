import type { Locale } from "@/i18n/locales";

function normalizeInternalPath(path: string | null | undefined, fallback = "/") {
  if (!path) return fallback;

  let normalized = path;

  try {
    normalized = decodeURIComponent(path);
  } catch {
    normalized = path;
  }

  if (!normalized.startsWith("/") || normalized.startsWith("//")) {
    return fallback;
  }

  return normalized;
}

export function getSafeAuthNext(path: string | null | undefined, fallback = "/") {
  return normalizeInternalPath(path, fallback);
}

export function buildLocalizedAuthPath(
  route: "login" | "signup",
  locale: Locale,
  nextPath?: string | null,
) {
  const safeNext = getSafeAuthNext(nextPath, "/");
  const basePath = `/${locale}/${route}`;

  if (safeNext === "/") {
    return basePath;
  }

  return `${basePath}?next=${encodeURIComponent(safeNext)}`;
}
