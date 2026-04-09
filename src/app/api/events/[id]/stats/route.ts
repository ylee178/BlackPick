import { NextResponse } from "next/server";
import { createSupabaseServer } from "@/lib/supabase-server";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createSupabaseServer();
  const { id } = await params;

  const { data: fights, error: fightsError } = await supabase
    .from("fights")
    .select(`
      id,
      event_id,
      fighter_a_id,
      fighter_b_id,
      start_time,
      status,
      fighter_a:fighters!fights_fighter_a_id_fkey(id, name),
      fighter_b:fighters!fights_fighter_b_id_fkey(id, name)
    `)
    .eq("event_id", id)
    .order("start_time", { ascending: true });

  if (fightsError) {
    return NextResponse.json(
      { error: fightsError.message || "Failed to fetch fights" },
      { status: 400 }
    );
  }

  const fightIds = (fights ?? []).map((fight) => fight.id);

  if (fightIds.length === 0) {
    return NextResponse.json({ stats: [] });
  }

  const { data: predictions, error: predictionsError } = await supabase
    .from("predictions")
    .select("fight_id, winner_id")
    .in("fight_id", fightIds);

  if (predictionsError) {
    return NextResponse.json(
      { error: predictionsError.message || "Failed to fetch stats" },
      { status: 400 }
    );
  }

  const stats = (fights ?? []).map((fight) => {
    const fightPredictions = (predictions ?? []).filter(
      (prediction) => prediction.fight_id === fight.id
    );
    const total = fightPredictions.length;
    const fighterACount = fightPredictions.filter(
      (prediction) => prediction.winner_id === fight.fighter_a_id
    ).length;
    const fighterBCount = fightPredictions.filter(
      (prediction) => prediction.winner_id === fight.fighter_b_id
    ).length;

    return {
      fight_id: fight.id,
      total_predictions: total,
      fighter_a: {
        id: fight.fighter_a_id,
        name: (fight as any).fighter_a?.name ?? "Fighter A",
        percentage: total > 0 ? Math.round((fighterACount / total) * 100) : 0,
        count: fighterACount,
      },
      fighter_b: {
        id: fight.fighter_b_id,
        name: (fight as any).fighter_b?.name ?? "Fighter B",
        percentage: total > 0 ? Math.round((fighterBCount / total) * 100) : 0,
        count: fighterBCount,
      },
    };
  });

  return NextResponse.json({ stats }, {
    headers: {
      "Cache-Control": "public, s-maxage=60, stale-while-revalidate=120",
    },
  });
}
