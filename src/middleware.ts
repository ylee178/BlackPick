import createMiddleware from "next-intl/middleware";
import { NextRequest, NextResponse } from "next/server";
import { routing } from "./i18n/routing";
import { locales, type Locale } from "./i18n/locales";

const handleI18nRouting = createMiddleware(routing);

// ── CF-IPCountry → locale mapping ──

const COUNTRY_LOCALE_MAP: Record<string, Locale> = {
  KR: "ko",
  JP: "ja",
  ES: "es", MX: "es", AR: "es", CL: "es", CO: "es",
  CN: "zh-CN",
  MN: "mn",
};

/**
 * If no NEXT_LOCALE cookie and no locale in URL, inject CF-IPCountry locale
 * into the request cookie so next-intl middleware reads it during this request.
 * next-intl then persists NEXT_LOCALE in the response Set-Cookie automatically.
 */
function injectCountryLocale(req: NextRequest): void {
  if (req.cookies.get("NEXT_LOCALE")) return;

  const country = req.headers.get("cf-ipcountry");
  if (!country) return;

  const mapped = COUNTRY_LOCALE_MAP[country.toUpperCase()];
  if (mapped && locales.includes(mapped)) {
    req.cookies.set("NEXT_LOCALE", mapped);
  }
}

// ── CORS for API routes ──

function getAllowedOrigins(): string[] {
  const envOrigins = process.env.CORS_ALLOW_ORIGIN;
  if (envOrigins) return envOrigins.split(",").map((o) => o.trim());
  if (process.env.NODE_ENV !== "production") return ["http://localhost:3000"];
  return [];
}

function handleApiRequest(req: NextRequest): NextResponse {
  const origin = req.headers.get("origin");
  const allowed = getAllowedOrigins();
  const matchedOrigin = origin && allowed.includes(origin) ? origin : null;

  if (req.method === "OPTIONS") {
    const res = new NextResponse(null, { status: 204 });
    if (matchedOrigin) {
      res.headers.set("Access-Control-Allow-Origin", matchedOrigin);
      res.headers.set("Access-Control-Allow-Methods", "GET,POST,DELETE,OPTIONS");
      res.headers.set("Access-Control-Allow-Headers", "Content-Type,Authorization");
      res.headers.set("Access-Control-Max-Age", "86400");
      res.headers.set("Vary", "Origin");
    }
    return res;
  }

  const res = NextResponse.next();
  if (matchedOrigin) {
    res.headers.set("Access-Control-Allow-Origin", matchedOrigin);
    res.headers.set("Vary", "Origin");
  }
  return res;
}

// ── Main middleware ──

export default function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // API routes → CORS only, skip i18n
  if (pathname.startsWith("/api/")) {
    return handleApiRequest(req);
  }

  // Admin routes → skip i18n
  if (pathname.startsWith("/admin")) {
    return NextResponse.next();
  }

  // Inject country-based locale hint before i18n routing
  injectCountryLocale(req);

  // Everything else → i18n routing
  return handleI18nRouting(req);
}

export const config = {
  matcher: [
    // Match all paths except static files
    "/((?!_next|_vercel|.*\\..*).*)",
    "/api/:path*",
  ],
};
