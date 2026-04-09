import { NextResponse } from "next/server";
import { getUser } from "@/lib/supabase-server";
import { createSupabaseAdmin } from "@/lib/supabase-admin";

export async function POST() {
  const authUser = await getUser();
  if (!authUser) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const admin = createSupabaseAdmin();

  const [
    predictionsResult,
    weightStatsResult,
    hallOfFameResult,
    perfectCardResult,
    rankingsResult,
  ] = await Promise.all([
    admin.from("predictions").delete().eq("user_id", authUser.id),
    admin.from("user_weight_class_stats").delete().eq("user_id", authUser.id),
    admin.from("hall_of_fame_entries").delete().eq("user_id", authUser.id),
    admin.from("perfect_card_entries").delete().eq("user_id", authUser.id),
    admin.from("rankings").delete().eq("user_id", authUser.id),
  ]);

  const deleteError =
    predictionsResult.error ??
    weightStatsResult.error ??
    hallOfFameResult.error ??
    perfectCardResult.error ??
    rankingsResult.error;

  if (deleteError) {
    return NextResponse.json({ error: deleteError.message }, { status: 500 });
  }

  const { error: updateError } = await admin
    .from("users")
    .update({
      score: 0,
      wins: 0,
      losses: 0,
      current_streak: 0,
      best_streak: 0,
      hall_of_fame_count: 0,
      p4p_score: 0,
    })
    .eq("id", authUser.id);

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
