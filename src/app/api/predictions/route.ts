import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServer, getUser } from "@/lib/supabase-server";
import { createRateLimiter, rateLimitResponse } from "@/lib/rate-limit";

const predictionLimiter = createRateLimiter({ limit: 30, windowSeconds: 60 }); // 30 per min

type PredictionPayload = {
  fight_id?: string;
  winner_id?: string;
  method?: "KO/TKO" | "Submission" | "Decision" | null;
  round?: 1 | 2 | 3 | 4 | null;
};

export async function POST(req: NextRequest) {
  const supabase = await createSupabaseServer();
  const user = await getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { allowed, resetInSeconds } = predictionLimiter.check(user.id);
  if (!allowed) return rateLimitResponse(resetInSeconds);

  let body: PredictionPayload;

  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { fight_id, winner_id, method = null, round = null } = body;

  if (!fight_id || !winner_id) {
    return NextResponse.json(
      { error: "fight_id and winner_id are required" },
      { status: 400 }
    );
  }

  if (method && !["KO/TKO", "Submission", "Decision"].includes(method)) {
    return NextResponse.json({ error: "Invalid method" }, { status: 400 });
  }

  if (round !== null && ![1, 2, 3, 4].includes(round)) {
    return NextResponse.json({ error: "Invalid round" }, { status: 400 });
  }

  const { data: fight, error: fightError } = await supabase
    .from("fights")
    .select("id, status, start_time, fighter_a_id, fighter_b_id, event_id")
    .eq("id", fight_id)
    .single();

  if (fightError || !fight) {
    return NextResponse.json({ error: "Fight not found" }, { status: 404 });
  }

  if (fight.status !== "upcoming") {
    return NextResponse.json(
      { error: "Predictions are only allowed for upcoming fights" },
      { status: 400 }
    );
  }

  const startTime = new Date(fight.start_time).getTime();
  if (Number.isNaN(startTime) || startTime <= Date.now()) {
    return NextResponse.json(
      { error: "Prediction is locked after fight start time" },
      { status: 400 }
    );
  }

  if (![fight.fighter_a_id, fight.fighter_b_id].includes(winner_id)) {
    return NextResponse.json(
      { error: "winner_id must be one of the fighters in this fight" },
      { status: 400 }
    );
  }

  const payload = {
    user_id: user.id,
    fight_id,
    winner_id,
    method,
    round,
  };

  const { data, error } = await supabase
    .from("predictions")
    .upsert(payload, {
      onConflict: "user_id,fight_id",
    })
    .select("*")
    .single();

  if (error) {
    return NextResponse.json(
      { error: error.message || "Failed to save prediction" },
      { status: 400 }
    );
  }

  return NextResponse.json({ prediction: data });
}

export async function GET(req: NextRequest) {
  const supabase = await createSupabaseServer();
  const user = await getUser();
  const { searchParams } = new URL(req.url);
  const fightId = searchParams.get("fight_id");

  if (!fightId) {
    return NextResponse.json({ error: "fight_id is required" }, { status: 400 });
  }

  const { data: fight, error: fightError } = await supabase
    .from("fights")
    .select("id, start_time")
    .eq("id", fightId)
    .single();

  if (fightError || !fight) {
    return NextResponse.json({ error: "Fight not found" }, { status: 404 });
  }

  const hasStarted = new Date(fight.start_time).getTime() <= Date.now();

  if (!hasStarted) {
    if (!user) {
      return NextResponse.json({ predictions: [] });
    }

    const { data, error } = await supabase
      .from("predictions")
      .select("*, users!predictions_user_id_fkey(id, ring_name)")
      .eq("fight_id", fightId)
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

  const { data, error } = await supabase
    .from("predictions")
    .select("*, users!predictions_user_id_fkey(id, ring_name)")
    .eq("fight_id", fightId)
    .order("created_at", { ascending: true });

  if (error) {
    return NextResponse.json(
      { error: error.message || "Failed to fetch predictions" },
      { status: 400 }
    );
  }

  return NextResponse.json({ predictions: data ?? [] });
}
