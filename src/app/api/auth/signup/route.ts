import { NextResponse } from "next/server";
import { buildAuthRedirectUrl } from "@/lib/auth-redirect";
import { createSupabaseServer } from "@/lib/supabase-server";
import { createRateLimiter, getClientIp, rateLimitResponse } from "@/lib/rate-limit";
import { isWeakPassword } from "@/lib/weak-passwords";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const signupLimiter = createRateLimiter({ limit: 5, windowSeconds: 60 });

function getSignupRateLimitKey(request: Request, email: string) {
  return `${getClientIp(request)}:${email}`;
}

export async function POST(request: Request) {
  let body: { email?: string; password?: string } = {};

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ code: "invalid_payload" }, { status: 400 });
  }

  const email = body.email?.trim().toLowerCase() ?? "";
  const password = body.password ?? "";

  if (!EMAIL_PATTERN.test(email)) {
    return NextResponse.json({ code: "invalid_email" }, { status: 400 });
  }

  if (password.length < 6) {
    return NextResponse.json({ code: "password_too_short" }, { status: 400 });
  }

  // Pre-block the worst-of-the-worst regardless of Supabase leak-check state.
  // Keeps UX consistent across DEV/PROD projects (whose leak toggle can
  // diverge) and cuts the Supabase round-trip for obvious rejects.
  if (isWeakPassword(password)) {
    return NextResponse.json({ code: "password_compromised" }, { status: 400 });
  }

  const { allowed, resetInSeconds } = signupLimiter.check(
    getSignupRateLimitKey(request, email),
  );
  if (!allowed) {
    return rateLimitResponse(resetInSeconds);
  }

  try {
    const supabase = await createSupabaseServer();
    const origin = new URL(request.url).origin;
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: buildAuthRedirectUrl("/api/auth/callback?next=/", {
          fallbackOrigin: origin,
          localize: false,
        }),
      },
    });

    if (error) {
      const message = error.message.toLowerCase();

      // Avoid leaking whether the address already belongs to an existing account.
      if (message.includes("already")) {
        return NextResponse.json({ mode: "check_email" });
      }

      // Surface Supabase's HIBP / strength check as a specific error so
      // the UI can show "this password has been found in breaches" instead
      // of a generic "something went wrong" that leaves the user stuck.
      if (
        message.includes("pwned") ||
        message.includes("compromis") ||
        message.includes("leaked") ||
        message.includes("breach")
      ) {
        return NextResponse.json({ code: "password_compromised" }, { status: 400 });
      }

      console.error("Failed to create signup", error);
      return NextResponse.json({ code: "unexpected_error" }, { status: 500 });
    }

    return NextResponse.json({
      mode: data.session ? "signed_in" : "check_email",
    });
  } catch (error) {
    console.error("Failed to complete signup", error);
    return NextResponse.json({ code: "unexpected_error" }, { status: 500 });
  }
}
