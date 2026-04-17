import { NextRequest, NextResponse } from "next/server";
import { requireAdminApi } from "@/lib/admin-auth";
import { createSupabaseAdmin } from "@/lib/supabase-admin";
import { type FightMethod, validateAdminResultPayload } from "@/lib/admin-results";

export async function POST(req: NextRequest) {
  const adminCheck = await requireAdminApi();
  if (adminCheck.response) return adminCheck.response;

  let body: {
    fight_id?: string;
    winner_id?: string;
    method?: FightMethod;
    round?: number;
  } = {};
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const validated = validateAdminResultPayload(body);
  if (!validated.ok) {
    return NextResponse.json({ error: validated.error }, { status: validated.status });
  }
  const { fightId, winnerId, method, round } = validated.value;

  const admin = createSupabaseAdmin();
  const { error: rpcError } = await admin.rpc("admin_process_fight_result", {
    p_fight_id: fightId,
    p_winner_id: winnerId,
    p_method: method,
    p_round: round,
  });

  if (rpcError) {
    const message = rpcError.message || "Failed to process fight result";

    if (message.includes("Fight not found")) {
      return NextResponse.json({ error: message }, { status: 404 });
    }
    if (message.includes("already been processed")) {
      return NextResponse.json({ error: message }, { status: 409 });
    }
    if (
      message.includes("winner_id does not belong") ||
      message.includes("round must be between") ||
      message.includes("method must be")
    ) {
      return NextResponse.json({ error: message }, { status: 400 });
    }

    return NextResponse.json({ error: message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
