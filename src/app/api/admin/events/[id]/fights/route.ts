import { NextRequest, NextResponse } from "next/server";
import { requireAdminApi } from "@/lib/admin-auth";
import { createSupabaseAdmin } from "@/lib/supabase-admin";
import type { Database } from "@/types/database";

type FightInsert = Database["public"]["Tables"]["fights"]["Insert"];

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const adminCheck = await requireAdminApi();
  if (adminCheck.response) return adminCheck.response;

  let body: {
    fighter_a_id?: string;
    fighter_b_id?: string;
    start_time?: string;
  } = {};
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { id: eventId } = await params;
  const fighterAId = body.fighter_a_id?.trim();
  const fighterBId = body.fighter_b_id?.trim();
  const startTime = body.start_time?.trim();

  if (!fighterAId || !fighterBId || !startTime) {
    return NextResponse.json(
      { error: "fighter_a_id, fighter_b_id, and start_time are required" },
      { status: 400 },
    );
  }

  if (fighterAId === fighterBId) {
    return NextResponse.json({ error: "Fighters must be different" }, { status: 400 });
  }

  const parsedStartTime = new Date(startTime);
  if (Number.isNaN(parsedStartTime.getTime())) {
    return NextResponse.json({ error: "Invalid start_time" }, { status: 400 });
  }

  const payload: FightInsert = {
    event_id: eventId,
    fighter_a_id: fighterAId,
    fighter_b_id: fighterBId,
    start_time: parsedStartTime.toISOString(),
    status: "upcoming",
    result_processed_at: null,
  };

  const admin = createSupabaseAdmin();
  const { data, error } = await admin.from("fights").insert(payload).select("id").single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, id: data.id });
}
