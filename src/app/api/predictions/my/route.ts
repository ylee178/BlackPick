import { NextResponse } from "next/server";
import { createSupabaseServer, getUser } from "@/lib/supabase-server";

export async function GET() {
  const supabase = await createSupabaseServer();
  const user = await getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data, error } = await supabase
    .from("predictions")
    .select(`
      *,
      fights!inner(
        id,
        event_id,
        start_time,
        status,
        winner_id,
        method,
        round,
        fighter_a_id,
        fighter_b_id,
        events!inner(
          id,
          name,
          date,
          status
        ),
        fighter_a:fighters!fights_fighter_a_id_fkey(
          id,
          name,
          image_url,
          record,
          nationality,
          weight_class
        ),
        fighter_b:fighters!fights_fighter_b_id_fkey(
          id,
          name,
          image_url,
          record,
          nationality,
          weight_class
        )
      )
    `)
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json(
      { error: error.message || "Failed to fetch predictions" },
      { status: 400 }
    );
  }

  return NextResponse.json({ predictions: data ?? [] });
}
