import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServer, getUser } from "@/lib/supabase-server";
import { getMvpVotingDeadline } from "@/lib/mvp-vote-window";

type VotePayload = {
  event_id?: string;
  fighter_id?: string;
};

type VoteResultRow = {
  fighter_id: string;
  fighters: {
    id: string;
    name: string;
    ring_name: string | null;
    name_en: string | null;
    name_ko: string | null;
    image_url: string | null;
  } | null;
};

export async function POST(req: NextRequest) {
  const supabase = await createSupabaseServer();
  const user = await getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: VotePayload;

  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { event_id, fighter_id } = body;

  if (!event_id || !fighter_id) {
    return NextResponse.json(
      { error: "event_id and fighter_id are required" },
      { status: 400 }
    );
  }

  const { data: event, error: eventError } = await supabase
    .from("events")
    .select("id, status, date, completed_at")
    .eq("id", event_id)
    .single();

  if (eventError || !event) {
    return NextResponse.json({ error: "Event not found" }, { status: 404 });
  }

  if (event.status !== "completed") {
    return NextResponse.json(
      { error: "MVP voting is only available after event completion" },
      { status: 400 }
    );
  }

  let votingDeadline: Date;
  try {
    votingDeadline = getMvpVotingDeadline(event.date, event.completed_at);
  } catch (deadlineError) {
    console.error("Failed to derive MVP voting deadline", deadlineError);
    return NextResponse.json({ error: "Invalid event completion time" }, { status: 500 });
  }

  if (Date.now() > votingDeadline.getTime()) {
    return NextResponse.json(
      { error: "MVP voting window has ended" },
      { status: 400 }
    );
  }

  const { data: fights, error: fightsError } = await supabase
    .from("fights")
    .select("fighter_a_id, fighter_b_id")
    .eq("event_id", event_id);

  if (fightsError) {
    return NextResponse.json(
      { error: fightsError.message || "Failed to validate fighter" },
      { status: 400 }
    );
  }

  const fighterIds = new Set<string>();
  for (const fight of fights ?? []) {
    fighterIds.add(fight.fighter_a_id);
    fighterIds.add(fight.fighter_b_id);
  }

  if (!fighterIds.has(fighter_id)) {
    return NextResponse.json(
      { error: "Selected fighter is not part of this event" },
      { status: 400 }
    );
  }

  const { data, error } = await supabase
    .from("mvp_votes")
    .insert({
      user_id: user.id,
      event_id,
      fighter_id,
    })
    .select("*")
    .single();

  if (error) {
    return NextResponse.json(
      { error: error.message || "Failed to submit MVP vote" },
      { status: 400 }
    );
  }

  return NextResponse.json({ vote: data });
}

export async function GET(req: NextRequest) {
  const supabase = await createSupabaseServer();
  const { searchParams } = new URL(req.url);
  const eventId = searchParams.get("event_id");

  if (!eventId) {
    return NextResponse.json({ error: "event_id is required" }, { status: 400 });
  }

  const { data: votes, error } = await supabase
    .from("mvp_votes")
    .select(`
      fighter_id,
      fighters!mvp_votes_fighter_id_fkey(
        id,
        name,
        ring_name,
        name_en,
        name_ko,
        image_url
      )
    `)
    .eq("event_id", eventId);

  if (error) {
    return NextResponse.json(
      { error: error.message || "Failed to fetch MVP results" },
      { status: 400 }
    );
  }

  const counts = new Map<
    string,
    {
      fighter_id: string;
      name: string;
      ring_name: string | null;
      name_en: string | null;
      name_ko: string | null;
      image_url: string | null;
      votes: number;
    }
  >();

  for (const vote of (votes ?? []) as VoteResultRow[]) {
    const fighter = vote.fighters;
    if (!fighter) continue;

    const existing = counts.get(vote.fighter_id);
    if (existing) {
      existing.votes += 1;
    } else {
      counts.set(vote.fighter_id, {
        fighter_id: vote.fighter_id,
        name: fighter.name,
        ring_name: fighter.ring_name ?? null,
        name_en: fighter.name_en ?? null,
        name_ko: fighter.name_ko ?? null,
        image_url: fighter.image_url ?? null,
        votes: 1,
      });
    }
  }

  const totalVotes = (votes ?? []).length;
  const results = Array.from(counts.values())
    .map((item) => ({
      ...item,
      percentage: totalVotes > 0 ? Math.round((item.votes / totalVotes) * 100) : 0,
    }))
    .sort((a, b) => b.votes - a.votes);

  return NextResponse.json({
    total_votes: totalVotes,
    results,
  });
}
