import { NextResponse } from "next/server";
import { createSupabaseServer, getUser } from "@/lib/supabase-server";
import { createSupabaseAdmin } from "@/lib/supabase-admin";

export async function POST() {
  const supabase = await createSupabaseServer();
  const authUser = await getUser();
  if (!authUser) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const admin = createSupabaseAdmin();

  const { error: profileDeleteError } = await admin
    .from("users")
    .delete()
    .eq("id", authUser.id);

  if (profileDeleteError) {
    return NextResponse.json({ error: profileDeleteError.message }, { status: 500 });
  }

  const { error: authDeleteError } = await admin.auth.admin.deleteUser(authUser.id);

  if (authDeleteError) {
    return NextResponse.json({ error: authDeleteError.message }, { status: 500 });
  }

  await supabase.auth.signOut();

  return NextResponse.json({ ok: true });
}
