import { NextResponse } from "next/server";
import { createSupabaseServer, getUser } from "@/lib/supabase-server";

export async function POST() {
  const supabase = await createSupabaseServer();
  const authUser = await getUser();
  if (!authUser) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Reset user stats
  await supabase.from("users").update({
    score: 0, wins: 0, losses: 0,
    current_streak: 0, best_streak: 0,
    hall_of_fame_count: 0, p4p_score: 0,
  }).eq("id", authUser.id);

  // Delete related data
  await supabase.from("predictions").delete().eq("user_id", authUser.id);
  await supabase.from("user_weight_class_stats").delete().eq("user_id", authUser.id);
  await supabase.from("hall_of_fame_entries").delete().eq("user_id", authUser.id);
  await supabase.from("perfect_card_entries").delete().eq("user_id", authUser.id);
  await supabase.from("rankings").delete().eq("user_id", authUser.id);

  return NextResponse.json({ ok: true });
}
