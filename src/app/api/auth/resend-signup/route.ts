import { NextResponse } from "next/server";
import { buildAuthRedirectUrl } from "@/lib/auth-redirect";
import { createSupabaseServer } from "@/lib/supabase-server";
import { createRateLimiter, getClientIp, rateLimitResponse } from "@/lib/rate-limit";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Tighter than signup itself (5/min): resend is a repeat-request, and Supabase
// already enforces a per-address cooldown. Limiter here exists to stop a bot
// from hammering the endpoint once the Supabase address window is open.
const resendLimiter = createRateLimiter({ limit: 3, windowSeconds: 300 });

export async function POST(request: Request) {
  let body: { email?: string } = {};
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ code: "invalid_payload" }, { status: 400 });
  }

  const email = body.email?.trim().toLowerCase() ?? "";
  if (!EMAIL_PATTERN.test(email)) {
    return NextResponse.json({ code: "invalid_email" }, { status: 400 });
  }

  const key = `${getClientIp(request)}:${email}`;
  const { allowed, resetInSeconds } = resendLimiter.check(key);
  if (!allowed) return rateLimitResponse(resetInSeconds);

  try {
    const supabase = await createSupabaseServer();
    const origin = new URL(request.url).origin;
    const { error } = await supabase.auth.resend({
      type: "signup",
      email,
      options: {
        emailRedirectTo: buildAuthRedirectUrl("/api/auth/callback?next=/", {
          fallbackOrigin: origin,
          localize: false,
        }),
      },
    });

    // Supabase returns a generic non-error for already-confirmed accounts and
    // unknown addresses, which is desirable (no email enumeration). A real
    // error here means the upstream SMTP / Resend path is broken — surface
    // 500 so the client can tell the user to try later.
    if (error) {
      console.error("[auth/resend-signup] supabase error", error);
      return NextResponse.json({ code: "unexpected_error" }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[auth/resend-signup] unexpected", error);
    return NextResponse.json({ code: "unexpected_error" }, { status: 500 });
  }
}
