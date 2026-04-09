import { createSupabaseServer } from "@/lib/supabase-server";
import { NextRequest, NextResponse } from "next/server";
import { locales, type Locale } from "@/i18n/locales";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/";

  const supabase = await createSupabaseServer();

  if (code) {
    const { data } = await supabase.auth.exchangeCodeForSession(code);

    // Sync user's preferred language to NEXT_LOCALE cookie
    if (data?.user) {
      const { data: profile } = await supabase
        .from("users")
        .select("preferred_language")
        .eq("id", data.user.id)
        .maybeSingle();

      if (profile?.preferred_language && locales.includes(profile.preferred_language as Locale)) {
        const res = NextResponse.redirect(new URL(
          next.startsWith("/") && !next.startsWith("//") ? next : "/",
          request.url,
        ));
        res.cookies.set("NEXT_LOCALE", profile.preferred_language, {
          path: "/",
          maxAge: 365 * 24 * 60 * 60,
          sameSite: "lax",
        });
        return res;
      }
    }
  }

  // Only allow internal relative paths — block open redirect
  const safePath = next.startsWith("/") && !next.startsWith("//") ? next : "/";

  return NextResponse.redirect(new URL(safePath, request.url));
}
