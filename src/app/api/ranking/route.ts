import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServer } from "@/lib/supabase-server";

function jsonCached(data: unknown, maxAge = 300) {
  return NextResponse.json(data, {
    headers: {
      "Cache-Control": `public, s-maxage=${maxAge}, stale-while-revalidate=${maxAge * 2}`,
    },
  });
}

const PAGE_SIZE = 50;

export async function GET(request: NextRequest) {
  const supabase = await createSupabaseServer();
  const { searchParams } = new URL(request.url);

  const type = searchParams.get("type") ?? "running";
  const page = Math.max(1, Number(searchParams.get("page") ?? "1") || 1);
  const referenceId = searchParams.get("reference_id");
  const seriesType = searchParams.get("series_type");
  const limitParam = Number(searchParams.get("limit") || "0") || 0;
  const effectivePageSize = limitParam > 0 ? Math.min(limitParam, PAGE_SIZE) : PAGE_SIZE;
  const from = (page - 1) * effectivePageSize;
  const to = from + effectivePageSize - 1;

  if (!["running", "series", "event"].includes(type)) {
    return NextResponse.json(
      { error: "Invalid type. Use running, series, or event." },
      { status: 400 }
    );
  }

  // For series type, aggregate user scores across all events of that series
  if (type === "series" && seriesType) {
    const { data: seriesEvents } = await supabase
      .from("events")
      .select("id")
      .eq("series_type", seriesType as "black_cup" | "numbering" | "rise" | "other");

    const eventIds = (seriesEvents ?? []).map((e: { id: string }) => e.id);

    if (eventIds.length === 0) {
      return NextResponse.json({ type, data: [] });
    }

    const { data } = await supabase
      .from("rankings")
      .select("id, rank, score, user:users!user_id(id, ring_name, score, wins, losses)")
      .eq("type", "series")
      .in("reference_id", eventIds)
      .order("rank", { ascending: true })
      .limit(effectivePageSize);

    return NextResponse.json({
      type,
      series_type: seriesType,
      data: (data ?? []).map((item) => ({
        id: item.id,
        rank: item.rank,
        score: item.score,
        user: item.user,
      })),
    });
  }

  if ((type === "series" || type === "event") && !referenceId) {
    return NextResponse.json(
      { error: "reference_id or series_type is required." },
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

    return jsonCached({
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

  return jsonCached({
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
