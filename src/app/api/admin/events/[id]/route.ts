import { NextRequest, NextResponse } from "next/server";
import { requireAdminApi } from "@/lib/admin-auth";
import { createSupabaseAdmin } from "@/lib/supabase-admin";
import type { Database } from "@/types/database";

type EventStatus = Database["public"]["Tables"]["events"]["Row"]["status"];

const VALID_EVENT_STATUSES = new Set<EventStatus>(["upcoming", "live", "completed"]);

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const adminCheck = await requireAdminApi();
  if (adminCheck.response) return adminCheck.response;

  let body: { status?: EventStatus } = {};
  try {
    body = (await req.json()) as { status?: EventStatus };
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { id } = await params;
  const status = body.status;

  if (!status || !VALID_EVENT_STATUSES.has(status)) {
    return NextResponse.json({ error: "Valid status is required" }, { status: 400 });
  }

  const admin = createSupabaseAdmin();
  const { error } = await admin.from("events").update({ status }).eq("id", id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
