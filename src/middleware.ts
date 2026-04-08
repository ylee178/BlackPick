import createMiddleware from "next-intl/middleware";
import { NextRequest, NextResponse } from "next/server";
import { routing } from "./i18n/routing";

const handleI18nRouting = createMiddleware(routing);

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
