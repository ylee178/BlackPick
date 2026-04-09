import type { Locale } from "@/i18n/locales";

type BuildAuthRedirectUrlOptions = {
  fallbackOrigin?: string | null;
  locale?: Locale | null;
  localize?: boolean;
};

const LOCAL_HOSTNAMES = new Set(["localhost", "127.0.0.1", "0.0.0.0"]);

function normalizeOrigin(origin?: string | null) {
  if (!origin) return null;

  try {
    return new URL(origin).origin.replace(/\/$/, "");
  } catch {
    return null;
  }
}

function isLocalOrigin(origin: string) {
  try {
    const { hostname } = new URL(origin);
    return LOCAL_HOSTNAMES.has(hostname);
  } catch {
    return false;
  }
}

function getConfiguredSiteOrigin() {
  const configuredOrigin = normalizeOrigin(process.env.NEXT_PUBLIC_SITE_URL);
  if (configuredOrigin) return configuredOrigin;

  if (process.env.VERCEL_PROJECT_PRODUCTION_URL) {
    return normalizeOrigin(`https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`);
  }

  return null;
}

function normalizePath(path: string) {
  if (!path) return "/";
  return path.startsWith("/") ? path : `/${path}`;
}

function withLocale(path: string, locale?: Locale | null) {
  if (!locale) return path;
  if (path === "/") return `/${locale}`;
  if (path === `/${locale}` || path.startsWith(`/${locale}/`)) return path;
  return `/${locale}${path}`;
}

export function getAuthOrigin(fallbackOrigin?: string | null) {
  const normalizedFallback = normalizeOrigin(fallbackOrigin);
  if (normalizedFallback && !isLocalOrigin(normalizedFallback)) {
    return normalizedFallback;
  }

  const configuredOrigin = getConfiguredSiteOrigin();
  if (configuredOrigin) {
    return configuredOrigin;
  }

  return normalizedFallback ?? "http://localhost:3000";
}

export function buildAuthRedirectUrl(
  path: string,
  options?: BuildAuthRedirectUrlOptions,
) {
  const origin = getAuthOrigin(options?.fallbackOrigin);
  const normalizedPath = normalizePath(path);
  const finalPath =
    options?.localize === false
      ? normalizedPath
      : withLocale(normalizedPath, options?.locale);

  return `${origin}${finalPath}`;
}
