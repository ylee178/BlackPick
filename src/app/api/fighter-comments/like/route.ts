import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServer, getUser } from "@/lib/supabase-server";

export async function POST(req: NextRequest) {
  const supabase = await createSupabaseServer();
  const user = await getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: { comment_id?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (!body.comment_id) {
    return NextResponse.json({ error: "comment_id is required" }, { status: 400 });
  }

  const { data: existing } = await supabase
    .from("fighter_comment_likes")
    .select("comment_id")
    .eq("comment_id", body.comment_id)
    .eq("user_id", user.id)
    .maybeSingle();

  if (existing) {
    await supabase
      .from("fighter_comment_likes")
      .delete()
      .eq("comment_id", body.comment_id)
      .eq("user_id", user.id);
    return NextResponse.json({ liked: false });
  }

  const { error } = await supabase
    .from("fighter_comment_likes")
    .insert({ comment_id: body.comment_id, user_id: user.id });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ liked: true });
}
