import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServer } from "@/lib/supabase-server";

const PAGE_SIZE = 50;

export async function GET(request: NextRequest) {
  const supabase = await createSupabaseServer();
  const { searchParams } = new URL(request.url);

  const type = searchParams.get("type") ?? "running";
  const page = Math.max(1, Number(searchParams.get("page") ?? "1") || 1);
  const referenceId = searchParams.get("reference_id");
  const from = (page - 1) * PAGE_SIZE;
  const to = from + PAGE_SIZE - 1;

  if (!["running", "series", "event"].includes(type)) {
    return NextResponse.json(
      { error: "Invalid type. Use running, series, or event." },
      { status: 400 }
    );
  }

  if ((type === "series" || type === "event") && !referenceId) {
    return NextResponse.json(
      { error: "reference_id is required for series and event rankings." },
      { status: 400 }
    );
  }

  if (type === "running") {
    const { data, count, error } = await supabase
      .from("users")
      .select(
        "id, ring_name, wins, losses, score, current_streak, best_streak, hall_of_fame_count, created_at",
        { count: "exact" }
      )
      .order("score", { ascending: false })
      .order("best_streak", { ascending: false })
      .order("current_streak", { ascending: false })
      .order("hall_of_fame_count", { ascending: false })
      .order("created_at", { ascending: true })
      .range(from, to);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      type,
      page,
      page_size: PAGE_SIZE,
      total: count ?? 0,
      data: data ?? [],
    });
  }

  const { data, count, error } = await supabase
    .from("rankings")
    .select(
      `
      id,
      type,
      reference_id,
      score,
      rank,
      users:user_id (
        id,
        ring_name,
        wins,
        losses,
        current_streak,
        best_streak,
        hall_of_fame_count,
        created_at
      )
    `,
      { count: "exact" }
    )
    .eq("type", type as "series" | "event")
    .eq("reference_id", referenceId!)
    .order("rank", { ascending: true })
    .range(from, to);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({
    type,
    reference_id: referenceId,
    page,
    page_size: PAGE_SIZE,
    total: count ?? 0,
    data:
      data?.map((item) => ({
        id: item.id,
        rank: item.rank,
        score: item.score,
        user: item.users,
      })) ?? [],
  });
}
