import { NextRequest, NextResponse } from "next/server";
import { createHash, randomBytes } from "node:crypto";
import { createSupabaseServer, getUser } from "@/lib/supabase-server";
import { createRateLimiter, rateLimitResponse, getClientIp } from "@/lib/rate-limit";
import { validateFeedback, type FeedbackCategory } from "@/lib/feedback-validation";

const feedbackLimiter = createRateLimiter({ limit: 5, windowSeconds: 300 });

const CATEGORY_LABELS: Record<FeedbackCategory, string> = {
  bug: "Bug",
  ux: "UX",
  question: "Question",
  other: "Other",
};

// Per-process random salt: PII hardening so the in-memory rate-limit store never
// contains raw IPs. Process-scoped (not day-rotating) to avoid a midnight-UTC
// boundary where the salt changes mid-window and grants a second 5/5min budget.
const IP_SALT = randomBytes(16).toString("hex");

function hashIp(ip: string): string {
  return createHash("sha256").update(`${IP_SALT}|${ip}`).digest("hex").slice(0, 16);
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export async function POST(req: NextRequest) {
  const resendKey = process.env.RESEND_API_KEY;
  const recipient = process.env.FEEDBACK_RECIPIENT_EMAIL;
  if (!resendKey || !recipient) {
    console.error("[feedback] missing RESEND_API_KEY or FEEDBACK_RECIPIENT_EMAIL");
    return NextResponse.json({ error: "Feedback not configured" }, { status: 503 });
  }

  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const input = (raw ?? {}) as Record<string, unknown>;
  const validation = validateFeedback({
    category: input.category,
    body: input.body,
    contactEmail: input.contactEmail,
  });
  if (!validation.ok) {
    return NextResponse.json({ error: validation.error }, { status: 400 });
  }
  const { category, body, contactEmail } = validation.data;

  const user = await getUser();

  const rateKey = user ? `u:${user.id}` : `ip:${hashIp(getClientIp(req))}`;
  const { allowed, resetInSeconds } = feedbackLimiter.check(rateKey);
  if (!allowed) return rateLimitResponse(resetInSeconds);

  let ringName: string | null = null;
  let stats: { score: number; wins: number; losses: number; current_streak: number } | null = null;
  let replyTo: string | null = null;

  if (user) {
    replyTo = user.email ?? null;
    const supabase = await createSupabaseServer();
    const { data: row } = await supabase
      .from("users")
      .select("ring_name, score, wins, losses, current_streak")
      .eq("id", user.id)
      .maybeSingle();
    if (row) {
      ringName = row.ring_name;
      stats = {
        score: row.score,
        wins: row.wins,
        losses: row.losses,
        current_streak: row.current_streak,
      };
    }
  } else {
    replyTo = contactEmail;
  }

  const pageUrl = req.headers.get("referer") ?? "(unknown)";
  const userAgent = req.headers.get("user-agent") ?? "(unknown)";
  const timestamp = new Date().toISOString();
  const label = CATEGORY_LABELS[category];
  const identifier = ringName ?? "익명";
  const firstLine = body.split(/\r?\n/)[0]!.slice(0, 40);
  const subject = `[BP Feedback] [${label}] ${identifier} — ${firstLine}`;

  const statLine = stats
    ? `Score ${stats.score} · W-L ${stats.wins}-${stats.losses} · Streak ${stats.current_streak}`
    : "(anonymous)";

  const textBody = [
    `Category: ${label}`,
    `User: ${identifier}`,
    `Email: ${replyTo ?? "(none)"}`,
    `Stats: ${statLine}`,
    `Page: ${pageUrl}`,
    `UA: ${userAgent}`,
    `Time: ${timestamp}`,
    "",
    "--- Feedback ---",
    body,
  ].join("\n");

  const htmlBody = `<!doctype html>
<html><body style="font-family:ui-monospace,Menlo,monospace;white-space:pre-wrap;color:#111">
<strong>Category:</strong> ${escapeHtml(label)}
<strong>User:</strong> ${escapeHtml(identifier)}
<strong>Email:</strong> ${escapeHtml(replyTo ?? "(none)")}
<strong>Stats:</strong> ${escapeHtml(statLine)}
<strong>Page:</strong> ${escapeHtml(pageUrl)}
<strong>UA:</strong> ${escapeHtml(userAgent)}
<strong>Time:</strong> ${escapeHtml(timestamp)}
<hr>
${escapeHtml(body)}
</body></html>`;

  const resendPayload: Record<string, unknown> = {
    from: "Black Pick <noreply@blackpick.io>",
    to: recipient,
    subject,
    text: textBody,
    html: htmlBody,
  };
  if (replyTo) resendPayload.reply_to = replyTo;

  let resp: Response;
  try {
    resp = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${resendKey}`,
      },
      body: JSON.stringify(resendPayload),
    });
  } catch (err) {
    console.error("[feedback] resend fetch failed:", err);
    return NextResponse.json({ error: "Email service unreachable" }, { status: 503 });
  }

  if (!resp.ok) {
    const detail = await resp.text().catch(() => "");
    console.error(`[feedback] resend ${resp.status}:`, detail);
    return NextResponse.json({ error: "Email service failed" }, { status: 503 });
  }

  return NextResponse.json({ ok: true });
}
