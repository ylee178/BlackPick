import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServer, getUser } from "@/lib/supabase-server";
import { createRateLimiter, rateLimitResponse } from "@/lib/rate-limit";

const commentLimiter = createRateLimiter({ limit: 20, windowSeconds: 60 }); // 20 per min

type CommentPayload = {
  fight_id?: string;
  body?: string;
  parent_id?: string | null;
};

async function validateParentComment(
  supabase: Awaited<ReturnType<typeof createSupabaseServer>>,
  parentId: string,
  fightId: string,
) {
  const { data, error } = await supabase
    .from("fight_comments")
    .select("id, fight_id")
    .eq("id", parentId)
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  if (!data) {
    return NextResponse.json({ error: "Parent comment not found" }, { status: 400 });
  }

  if (data.fight_id !== fightId) {
    return NextResponse.json(
      { error: "Parent comment must belong to the same fight" },
      { status: 400 },
    );
  }

  return null;
}

export async function GET(req: NextRequest) {
  const supabase = await createSupabaseServer();
  const user = await getUser();
  const { searchParams } = new URL(req.url);
  const fightId = searchParams.get("fight_id");

  if (!fightId) {
    return NextResponse.json({ error: "fight_id is required" }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("fight_comments")
    .select(`
      id, fight_id, user_id, parent_id, body, created_at,
      users!fight_comments_user_id_fkey(id, ring_name)
    `)
    .eq("fight_id", fightId)
    .order("created_at", { ascending: true });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  const comments = data ?? [];
  const commentIds = comments.map((c) => c.id);

  // Fetch like counts + current user's likes
  const likeCounts: Record<string, number> = {};
  const myLikes: Set<string> = new Set();

  if (commentIds.length > 0) {
    const { data: likes, error: likesError } = await supabase
      .from("comment_likes")
      .select("comment_id, user_id")
      .in("comment_id", commentIds);

    if (!likesError) {
      for (const like of likes ?? []) {
        likeCounts[like.comment_id] = (likeCounts[like.comment_id] ?? 0) + 1;
        if (user && like.user_id === user.id) myLikes.add(like.comment_id);
      }
    }
  }

  const enriched = comments.map((c) => ({
    ...c,
    like_count: likeCounts[c.id] ?? 0,
    is_liked: myLikes.has(c.id),
  }));

  return NextResponse.json({ comments: enriched });
}

export async function POST(req: NextRequest) {
  const supabase = await createSupabaseServer();
  const user = await getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { allowed, resetInSeconds } = commentLimiter.check(user.id);
  if (!allowed) return rateLimitResponse(resetInSeconds);

  let payload: CommentPayload;
  try {
    payload = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const fight_id = payload.fight_id?.trim();
  const parent_id = payload.parent_id?.trim() || null;
  const trimmedBody = payload.body?.trim() ?? "";

  if (!fight_id || trimmedBody.length === 0) {
    return NextResponse.json({ error: "fight_id and body are required" }, { status: 400 });
  }

  if (trimmedBody.length > 500) {
    return NextResponse.json({ error: "Comment must be 500 characters or less" }, { status: 400 });
  }

  if (parent_id) {
    const parentError = await validateParentComment(supabase, parent_id, fight_id);
    if (parentError) return parentError;
  }

  const { data, error } = await supabase
    .from("fight_comments")
    .insert({
      fight_id,
      user_id: user.id,
      parent_id,
      body: trimmedBody,
    })
    .select(`
      id, fight_id, user_id, parent_id, body, created_at,
      users!fight_comments_user_id_fkey(id, ring_name)
    `)
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ comment: { ...data, like_count: 0, is_liked: false } });
}

export async function DELETE(req: NextRequest) {
  const supabase = await createSupabaseServer();
  const user = await getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const commentId = searchParams.get("id");

  if (!commentId) {
    return NextResponse.json({ error: "id is required" }, { status: 400 });
  }

  const { error } = await supabase
    .from("fight_comments")
    .delete()
    .eq("id", commentId)
    .eq("user_id", user.id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ success: true });
}
