import { createSupabaseServer } from "@/lib/supabase-server";
import { NextRequest, NextResponse } from "next/server";
import { locales, type Locale } from "@/i18n/locales";
import { getSafeAuthNext } from "@/lib/auth-next";

/** Extract a locale prefix from a path like `/ko/foo` so we can redirect the
 *  error page to the same locale the user was in before OAuth started. */
function extractLocaleFromPath(path: string): Locale | null {
  const match = path.match(/^\/([^/]+)(?:\/|$)/);
  const candidate = match?.[1];
  return candidate && (locales as readonly string[]).includes(candidate)
    ? (candidate as Locale)
    : null;
}

function buildLoginErrorUrl(request: NextRequest, errorCode: string, safeNext: string) {
  const locale = extractLocaleFromPath(safeNext);
  const loginPath = locale ? `/${locale}/login` : "/login";
  const loginUrl = new URL(loginPath, request.url);
  loginUrl.searchParams.set("error", errorCode);
  if (safeNext !== "/" && safeNext !== `/${locale}`) {
    loginUrl.searchParams.set("next", safeNext);
  }
  return loginUrl;
}

export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const safeNext = getSafeAuthNext(url.searchParams.get("next"));

  if (!code) {
    return NextResponse.redirect(
      buildLoginErrorUrl(request, "oauth_callback_missing", safeNext),
    );
  }

  const supabase = await createSupabaseServer();
  const { data, error } = await supabase.auth.exchangeCodeForSession(code);

  if (error || !data?.session) {
    console.error("OAuth code exchange failed", error);
    return NextResponse.redirect(
      buildLoginErrorUrl(request, "oauth_exchange_failed", safeNext),
    );
  }

  const res = NextResponse.redirect(new URL(safeNext, request.url));

  // Sync user's preferred language to NEXT_LOCALE cookie
  if (data.user) {
    const { data: profile } = await supabase
      .from("users")
      .select("preferred_language")
      .eq("id", data.user.id)
      .maybeSingle();

    if (profile?.preferred_language && locales.includes(profile.preferred_language as Locale)) {
      res.cookies.set("NEXT_LOCALE", profile.preferred_language, {
        path: "/",
        maxAge: 365 * 24 * 60 * 60,
        sameSite: "lax",
      });
    }
  }

  return res;
}
