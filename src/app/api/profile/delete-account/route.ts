import { NextResponse } from "next/server";
import { createSupabaseServer, getUser } from "@/lib/supabase-server";
import { createSupabaseAdmin } from "@/lib/supabase-admin";

export async function POST() {
  const supabase = await createSupabaseServer();
  const authUser = await getUser();
  if (!authUser) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Soft delete — mark as deleted, keep data for recovery
  const admin = createSupabaseAdmin();
  await admin
    .from("users")
    .update({ deleted_at: new Date().toISOString() } as Record<string, unknown>)
    .eq("id", authUser.id);

  // Sign out the auth session
  await supabase.auth.signOut();

  return NextResponse.json({ ok: true });
}
