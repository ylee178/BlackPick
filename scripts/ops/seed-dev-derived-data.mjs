import "dotenv/config";

import { createClient } from "@supabase/supabase-js";

const DEV_URL = process.env.DEV_SUPABASE_URL;
const DEV_SERVICE_ROLE_KEY = process.env.DEV_SUPABASE_SERVICE_ROLE_KEY;

if (!DEV_URL || !DEV_SERVICE_ROLE_KEY) {
  throw new Error(
    "Missing DEV_SUPABASE_URL or DEV_SUPABASE_SERVICE_ROLE_KEY.",
  );
}

const dev = createClient(DEV_URL, DEV_SERVICE_ROLE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

const WIN_RATE_BY_USER = [0.84, 0.67, 0.63, 0.39, 0.35, 0.33, 0.25, 0.14, 0, 0];
const METHOD_OPTIONS = ["KO/TKO", "Submission", "Decision"];

async function insertInChunks(table, rows, chunkSize = 500) {
  for (let index = 0; index < rows.length; index += chunkSize) {
    const chunk = rows.slice(index, index + chunkSize);
    const { error } = await dev.from(table).insert(chunk);
    if (error) {
      throw new Error(`Failed to insert ${table}: ${error.message}`);
    }
  }
}

async function clearDerivedData(userIds) {
  await Promise.all([
    dev.from("rankings").delete().in("user_id", userIds),
    dev.from("predictions").delete().in("user_id", userIds),
    dev.from("hall_of_fame_entries").delete().in("user_id", userIds),
    dev.from("perfect_card_entries").delete().in("user_id", userIds),
    dev.from("user_weight_class_stats").delete().in("user_id", userIds),
  ]);
}

async function resetUserScores(userIds) {
  const { error } = await dev
    .from("users")
    .update({
      wins: 0,
      losses: 0,
      current_streak: 0,
      best_streak: 0,
      hall_of_fame_count: 0,
      score: 0,
      p4p_score: 0,
    })
    .in("id", userIds);

  if (error) {
    throw new Error(`Failed to reset dev users: ${error.message}`);
  }
}

function buildPredictions(users, fights) {
  const predictions = [];

  fights.forEach((fight, fightIndex) => {
    if (!fight.winner_id) return;

    const loserId =
      fight.fighter_a_id === fight.winner_id ? fight.fighter_b_id : fight.fighter_a_id;
    const fightMethod = fight.method ?? METHOD_OPTIONS[fightIndex % METHOD_OPTIONS.length];
    const fightRound = fight.round ?? ((fightIndex % 3) + 1);

    users.forEach((user, userIndex) => {
      const seed = (userIndex * 7 + fightIndex * 13) % 100;
      const shouldPickWinner =
        seed < (WIN_RATE_BY_USER[userIndex] ?? 0) * 100;
      const pickedWinner = shouldPickWinner ? fight.winner_id : loserId;

      let method = null;
      if (userIndex < 6) {
        const methodSeed = (userIndex * 3 + fightIndex * 5) % 100;
        if (shouldPickWinner && methodSeed < 70 - userIndex * 10) {
          method = fightMethod;
        } else {
          method =
            METHOD_OPTIONS[
              (METHOD_OPTIONS.indexOf(fightMethod) + 1 + userIndex) %
                METHOD_OPTIONS.length
            ];
        }
      }

      let round = null;
      if (method && method !== "Decision") {
        const roundSeed = (userIndex * 11 + fightIndex * 3) % 100;
        if (shouldPickWinner && method === fightMethod && roundSeed < 50 - userIndex * 8) {
          round = fightRound;
        } else {
          round = (fightRound % 4) + 1;
        }
      }

      predictions.push({
        user_id: user.id,
        fight_id: fight.id,
        winner_id: pickedWinner,
        method,
        round,
      });
    });
  });

  return predictions;
}

function rankRows(rows) {
  return [...rows].sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    return a.ring_name.localeCompare(b.ring_name);
  });
}

async function seedRankings(users) {
  const { data: predictionRows, error: predictionError } = await dev
    .from("predictions")
    .select(`
      user_id,
      score,
      fight:fights!fight_id (
        event_id,
        event:events!event_id (
          id,
          series_type,
          status,
          date
        )
      )
    `)
    .not("score", "is", null);

  if (predictionError) {
    throw new Error(`Failed to fetch predictions for rankings: ${predictionError.message}`);
  }

  const eventScores = new Map();
  const seriesScores = new Map();

  for (const row of predictionRows ?? []) {
    const event = row.fight?.event;
    if (!event || event.status !== "completed") continue;

    const eventKey = `${event.id}:${row.user_id}`;
    eventScores.set(eventKey, (eventScores.get(eventKey) ?? 0) + (row.score ?? 0));

    if (event.series_type === "black_cup" || event.series_type === "numbering") {
      const seriesKey = `${event.series_type}:${row.user_id}`;
      seriesScores.set(seriesKey, (seriesScores.get(seriesKey) ?? 0) + (row.score ?? 0));
    }
  }

  const { data: completedEvents, error: completedEventsError } = await dev
    .from("events")
    .select("id, date, status, series_type")
    .eq("status", "completed")
    .order("date", { ascending: false })
    .limit(3);

  if (completedEventsError) {
    throw new Error(`Failed to fetch completed events: ${completedEventsError.message}`);
  }

  const rankingRows = [];

  for (const event of completedEvents ?? []) {
    const ranked = rankRows(
      users
        .map((user) => ({
          user_id: user.id,
          ring_name: user.ring_name ?? "?",
          score: eventScores.get(`${event.id}:${user.id}`) ?? 0,
        }))
        .filter((row) => row.score > 0),
    );

    ranked.forEach((row, index) => {
      rankingRows.push({
        type: "event",
        reference_id: event.id,
        user_id: row.user_id,
        score: row.score,
        rank: index + 1,
      });
    });
  }

  const { data: seriesEvents, error: seriesEventsError } = await dev
    .from("events")
    .select("id, series_type")
    .in("series_type", ["black_cup", "numbering"])
    .order("date", { ascending: false });

  if (seriesEventsError) {
    throw new Error(`Failed to fetch series events: ${seriesEventsError.message}`);
  }

  const firstReferenceBySeries = new Map();
  for (const event of seriesEvents ?? []) {
    if (!firstReferenceBySeries.has(event.series_type)) {
      firstReferenceBySeries.set(event.series_type, event.id);
    }
  }

  for (const [seriesType, referenceId] of firstReferenceBySeries.entries()) {
    const ranked = rankRows(
      users
        .map((user) => ({
          user_id: user.id,
          ring_name: user.ring_name ?? "?",
          score: seriesScores.get(`${seriesType}:${user.id}`) ?? 0,
        }))
        .filter((row) => row.score > 0),
    );

    ranked.forEach((row, index) => {
      rankingRows.push({
        type: "series",
        reference_id: referenceId,
        user_id: row.user_id,
        score: row.score,
        rank: index + 1,
      });
    });
  }

  if (rankingRows.length > 0) {
    await insertInChunks("rankings", rankingRows);
  }

  return rankingRows.length;
}

async function seedHallOfFame(users) {
  const { data: completedFights, error } = await dev
    .from("fights")
    .select("id")
    .eq("status", "completed")
    .order("start_time", { ascending: false })
    .limit(3);

  if (error) {
    throw new Error(`Failed to fetch fights for hall of fame: ${error.message}`);
  }

  if (!completedFights || completedFights.length < 3 || users.length < 4) {
    return 0;
  }

  const entries = [
    { user_id: users[0].id, fight_id: completedFights[0].id, tier: "oracle", bonus_points: 50 },
    { user_id: users[0].id, fight_id: completedFights[1].id, tier: "sniper", bonus_points: 20 },
    { user_id: users[1].id, fight_id: completedFights[2].id, tier: "sharp_call", bonus_points: 10 },
  ];

  await insertInChunks("hall_of_fame_entries", entries);

  for (const entry of entries) {
    const user = users.find((candidate) => candidate.id === entry.user_id);
    if (!user) continue;
    await dev
      .from("users")
      .update({
        hall_of_fame_count: (user.hall_of_fame_count ?? 0) + 1,
        score: (user.score ?? 0) + entry.bonus_points,
      })
      .eq("id", user.id);
    user.hall_of_fame_count = (user.hall_of_fame_count ?? 0) + 1;
    user.score = (user.score ?? 0) + entry.bonus_points;
  }

  return entries.length;
}

async function main() {
  const { data: users, error: usersError } = await dev
    .from("users")
    .select("id, ring_name, score, hall_of_fame_count, created_at")
    .order("created_at", { ascending: true });

  if (usersError || !users) {
    throw new Error(`Failed to fetch dev users: ${usersError?.message ?? "Unknown error"}`);
  }

  const userIds = users.map((user) => user.id);
  await clearDerivedData(userIds);
  await resetUserScores(userIds);

  const { data: completedFights, error: fightsError } = await dev
    .from("fights")
    .select("id, event_id, fighter_a_id, fighter_b_id, winner_id, method, round, start_time")
    .eq("status", "completed")
    .not("winner_id", "is", null)
    .order("start_time", { ascending: false })
    .limit(24);

  if (fightsError || !completedFights) {
    throw new Error(`Failed to fetch completed fights: ${fightsError?.message ?? "Unknown error"}`);
  }

  const predictions = buildPredictions(users, [...completedFights].reverse());
  await insertInChunks("predictions", predictions);

  const completedFightIds = completedFights.map((fight) => fight.id);
  const { error: resetFightResultsError } = await dev
    .from("fights")
    .update({ result_processed_at: null })
    .in("id", completedFightIds);

  if (resetFightResultsError) {
    throw new Error(
      `Failed to reset completed fight processing state: ${resetFightResultsError.message}`,
    );
  }

  for (const fight of [...completedFights].reverse()) {
    const { error: processError } = await dev.rpc("process_fight_result", {
      p_fight_id: fight.id,
    });

    if (processError) {
      throw new Error(
        `Failed to process fight ${fight.id}: ${processError.message}`,
      );
    }
  }

  const { data: refreshedUsers, error: refreshedUsersError } = await dev
    .from("users")
    .select("id, ring_name, score, hall_of_fame_count, created_at")
    .order("created_at", { ascending: true });

  if (refreshedUsersError || !refreshedUsers) {
    throw new Error(
      `Failed to fetch refreshed users: ${refreshedUsersError?.message ?? "Unknown error"}`,
    );
  }

  const rankingCount = await seedRankings(refreshedUsers);
  const hofCount = await seedHallOfFame(refreshedUsers);

  const [predictionsCount, rankingsCount, weightStatsCount, hofEntriesCount] = await Promise.all([
    dev.from("predictions").select("*", { count: "exact", head: true }),
    dev.from("rankings").select("*", { count: "exact", head: true }),
    dev.from("user_weight_class_stats").select("*", { count: "exact", head: true }),
    dev.from("hall_of_fame_entries").select("*", { count: "exact", head: true }),
  ]);

  console.log(
    JSON.stringify(
      {
        seeded: {
          predictions: predictions.length,
          rankings: rankingCount,
          hall_of_fame_entries: hofCount,
        },
        totals: {
          predictions: predictionsCount.count ?? 0,
          rankings: rankingsCount.count ?? 0,
          user_weight_class_stats: weightStatsCount.count ?? 0,
          hall_of_fame_entries: hofEntriesCount.count ?? 0,
        },
      },
      null,
      2,
    ),
  );
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
