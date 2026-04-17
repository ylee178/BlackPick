import { NextResponse } from "next/server";
import { getUser } from "@/lib/supabase-server";
import { createSupabaseAdmin } from "@/lib/supabase-admin";

export async function POST() {
  const authUser = await getUser();
  if (!authUser) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const admin = createSupabaseAdmin();
  const { error } = await admin.rpc("reset_user_record", {
    p_user_id: authUser.id,
  });

  if (error) {
    const message = error.message || "Failed to reset record";
    const status = message.includes("User not found") ? 404 : 500;
    return NextResponse.json({ error: message }, { status });
  }

  return NextResponse.json({ ok: true });
}
