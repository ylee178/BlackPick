import { NextResponse } from "next/server";
import { createSupabaseServer, getUser } from "@/lib/supabase-server";
import { createSupabaseAdmin } from "@/lib/supabase-admin";

export async function POST() {
  const supabase = await createSupabaseServer();
  const authUser = await getUser();
  if (!authUser) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const admin = createSupabaseAdmin();

  const { error: authDeleteError } = await admin.auth.admin.deleteUser(authUser.id);

  if (authDeleteError) {
    return NextResponse.json({ error: authDeleteError.message }, { status: 500 });
  }

  try {
    await supabase.auth.signOut();
  } catch (signOutError) {
    // The auth row is already gone, so treat local sign-out as best-effort
    // cookie cleanup instead of failing the entire deletion request.
    console.error("Failed to clear deleted user's local session", signOutError);
  }

  return NextResponse.json({ ok: true });
}
