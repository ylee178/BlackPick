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
  const { data: fight, error: fightError } = await admin
    .from("fights")
    .select("id, fighter_a_id, fighter_b_id, result_processed_at")
    .eq("id", fightId)
    .maybeSingle();

  if (fightError) {
    return NextResponse.json({ error: fightError.message }, { status: 500 });
  }

  if (!fight) {
    return NextResponse.json({ error: "Fight not found" }, { status: 404 });
  }

  if (fight.result_processed_at) {
    return NextResponse.json(
      { error: "Fight result has already been processed" },
      { status: 409 },
    );
  }

  if (![fight.fighter_a_id, fight.fighter_b_id].includes(winnerId)) {
    return NextResponse.json({ error: "winner_id does not belong to the selected fight" }, { status: 400 });
  }

  const { error: updateError } = await admin
    .from("fights")
    .update({
      winner_id: winnerId,
      method,
      round,
      status: "completed",
      result_processed_at: null,
    })
    .eq("id", fightId);

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 });
  }

  const { error: rpcError } = await admin.rpc("process_fight_result", {
    p_fight_id: fightId,
  });

  if (rpcError) {
    return NextResponse.json({ error: rpcError.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
