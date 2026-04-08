import { NextRequest, NextResponse } from "next/server";

/**
 * CORS middleware — only applied to /api/* routes.
 * In production, restricts to CORS_ALLOW_ORIGIN env var.
 * In development, allows localhost.
 */

function getAllowedOrigins(): string[] {
  const envOrigins = process.env.CORS_ALLOW_ORIGIN;
  if (envOrigins) return envOrigins.split(",").map((o) => o.trim());
  if (process.env.NODE_ENV !== "production") return ["http://localhost:3000"];
  return [];
}

const ALLOW_METHODS = "GET,POST,DELETE,OPTIONS";
const ALLOW_HEADERS = "Content-Type,Authorization";

function isAllowedOrigin(origin: string | null): string | null {
  if (!origin) return null;
  const allowed = getAllowedOrigins();
  if (allowed.length === 0) return null;
  return allowed.includes(origin) ? origin : null;
}

function applyCorsHeaders(res: NextResponse, origin: string | null) {
  if (origin) {
    res.headers.set("Access-Control-Allow-Origin", origin);
    res.headers.set("Access-Control-Allow-Methods", ALLOW_METHODS);
    res.headers.set("Access-Control-Allow-Headers", ALLOW_HEADERS);
    res.headers.set("Access-Control-Max-Age", "86400");
    res.headers.set("Vary", "Origin");
  }
  return res;
}

export function middleware(req: NextRequest) {
  const origin = req.headers.get("origin");
  const allowed = isAllowedOrigin(origin);

  // Preflight
  if (req.method === "OPTIONS") {
    const res = new NextResponse(null, { status: 204 });
    return applyCorsHeaders(res, allowed);
  }

  const res = NextResponse.next();
  return applyCorsHeaders(res, allowed);
}

export const config = {
  matcher: ["/api/:path*"],
};
