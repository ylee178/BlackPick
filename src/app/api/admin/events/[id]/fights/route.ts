import { NextRequest, NextResponse } from "next/server";
import { requireAdminApi } from "@/lib/admin-auth";
import { createSupabaseAdmin } from "@/lib/supabase-admin";
import {
  parseKstDatetimeLocalToUtcIso,
  utcIsoToKstDateString,
} from "@/lib/kst-datetime";
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
  const startTimeRaw = body.start_time?.trim();

  if (!fighterAId || !fighterBId || !startTimeRaw) {
    return NextResponse.json(
      { error: "fighter_a_id, fighter_b_id, and start_time are required" },
      { status: 400 },
    );
  }

  if (fighterAId === fighterBId) {
    return NextResponse.json({ error: "Fighters must be different" }, { status: 400 });
  }

  // Clients send the raw `<input type="datetime-local">` string. We interpret
  // it here as Korea local time (the venue is in Seoul) so the stored UTC
  // value does not depend on whichever timezone the admin happens to be in.
  let startTimeIso: string;
  try {
    startTimeIso = parseKstDatetimeLocalToUtcIso(startTimeRaw);
  } catch {
    return NextResponse.json(
      { error: "start_time must be a YYYY-MM-DDTHH:MM value (Korea local time)" },
      { status: 400 },
    );
  }

  // Cross-check the Korea-local date against the parent event. Fights are
  // allowed to run past midnight into the next calendar day (common for
  // late-night cards), so we accept both event.date and event.date + 1.
  const admin = createSupabaseAdmin();
  const { data: event, error: eventError } = await admin
    .from("events")
    .select("date")
    .eq("id", eventId)
    .maybeSingle();

  if (eventError || !event) {
    return NextResponse.json({ error: "Event not found" }, { status: 404 });
  }

  const startKstDate = utcIsoToKstDateString(startTimeIso);
  const eventDate = event.date;
  const eventDateObj = new Date(`${eventDate}T00:00:00Z`);
  const nextDayObj = new Date(eventDateObj.getTime() + 24 * 60 * 60 * 1000);
  const nextDayStr = nextDayObj.toISOString().slice(0, 10);

  if (startKstDate !== eventDate && startKstDate !== nextDayStr) {
    return NextResponse.json(
      {
        error: `start_time Korea-local date ${startKstDate} does not match event date ${eventDate}`,
      },
      { status: 400 },
    );
  }

  const payload: FightInsert = {
    event_id: eventId,
    fighter_a_id: fighterAId,
    fighter_b_id: fighterBId,
    start_time: startTimeIso,
    status: "upcoming",
    result_processed_at: null,
  };

  const { data, error } = await admin.from("fights").insert(payload).select("id").single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, id: data.id });
}
