import { NextRequest, NextResponse } from "next/server";
import { requireAdminApi } from "@/lib/admin-auth";
import { createSupabaseAdmin } from "@/lib/supabase-admin";
import type { Database } from "@/types/database";

type EventInsert = Database["public"]["Tables"]["events"]["Insert"];

const VALID_SERIES_TYPES = new Set<EventInsert["series_type"]>([
  "black_cup",
  "numbering",
  "rise",
  "other",
]);
const VALID_EVENT_STATUSES = new Set<EventInsert["status"]>(["upcoming", "live", "completed"]);

export async function POST(req: NextRequest) {
  const adminCheck = await requireAdminApi();
  if (adminCheck.response) return adminCheck.response;

  let body: Partial<EventInsert> = {};
  try {
    body = (await req.json()) as Partial<EventInsert>;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const name = body.name?.trim();
  const seriesType = body.series_type;
  const date = body.date;
  const status = body.status;
  const mvpVideoUrl = typeof body.mvp_video_url === "string" ? body.mvp_video_url.trim() : "";

  if (!name || !seriesType || !date || !status) {
    return NextResponse.json({ error: "name, series_type, date, and status are required" }, { status: 400 });
  }

  if (!VALID_SERIES_TYPES.has(seriesType)) {
    return NextResponse.json({ error: "Invalid series_type" }, { status: 400 });
  }

  if (!VALID_EVENT_STATUSES.has(status)) {
    return NextResponse.json({ error: "Invalid status" }, { status: 400 });
  }

  if (Number.isNaN(Date.parse(date))) {
    return NextResponse.json({ error: "Invalid date" }, { status: 400 });
  }

  const admin = createSupabaseAdmin();
  const { data, error } = await admin
    .from("events")
    .insert({
      name,
      series_type: seriesType,
      date,
      status,
      mvp_video_url: mvpVideoUrl || null,
    })
    .select("id")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, id: data.id });
}
