import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const isDev = process.env.NODE_ENV === "development";

function getAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceRoleKey) {
    throw new Error("Missing Supabase environment variables");
  }

  return createClient(url, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

type SeedUser = {
  index: number;
  email: string;
  password: string;
  ring_name: string;
  wins: number;
  losses: number;
  current_streak: number;
  best_streak: number;
  hall_of_fame_count: number;
  score: number;
  p4p_score: number;
};

const seedUsers: SeedUser[] = [
  {
    index: 1,
    email: "test1@blackpick.dev",
    password: "BlackPick123!",
    ring_name: "ChampionOne",
    wins: 42,
    losses: 8,
    current_streak: 11,
    best_streak: 14,
    hall_of_fame_count: 3,
    score: 2450,
    p4p_score: 820,
  },
  {
    index: 2,
    email: "test2@blackpick.dev",
    password: "BlackPick123!",
    ring_name: "SolidStriker",
    wins: 24,
    losses: 12,
    current_streak: 4,
    best_streak: 7,
    hall_of_fame_count: 1,
    score: 1320,
    p4p_score: 650,
  },
  {
    index: 3,
    email: "test3@blackpick.dev",
    password: "BlackPick123!",
    ring_name: "CardCrusher",
    wins: 19,
    losses: 11,
    current_streak: 2,
    best_streak: 5,
    hall_of_fame_count: 0,
    score: 980,
    p4p_score: 480,
  },
  {
    index: 4,
    email: "test4@blackpick.dev",
    password: "BlackPick123!",
    ring_name: "UnderdogEye",
    wins: 9,
    losses: 14,
    current_streak: 1,
    best_streak: 3,
    hall_of_fame_count: 0,
    score: 410,
    p4p_score: 220,
  },
  {
    index: 5,
    email: "test5@blackpick.dev",
    password: "BlackPick123!",
    ring_name: "LateNotice",
    wins: 7,
    losses: 13,
    current_streak: 0,
    best_streak: 2,
    hall_of_fame_count: 0,
    score: 290,
    p4p_score: 0,
  },
  {
    index: 6,
    email: "test6@blackpick.dev",
    password: "BlackPick123!",
    ring_name: "SplitDecision",
    wins: 5,
    losses: 10,
    current_streak: 2,
    best_streak: 2,
    hall_of_fame_count: 0,
    score: 210,
    p4p_score: 0,
  },
  {
    index: 7,
    email: "test7@blackpick.dev",
    password: "BlackPick123!",
    ring_name: "CasualPicker",
    wins: 3,
    losses: 9,
    current_streak: 0,
    best_streak: 1,
    hall_of_fame_count: 0,
    score: 120,
    p4p_score: 0,
  },
  {
    index: 8,
    email: "test8@blackpick.dev",
    password: "BlackPick123!",
    ring_name: "NoContest",
    wins: 1,
    losses: 6,
    current_streak: 0,
    best_streak: 1,
    hall_of_fame_count: 0,
    score: 40,
    p4p_score: 0,
  },
  {
    index: 9,
    email: "test9@blackpick.dev",
    password: "BlackPick123!",
    ring_name: "FirstTimer",
    wins: 0,
    losses: 4,
    current_streak: 0,
    best_streak: 0,
    hall_of_fame_count: 0,
    score: 0,
    p4p_score: 0,
  },
  {
    index: 10,
    email: "test10@blackpick.dev",
    password: "BlackPick123!",
    ring_name: "ColdStart",
    wins: 0,
    losses: 0,
    current_streak: 0,
    best_streak: 0,
    hall_of_fame_count: 0,
    score: 0,
    p4p_score: 0,
  },
];

// ── Seed fighters for Black Cup past events ──
const SEED_FIGHTERS = [
  { name: "김태호", ring_name: "불독", name_en: "Taeho Kim", name_ko: "김태호", record: "18-4", nationality: "KR", weight_class: "라이트급" },
  { name: "이준혁", ring_name: "스나이퍼", name_en: "Junhyuk Lee", name_ko: "이준혁", record: "15-6", nationality: "KR", weight_class: "라이트급" },
  { name: "박성진", ring_name: "아이언피스트", name_en: "Sungjin Park", name_ko: "박성진", record: "22-3", nationality: "KR", weight_class: "웰터급" },
  { name: "최강민", ring_name: "타이거", name_en: "Kangmin Choi", name_ko: "최강민", record: "12-8", nationality: "KR", weight_class: "웰터급" },
  { name: "Kenji Yamamoto", ring_name: "サムライ", name_en: "Kenji Yamamoto", name_ko: "야마모토 켄지", record: "20-5", nationality: "JP", weight_class: "미들급" },
  { name: "Ryu Tanaka", ring_name: "雷神", name_en: "Ryu Tanaka", name_ko: "타나카 류", record: "14-7", nationality: "JP", weight_class: "미들급" },
  { name: "정우성", ring_name: "헤머", name_en: "Woosung Jung", name_ko: "정우성", record: "25-2", nationality: "KR", weight_class: "헤비급" },
  { name: "Alexander Volkov", ring_name: "Drago", name_en: "Alexander Volkov", name_ko: "알렉산더 볼코프", record: "19-6", nationality: "RU", weight_class: "헤비급" },
  { name: "장현수", ring_name: "쉐도우", name_en: "Hyunsoo Jang", name_ko: "장현수", record: "16-5", nationality: "KR", weight_class: "페더급" },
  { name: "Diego Santos", ring_name: "Pitbull", name_en: "Diego Santos", name_ko: "디에고 산토스", record: "21-4", nationality: "BR", weight_class: "페더급" },
  { name: "한승우", ring_name: "매드독", name_en: "Seungwoo Han", name_ko: "한승우", record: "11-9", nationality: "KR", weight_class: "라이트급" },
  { name: "Takeshi Ono", ring_name: "忍者", name_en: "Takeshi Ono", name_ko: "오노 타케시", record: "17-3", nationality: "JP", weight_class: "라이트헤비급" },
  { name: "류민호", ring_name: "바이퍼", name_en: "Minho Ryu", name_ko: "류민호", record: "13-5", nationality: "KR", weight_class: "라이트헤비급" },
  { name: "Carlos Silva", ring_name: "Jaguar", name_en: "Carlos Silva", name_ko: "카를로스 실바", record: "19-8", nationality: "BR", weight_class: "웰터급" },
];

// 3 past Black Cup events with varied fight outcomes
const SEED_EVENTS = [
  {
    name: "Black Cup 7",
    series_type: "black_cup" as const,
    date: "2026-01-18",
    status: "completed" as const,
    fights: [
      // Fight 1: KO/TKO - main event
      { a: 0, b: 1, status: "completed" as const, winner: "a", method: "KO/TKO" as const, round: 2, isMain: true },
      // Fight 2: Submission
      { a: 2, b: 3, status: "completed" as const, winner: "b", method: "Submission" as const, round: 1, isMain: false },
      // Fight 3: Decision
      { a: 4, b: 5, status: "completed" as const, winner: "a", method: "Decision" as const, round: 3, isMain: false },
      // Fight 4: No Contest
      { a: 6, b: 7, status: "no_contest" as const, winner: null, method: null, round: null, isMain: false },
      // Fight 5: Cancelled
      { a: 8, b: 9, status: "cancelled" as const, winner: null, method: null, round: null, isMain: false },
    ],
  },
  {
    name: "Black Cup 8",
    series_type: "black_cup" as const,
    date: "2026-02-22",
    status: "completed" as const,
    fights: [
      // Fight 1: Decision - main event
      { a: 6, b: 4, status: "completed" as const, winner: "a", method: "Decision" as const, round: 3, isMain: true },
      // Fight 2: KO R1
      { a: 10, b: 1, status: "completed" as const, winner: "a", method: "KO/TKO" as const, round: 1, isMain: false },
      // Fight 3: Submission R2
      { a: 8, b: 13, status: "completed" as const, winner: "b", method: "Submission" as const, round: 2, isMain: false },
      // Fight 4: KO R3 - title fight
      { a: 11, b: 12, status: "completed" as const, winner: "a", method: "KO/TKO" as const, round: 3, isMain: false },
      // Fight 5: Decision
      { a: 2, b: 9, status: "completed" as const, winner: "a", method: "Decision" as const, round: 3, isMain: false },
      // Fight 6: No Contest
      { a: 3, b: 5, status: "no_contest" as const, winner: null, method: null, round: null, isMain: false },
    ],
  },
  {
    name: "Black Cup 9",
    series_type: "black_cup" as const,
    date: "2026-03-15",
    status: "completed" as const,
    fights: [
      // Fight 1: KO/TKO main event
      { a: 0, b: 10, status: "completed" as const, winner: "a", method: "KO/TKO" as const, round: 1, isMain: true },
      // Fight 2: Submission
      { a: 12, b: 7, status: "completed" as const, winner: "a", method: "Submission" as const, round: 2, isMain: false },
      // Fight 3: Decision
      { a: 9, b: 8, status: "completed" as const, winner: "b", method: "Decision" as const, round: 3, isMain: false },
      // Fight 4: KO/TKO
      { a: 3, b: 13, status: "completed" as const, winner: "b", method: "KO/TKO" as const, round: 2, isMain: false },
      // Fight 5: Cancelled
      { a: 11, b: 5, status: "cancelled" as const, winner: null, method: null, round: null, isMain: false },
    ],
  },
];

async function clearTestData(admin: ReturnType<typeof getAdminClient>) {
  const { data: authUsers, error: listError } = await admin.auth.admin.listUsers();

  if (listError) {
    throw listError;
  }

  const testAuthUsers = (authUsers.users || []).filter((user) =>
    user.email?.endsWith("@blackpick.dev")
  );

  const testUserIds = testAuthUsers.map((user) => user.id);

  // Clean seeded events/fights/fighters (by name convention)
  const seedEventNames = SEED_EVENTS.map((e) => e.name);
  const { data: seedEvents } = await admin.from("events").select("id").in("name", seedEventNames);
  const seedEventIds = (seedEvents ?? []).map((e: { id: string }) => e.id);

  if (seedEventIds.length > 0) {
    // Delete fight-related data for seeded events
    const { data: seedFights } = await admin.from("fights").select("id").in("event_id", seedEventIds);
    const seedFightIds = (seedFights ?? []).map((f: { id: string }) => f.id);
    if (seedFightIds.length > 0) {
      // Get comments for these fights to delete likes
      const { data: seedComments } = await admin.from("fight_comments").select("id").in("fight_id", seedFightIds);
      const seedCommentIds = (seedComments ?? []).map((c: { id: string }) => c.id);
      if (seedCommentIds.length > 0) {
        await admin.from("comment_likes").delete().in("comment_id", seedCommentIds);
      }
      await admin.from("fight_comments").delete().in("fight_id", seedFightIds);
      await admin.from("hall_of_fame_entries").delete().in("fight_id", seedFightIds);
      await admin.from("perfect_card_entries").delete().in("fight_id", seedFightIds);
      await admin.from("predictions").delete().in("fight_id", seedFightIds);
    }
    await admin.from("fights").delete().in("event_id", seedEventIds);
    await admin.from("rankings").delete().in("reference_id", seedEventIds);
    await admin.from("events").delete().in("id", seedEventIds);
  }

  // Clean seeded fighters
  const seedFighterNames = SEED_FIGHTERS.map((f) => f.name);
  await admin.from("fighters").delete().in("name", seedFighterNames);

  if (testUserIds.length > 0) {
    await admin.from("comment_likes").delete().in("user_id", testUserIds);
    await admin.from("fight_comments").delete().in("user_id", testUserIds);
    await admin.from("hall_of_fame_entries").delete().in("user_id", testUserIds);
    await admin.from("perfect_card_entries").delete().in("user_id", testUserIds);
    await admin.from("user_weight_class_stats").delete().in("user_id", testUserIds);
    await admin.from("predictions").delete().in("user_id", testUserIds);
    await admin.from("mvp_votes").delete().in("user_id", testUserIds);
    await admin.from("rankings").delete().in("user_id", testUserIds);
    await admin.from("notifications").delete().in("user_id", testUserIds);
    await admin.from("users").delete().in("id", testUserIds);
  }

  for (const user of testAuthUsers) {
    await admin.auth.admin.deleteUser(user.id);
  }

  return {
    deleted_users: testAuthUsers.length,
    deleted_seed_events: seedEventIds.length,
  };
}

async function seedFullData(admin: ReturnType<typeof getAdminClient>) {
  await clearTestData(admin);

  const createdUsers: { id: string; email: string }[] = [];

  for (const user of seedUsers) {
    const { data, error } = await admin.auth.admin.createUser({
      email: user.email,
      password: user.password,
      email_confirm: true,
      user_metadata: {
        ring_name: user.ring_name,
      },
    });

    if (error) {
      throw error;
    }

    if (!data.user) {
      throw new Error(`Failed to create auth user for ${user.email}`);
    }

    createdUsers.push({
      id: data.user.id,
      email: user.email,
    });
  }

  const publicUsers = seedUsers.map((user) => {
    const authUser = createdUsers.find((created) => created.email === user.email);

    if (!authUser) {
      throw new Error(`Missing auth user for ${user.email}`);
    }

    return {
      id: authUser.id,
      email: user.email,
      ring_name: user.ring_name,
      wins: user.wins,
      losses: user.losses,
      current_streak: user.current_streak,
      best_streak: user.best_streak,
      hall_of_fame_count: user.hall_of_fame_count,
      score: user.score,
      p4p_score: user.p4p_score,
    };
  });

  const { error: usersError } = await admin.from("users").insert(publicUsers);

  if (usersError) {
    throw usersError;
  }

  // ── Create seed fighters ──
  const fighterInserts = SEED_FIGHTERS.map((f) => ({
    name: f.name,
    ring_name: f.ring_name,
    name_en: f.name_en,
    name_ko: f.name_ko,
    record: f.record,
    nationality: f.nationality,
    weight_class: f.weight_class,
  }));
  const { data: insertedFighters, error: fighterErr } = await admin
    .from("fighters")
    .insert(fighterInserts)
    .select("id, name");
  if (fighterErr) throw fighterErr;
  const fighterIdMap = new Map((insertedFighters ?? []).map((f: { id: string; name: string }) => [f.name, f.id]));
  const fighterIds = SEED_FIGHTERS.map((f) => fighterIdMap.get(f.name)!);

  // ── Create seed events + fights ──
  let createdSeedFights = 0;
  const allSeedFightIds: string[] = [];
  const seedFightMeta: Array<{ id: string; winnerId: string | null; fighterAId: string; fighterBId: string; method: string | null; round: number | null; status: string; eventIdx: number }> = [];

  for (const [ei, evt] of SEED_EVENTS.entries()) {
    const { data: insertedEvent, error: evtErr } = await admin
      .from("events")
      .insert({ name: evt.name, series_type: evt.series_type, date: evt.date, status: evt.status })
      .select("id")
      .single();
    if (evtErr) throw evtErr;
    const eventId = insertedEvent!.id;

    for (const [fi, fight] of evt.fights.entries()) {
      const fighterAId = fighterIds[fight.a];
      const fighterBId = fighterIds[fight.b];
      const winnerId = fight.winner === "a" ? fighterAId : fight.winner === "b" ? fighterBId : null;
      const startTime = new Date(`${evt.date}T${String(18 + fi).padStart(2, "0")}:00:00Z`).toISOString();

      const { data: insertedFight, error: fightErr } = await admin
        .from("fights")
        .insert({
          event_id: eventId,
          fighter_a_id: fighterAId,
          fighter_b_id: fighterBId,
          start_time: startTime,
          status: fight.status,
          winner_id: winnerId,
          method: fight.method,
          round: fight.round,
        })
        .select("id")
        .single();
      if (fightErr) throw fightErr;
      allSeedFightIds.push(insertedFight!.id);
      seedFightMeta.push({
        id: insertedFight!.id,
        winnerId,
        fighterAId,
        fighterBId,
        method: fight.method,
        round: fight.round,
        status: fight.status,
        eventIdx: ei,
      });
      createdSeedFights++;
    }
  }

  // Also get existing completed fights (non-seed)
  let completedFightsQuery = admin
    .from("fights")
    .select("id, winner_id, fighter_a_id, fighter_b_id, method, round, status, start_time")
    .eq("status", "completed")
    .not("winner_id", "is", null);
  if (allSeedFightIds.length > 0) {
    completedFightsQuery = completedFightsQuery.not("id", "in", `(${allSeedFightIds.join(",")})`);
  }
  const { data: completedFights, error: fightsError } = await completedFightsQuery
    .order("start_time", { ascending: true })
    .limit(20);

  if (fightsError) {
    throw fightsError;
  }

  const methods = ["KO/TKO", "Submission", "Decision"];
  const predictionsToInsert: Array<{
    user_id: string;
    fight_id: string;
    winner_id: string;
    method: string | null;
    round: number | null;
    score: number;
    is_winner_correct: boolean;
    is_method_correct: boolean | null;
    is_round_correct: boolean | null;
  }> = [];

  // Win rate targets per user: higher index = lower win rate
  const winRateByUser = [0.84, 0.67, 0.63, 0.39, 0.35, 0.33, 0.25, 0.14, 0.0, 0.0];

  if (completedFights && completedFights.length > 0) {
    for (const [fightIndex, fight] of completedFights.entries()) {
      const loserId = fight.fighter_a_id === fight.winner_id ? fight.fighter_b_id : fight.fighter_a_id;
      const fightMethod = fight.method ?? methods[fightIndex % 3];
      const fightRound = fight.round ?? ((fightIndex % 3) + 1);

      for (const [userIndex, authUser] of createdUsers.entries()) {
        // Deterministic "random" based on indices
        const seed = (userIndex * 7 + fightIndex * 13) % 100;
        const shouldPickWinner = seed < (winRateByUser[userIndex] ?? 0) * 100;

        const pickedWinner = shouldPickWinner ? fight.winner_id! : loserId;
        const isWinnerCorrect = pickedWinner === fight.winner_id;

        // Pick method — top users more likely to guess right
        let predMethod: string | null = null;
        if (userIndex < 6) {
          const methodSeed = (userIndex * 3 + fightIndex * 5) % 100;
          if (isWinnerCorrect && methodSeed < (70 - userIndex * 10)) {
            predMethod = fightMethod; // correct method
          } else {
            predMethod = methods[(methods.indexOf(fightMethod) + 1 + userIndex) % 3];
          }
        }
        const isMethodCorrect = predMethod ? predMethod === fightMethod : null;

        // Pick round — top users sometimes guess right
        let predRound: number | null = null;
        if (predMethod && predMethod !== "Decision") {
          const roundSeed = (userIndex * 11 + fightIndex * 3) % 100;
          if (isWinnerCorrect && isMethodCorrect && roundSeed < (50 - userIndex * 8)) {
            predRound = fightRound;
          } else {
            predRound = ((fightRound % 4) + 1);
          }
        }
        const isRoundCorrect = predRound !== null ? predRound === fightRound : null;

        // Calculate score: +4 winner, +4 method, +8 round (R1-R3), +12 round R4, -2 wrong
        let score = 0;
        if (isWinnerCorrect) {
          score += 4;
          if (isMethodCorrect) score += 4;
          if (isRoundCorrect) score += predRound === 4 ? 12 : 8;
        } else {
          score = -2;
        }

        predictionsToInsert.push({
          user_id: authUser.id,
          fight_id: fight.id,
          winner_id: pickedWinner,
          method: predMethod,
          round: predRound,
          score,
          is_winner_correct: isWinnerCorrect,
          is_method_correct: isMethodCorrect,
          is_round_correct: isRoundCorrect,
        });
      }
    }
  }

  // ── Predictions for seed fights (completed ones only) ──
  const completedSeedFights = seedFightMeta.filter((f) => f.status === "completed" && f.winnerId);
  for (const [fightIndex, fight] of completedSeedFights.entries()) {
    const loserId = fight.fighterAId === fight.winnerId ? fight.fighterBId : fight.fighterAId;
    const fightMethod = fight.method ?? methods[fightIndex % 3];
    const fightRound = fight.round ?? ((fightIndex % 3) + 1);

    for (const [userIndex, authUser] of createdUsers.entries()) {
      const seed = (userIndex * 7 + (fightIndex + 50) * 13) % 100;
      const shouldPickWinner = seed < (winRateByUser[userIndex] ?? 0) * 100;
      const pickedWinner = shouldPickWinner ? fight.winnerId! : loserId;
      const isWinnerCorrect = pickedWinner === fight.winnerId;

      let predMethod: string | null = null;
      if (userIndex < 6) {
        const methodSeed = (userIndex * 3 + (fightIndex + 50) * 5) % 100;
        if (isWinnerCorrect && methodSeed < (70 - userIndex * 10)) {
          predMethod = fightMethod;
        } else {
          predMethod = methods[(methods.indexOf(fightMethod) + 1 + userIndex) % 3];
        }
      }
      const isMethodCorrect = predMethod ? predMethod === fightMethod : null;

      let predRound: number | null = null;
      if (predMethod && predMethod !== "Decision") {
        const roundSeed = (userIndex * 11 + (fightIndex + 50) * 3) % 100;
        if (isWinnerCorrect && isMethodCorrect && roundSeed < (50 - userIndex * 8)) {
          predRound = fightRound;
        } else {
          predRound = ((fightRound % 4) + 1);
        }
      }
      const isRoundCorrect = predRound !== null ? predRound === fightRound : null;

      let score = 0;
      if (isWinnerCorrect) {
        score += 4;
        if (isMethodCorrect) score += 4;
        if (isRoundCorrect) score += predRound === 4 ? 12 : 8;
      } else {
        score = -2;
      }

      predictionsToInsert.push({
        user_id: authUser.id,
        fight_id: fight.id,
        winner_id: pickedWinner,
        method: predMethod,
        round: predRound,
        score,
        is_winner_correct: isWinnerCorrect,
        is_method_correct: isMethodCorrect,
        is_round_correct: isRoundCorrect,
      });
    }
  }

  if (predictionsToInsert.length > 0) {
    const deduped = Array.from(
      new Map(
        predictionsToInsert.map((prediction) => [
          `${prediction.user_id}:${prediction.fight_id}`,
          prediction,
        ])
      ).values()
    );

    const { error: predictionsError } = await admin
      .from("predictions")
      .insert(deduped);

    if (predictionsError) {
      throw predictionsError;
    }
  }

  // Seed event rankings for completed events
  let createdRankings = 0;
  try {
    const { data: completedEvents } = await admin
      .from("events")
      .select("id")
      .eq("status", "completed")
      .order("date", { ascending: false })
      .limit(2);

    if (completedEvents && completedEvents.length > 0) {
      const eventIds = completedEvents.map((e: { id: string }) => e.id);
      await admin.from("rankings").delete().in("reference_id", eventIds);

      for (let ei = 0; ei < completedEvents.length; ei++) {
        const event = completedEvents[ei];
        const rankingsToInsert = createdUsers
          .slice(0, 8)
          .map((authUser, index) => {
            const seedUser = seedUsers[index];
            const eventScore = Math.max(0, (seedUser?.score ?? 0) - index * 40 - ei * 60);
            return {
              type: "event" as const,
              reference_id: event.id,
              user_id: authUser.id,
              score: eventScore,
              rank: index + 1,
            };
          });

        const { error: rankError } = await admin.from("rankings").insert(rankingsToInsert);
        if (!rankError) {
          createdRankings += rankingsToInsert.length;
        }
      }
    }
  } catch {
    // Rankings seeding is optional, don't fail the whole seed
  }

  // Seed series (league) rankings
  try {
    const { data: allEvents } = await admin
      .from("events")
      .select("id, series_type")
      .in("series_type", ["black_cup", "numbering"]);

    if (allEvents && allEvents.length > 0) {
      const byType = new Map<string, string[]>();
      for (const e of allEvents) {
        const ids = byType.get(e.series_type) ?? [];
        ids.push(e.id);
        byType.set(e.series_type, ids);
      }

      for (const [, eventIds] of byType) {
        // Clean old series rankings for these events
        await admin.from("rankings").delete().eq("type", "series").in("reference_id", eventIds);

        // Use first event as reference_id for the series ranking
        const refId = eventIds[0];
        const seriesRankings = createdUsers.slice(0, 5).map((authUser, index) => {
          const seedUser = seedUsers[index];
          return {
            type: "series" as const,
            reference_id: refId,
            user_id: authUser.id,
            score: Math.max(0, (seedUser?.score ?? 0) - index * 80),
            rank: index + 1,
          };
        });

        const { error } = await admin.from("rankings").insert(seriesRankings);
        if (!error) createdRankings += seriesRankings.length;
      }
    }
  } catch {
    // Series rankings seeding is optional
  }

  // Seed weight class stats for P4P users
  try {
    const weightClasses = ["헤비급", "라이트헤비급", "미들급", "웰터급", "라이트급", "페더급"];
    const p4pUserStats = [
      // ChampionOne: 4 classes, high win rate
      { userIdx: 0, classes: [
        { wc: "라이트급", wins: 15, losses: 2, score: 120 },
        { wc: "웰터급", wins: 12, losses: 3, score: 88 },
        { wc: "페더급", wins: 8, losses: 1, score: 64 },
        { wc: "미들급", wins: 7, losses: 2, score: 52 },
      ]},
      // SolidStriker: 3 classes
      { userIdx: 1, classes: [
        { wc: "헤비급", wins: 10, losses: 4, score: 72 },
        { wc: "라이트헤비급", wins: 8, losses: 3, score: 60 },
        { wc: "미들급", wins: 6, losses: 5, score: 40 },
      ]},
      // CardCrusher: 3 classes
      { userIdx: 2, classes: [
        { wc: "웰터급", wins: 8, losses: 4, score: 56 },
        { wc: "라이트급", wins: 6, losses: 3, score: 44 },
        { wc: "페더급", wins: 5, losses: 4, score: 32 },
      ]},
      // UnderdogEye: 2 classes
      { userIdx: 3, classes: [
        { wc: "헤비급", wins: 5, losses: 6, score: 24 },
        { wc: "라이트헤비급", wins: 4, losses: 8, score: 16 },
      ]},
    ];

    for (const { userIdx, classes } of p4pUserStats) {
      for (const cls of classes) {
        await admin.from("user_weight_class_stats").insert({
          user_id: createdUsers[userIdx].id,
          weight_class: cls.wc,
          wins: cls.wins,
          losses: cls.losses,
          score: cls.score,
        });
      }
    }
  } catch {
    // Weight class stats seeding is optional
  }

  // Seed hall of fame entries for top users
  let createdHofEntries = 0;
  try {
    const { data: completedFightsList } = await admin
      .from("fights")
      .select("id")
      .eq("status", "completed")
      .limit(5);

    if (completedFightsList && completedFightsList.length >= 3) {
      const hofEntries = [
        { userIdx: 0, fightIdx: 0, tier: "oracle" as const, bonus: 50 },
        { userIdx: 0, fightIdx: 1, tier: "sniper" as const, bonus: 20 },
        { userIdx: 0, fightIdx: 2, tier: "sharp_call" as const, bonus: 10 },
        { userIdx: 1, fightIdx: 0, tier: "sharp_call" as const, bonus: 10 },
      ];

      for (const entry of hofEntries) {
        const { error } = await admin.from("hall_of_fame_entries").insert({
          user_id: createdUsers[entry.userIdx].id,
          fight_id: completedFightsList[entry.fightIdx].id,
          tier: entry.tier,
          bonus_points: entry.bonus,
        });
        if (!error) createdHofEntries++;
      }
    }
  } catch {
    // HoF seeding is optional
  }

  // Seed fight comments — multi-national fan discussion
  let createdComments = 0;
  let createdLikes = 0;
  try {
    const { data: upcomingFights } = await admin
      .from("fights")
      .select("id")
      .eq("event_id", "fc9df266-608d-4efa-a1b4-e9ff07a92529")
      .order("start_time", { ascending: false })
      .limit(3);

    if (upcomingFights && upcomingFights.length > 0 && createdUsers.length >= 8) {
      // Clean old test comments
      await admin.from("fight_comments").delete().in("user_id", createdUsers.map(u => u.id));

      const fightId = upcomingFights[0].id; // Main event or first fight
      const fightId2 = upcomingFights[1]?.id ?? fightId;

      const commentThreads = [
        // ── Fight 1: Main event 윤다원 vs 오수환 ──
        // Thread 1: KO prediction debate
        /*0*/  { fight: fightId, user: 0, body: "몬스터 7연승이면 멈출 수가 없지. 이번에도 KO 갈 듯 🥊", parent: null },
        /*1*/  { fight: fightId, user: 1, body: "맨티스 그라운드 게임 봤어? 몬스터가 테이크다운 당하면 끝이야", parent: 0 },
        /*2*/  { fight: fightId, user: 0, body: "근데 맨티스 스탠딩에서 몬스터 파워를 버틸 수 있을까?", parent: 1 },
        /*3*/  { fight: fightId, user: 3, body: "テイクダウンディフェンスが鍵だと思う。モンスターのTDD率は87%だよ", parent: 1 },
        /*4*/  { fight: fightId, user: 2, body: "That TDD stat is misleading. He hasn't faced a wrestler like Mantis", parent: 3 },

        // Thread 2: International analysis
        /*5*/  { fight: fightId, user: 2, body: "Mantis is so underrated. His striking defense is elite", parent: null },
        /*6*/  { fight: fightId, user: 4, body: "Agree. 맨티스 카운터 타이밍이 역대급이야", parent: 5 },
        /*7*/  { fight: fightId, user: 5, body: "맨티스 응원합니다! 기술로 이겨주세요 💪", parent: 5 },

        // Thread 3: Main event hype
        /*8*/  { fight: fightId, user: 4, body: "This is THE fight of the night. Main event for a reason 🔥", parent: null },
        /*9*/  { fight: fightId, user: 1, body: "I think it goes to decision. Both are too tough to finish", parent: 8 },
        /*10*/ { fight: fightId, user: 6, body: "판정까지 가면 맨티스가 유리해. 포인트 파이팅 장인임", parent: 9 },
        /*11*/ { fight: fightId, user: 7, body: "몬스터가 판정까지 갈 일이 없음 ㅋㅋ KO 아니면 서브미션", parent: 10 },
        /*22*/ { fight: fightId, user: 0, body: "ㅋㅋㅋ 동의. 몬스터 스타일이 판정 가는 스타일이 아님", parent: 11 },
        /*23*/ { fight: fightId, user: 2, body: "But what if Mantis takes him down early? Could grind out a decision", parent: 11 },
        /*24*/ { fight: fightId, user: 3, body: "テイクダウンされたら判定まで行くかも", parent: 23 },

        // Thread 4: Standalone comments
        /*12*/ { fight: fightId, user: 3, body: "モンスターのKOパワーはヤバい。でもマンティスの技術が上かも", parent: null },
        /*13*/ { fight: fightId, user: 6, body: "몬스터 팬이지만 맨티스 실력은 인정. 어떤 결과든 명승부 될 듯", parent: null },
        /*14*/ { fight: fightId, user: 7, body: "라이트급 최고의 매치업이다 진짜. 티켓 구했다 현장 간다 🎫", parent: 13 },

        // ── Fight 2: Enkhjin vs Liu ──
        /*15*/ { fight: fightId2, user: 2, body: "Heavyweight bout! Enkhjin's power vs Liu's experience", parent: null },
        /*16*/ { fight: fightId2, user: 3, body: "무칼리 응원! 몽골 파이터 화이팅 🇲🇳", parent: null },
        /*17*/ { fight: fightId2, user: 0, body: "금도장군 과소평가 당하고 있음. 중국 헤비급 실력 무시 못 해", parent: 15 },
        /*18*/ { fight: fightId2, user: 1, body: "I watched his last fight — Liu's chin is suspect though", parent: 17 },
        /*19*/ { fight: fightId2, user: 5, body: "몽골 선수 레슬링이 미쳤음. 테이크다운 들어가면 끝", parent: 16 },
        /*20*/ { fight: fightId2, user: 4, body: "헤비급은 한방이라 예측 어려움 ㅋㅋ", parent: null },
        /*21*/ { fight: fightId2, user: 6, body: "Exactly. One punch can change everything at heavyweight", parent: 20 },
      ];

      const insertedComments: string[] = [];

      for (const thread of commentThreads) {
        const parentId = thread.parent !== null ? insertedComments[thread.parent] ?? null : null;
        const { data: comment } = await admin
          .from("fight_comments")
          .insert({
            fight_id: thread.fight,
            user_id: createdUsers[thread.user].id,
            parent_id: parentId,
            body: thread.body,
          })
          .select("id")
          .single();

        insertedComments.push(comment?.id ?? "");
        if (comment) createdComments++;
      }

      // Add likes
      const likePatterns = [
        { comment: 0, users: [1, 2, 3, 4, 5] },       // 5 likes
        { comment: 1, users: [0, 3, 6] },              // 3 likes
        { comment: 4, users: [0, 1, 5, 6] },           // 4 likes - good analysis
        { comment: 5, users: [0, 3, 4, 6, 7] },        // 5 likes
        { comment: 8, users: [0, 1, 2, 3, 5, 6, 7] },  // 7 likes - most popular
        { comment: 11, users: [0, 2, 4, 5] },           // 4 likes - funny
        { comment: 12, users: [0, 1, 5] },             // 3 likes
        { comment: 13, users: [0, 2, 4] },             // 3 likes
        { comment: 16, users: [0, 1, 4, 5, 6] },       // 5 likes
        { comment: 19, users: [1, 2, 3] },             // 3 likes
      ];

      for (const pattern of likePatterns) {
        const commentId = insertedComments[pattern.comment];
        if (!commentId) continue;
        for (const userIdx of pattern.users) {
          await admin.from("comment_likes").insert({
            comment_id: commentId,
            user_id: createdUsers[userIdx].id,
          });
          createdLikes++;
        }
      }
    }
  } catch {
    // Comments seeding is optional
  }

  // ── Comments on completed seed fights (post-fight reactions) ──
  try {
    const completedSeedFightIds = seedFightMeta
      .filter((f) => f.status === "completed" && f.winnerId)
      .map((f) => f.id);

    if (completedSeedFightIds.length >= 3 && createdUsers.length >= 6) {
      const sf0 = completedSeedFightIds[0]; // BC7 main event KO
      const sf1 = completedSeedFightIds[1]; // BC7 submission
      const sf2 = completedSeedFightIds[3]; // BC8 main event decision

      const postFightComments = [
        // BC7 main event - KO finish reactions
        { fight: sf0, user: 0, body: "불독 KO 미쳤다!! 2라운드 오른쪽 훅 그대로 뻗었어 🔥", parent: null },
        { fight: sf0, user: 1, body: "스나이퍼가 1라운드 잘 버텼는데 결국 파워 차이...", parent: 0 },
        { fight: sf0, user: 2, body: "What a knockout! Bulldog's right hook was devastating", parent: 0 },
        { fight: sf0, user: 3, body: "不独のパワーはやっぱり別格だった。スナイパーも良かったけど", parent: null },
        { fight: sf0, user: 4, body: "맞출줄 알았다 KO로 ㅋㅋ 보너스 포인트 ㄱㅇㄷ", parent: null },
        { fight: sf0, user: 5, body: "Exactly as I predicted! KO R2 💰", parent: 4 },

        // BC7 submission
        { fight: sf1, user: 2, body: "Didn't expect Tiger to get the submission! Great arm bar transition", parent: null },
        { fight: sf1, user: 0, body: "아이언피스트 그라운드 방어가 약한 게 드러났네", parent: 6 },
        { fight: sf1, user: 3, body: "타이거の柔術がこんなに良いとは思わなかった", parent: 6 },
        { fight: sf1, user: 1, body: "이번 대회 서브미션 퍼포먼스상 줘야됨", parent: null },

        // BC8 main event - decision
        { fight: sf2, user: 0, body: "헤머 판정승 예상했지만 생각보다 접전이었다", parent: null },
        { fight: sf2, user: 4, body: "사무라이 2라운드 테이크다운 3번 성공했는데도 판정 졌네", parent: 10 },
        { fight: sf2, user: 1, body: "Hammer's striking volume made the difference. Close fight though", parent: 10 },
        { fight: sf2, user: 5, body: "판정 논란 있을듯... 사무라이가 이겼다고 봄", parent: null },
        { fight: sf2, user: 2, body: "I had it for Samurai too but judges love striking over grappling", parent: 13 },
        { fight: sf2, user: 6, body: "접전이었지만 스탠딩 스트라이킹 차이로 헤머가 가져갔다", parent: null },
      ];

      const postInserted: string[] = [];
      for (const c of postFightComments) {
        const parentId = c.parent !== null ? postInserted[c.parent] ?? null : null;
        const { data: comment } = await admin
          .from("fight_comments")
          .insert({
            fight_id: c.fight,
            user_id: createdUsers[c.user].id,
            parent_id: parentId,
            body: c.body,
          })
          .select("id")
          .single();
        postInserted.push(comment?.id ?? "");
        if (comment) createdComments++;
      }

      // Likes on post-fight comments
      const postLikes = [
        { comment: 0, users: [1, 2, 3, 4, 5, 6] },
        { comment: 2, users: [0, 3, 4] },
        { comment: 4, users: [0, 1, 5] },
        { comment: 6, users: [0, 1, 3, 4] },
        { comment: 10, users: [1, 2, 4, 5] },
        { comment: 13, users: [0, 2, 4, 6] },
      ];
      for (const p of postLikes) {
        const cId = postInserted[p.comment];
        if (!cId) continue;
        for (const u of p.users) {
          await admin.from("comment_likes").insert({ comment_id: cId, user_id: createdUsers[u].id });
          createdLikes++;
        }
      }
    }
  } catch {
    // Post-fight comments seeding is optional
  }

  return {
    created_users: createdUsers.length,
    created_predictions: predictionsToInsert.length,
    created_rankings: createdRankings,
    created_hof_entries: createdHofEntries,
    created_comments: createdComments,
    created_likes: createdLikes,
    created_seed_events: SEED_EVENTS.length,
    created_seed_fights: createdSeedFights,
    created_seed_fighters: SEED_FIGHTERS.length,
  };
}

async function seedMyData(admin: ReturnType<typeof getAdminClient>, userId: string) {
  // Clean existing data for this user
  await admin.from("hall_of_fame_entries").delete().eq("user_id", userId);
  await admin.from("perfect_card_entries").delete().eq("user_id", userId);
  await admin.from("user_weight_class_stats").delete().eq("user_id", userId);
  await admin.from("predictions").delete().eq("user_id", userId);
  await admin.from("rankings").delete().eq("user_id", userId);

  // Get all completed fights
  const { data: fights } = await admin
    .from("fights")
    .select("id, winner_id, fighter_a_id, fighter_b_id, method, round, status, start_time, event_id")
    .eq("status", "completed")
    .not("winner_id", "is", null)
    .order("start_time", { ascending: false })
    .limit(30);

  if (!fights || fights.length === 0) return { predictions: 0 };

  const methods = ["KO/TKO", "Submission", "Decision"];
  const preds: Array<Record<string, unknown>> = [];

  for (const [i, fight] of fights.entries()) {
    const loserId = fight.fighter_a_id === fight.winner_id ? fight.fighter_b_id : fight.fighter_a_id;
    const fightMethod = fight.method ?? methods[i % 3];
    const fightRound = fight.round ?? ((i % 3) + 1);

    // ~75% win rate for the user
    const seed = (i * 17 + 3) % 100;
    const isWinnerCorrect = seed < 75;
    const pickedWinner = isWinnerCorrect ? fight.winner_id! : loserId;

    // ~55% method accuracy when winner correct
    let predMethod: string | null = null;
    const mSeed = (i * 7 + 11) % 100;
    if (isWinnerCorrect && mSeed < 55) {
      predMethod = fightMethod;
    } else {
      predMethod = methods[(methods.indexOf(fightMethod) + 1) % 3];
    }
    const isMethodCorrect = predMethod === fightMethod;

    // ~35% round accuracy when method correct
    let predRound: number | null = null;
    if (predMethod && predMethod !== "Decision") {
      const rSeed = (i * 13 + 5) % 100;
      if (isWinnerCorrect && isMethodCorrect && rSeed < 35) {
        predRound = fightRound;
      } else {
        predRound = ((fightRound % 4) + 1);
      }
    }
    const isRoundCorrect = predRound !== null ? predRound === fightRound : null;

    let score = 0;
    if (isWinnerCorrect) {
      score += 4;
      if (isMethodCorrect) score += 4;
      if (isRoundCorrect) score += predRound === 4 ? 12 : 8;
    } else {
      score = -2;
    }

    preds.push({
      user_id: userId,
      fight_id: fight.id,
      winner_id: pickedWinner,
      method: predMethod,
      round: predRound,
      score,
      is_winner_correct: isWinnerCorrect,
      is_method_correct: isMethodCorrect,
      is_round_correct: isRoundCorrect,
    });
  }

  await admin.from("predictions").insert(preds);

  // Update user stats
  const wins = preds.filter((p) => p.is_winner_correct).length;
  const losses = preds.filter((p) => !p.is_winner_correct).length;
  const totalScore = preds.reduce((sum, p) => sum + (p.score as number), 0);

  // Calculate streaks
  let currentStreak = 0;
  let bestStreak = 0;
  let streak = 0;
  for (const p of preds) {
    if (p.is_winner_correct) { streak++; bestStreak = Math.max(bestStreak, streak); }
    else streak = 0;
  }
  currentStreak = streak;

  await admin.from("users").update({
    wins, losses, score: Math.max(0, totalScore),
    current_streak: currentStreak, best_streak: bestStreak,
    p4p_score: 650,
  }).eq("id", userId);

  // Seed weight class stats (assign fights round-robin to weight classes)
  const wcNames = ["라이트급", "웰터급", "미들급", "페더급", "헤비급"];
  const wcMap = new Map<string, { wins: number; losses: number; score: number }>();
  for (const [i, _fight] of fights.entries()) {
    const wc = wcNames[i % wcNames.length];
    const pred = preds[i];
    const entry = wcMap.get(wc) ?? { wins: 0, losses: 0, score: 0 };
    if (pred.is_winner_correct) { entry.wins++; entry.score += pred.score as number; }
    else entry.losses++;
    wcMap.set(wc, entry);
  }
  for (const [wc, stat] of wcMap) {
    await admin.from("user_weight_class_stats").insert({
      user_id: userId, weight_class: wc, wins: stat.wins, losses: stat.losses, score: stat.score,
    });
  }

  // Seed HoF entries
  const completedFightIds = fights.map((f) => f.id);
  if (completedFightIds.length >= 3) {
    await admin.from("hall_of_fame_entries").insert([
      { user_id: userId, fight_id: completedFightIds[0], tier: "oracle", bonus_points: 50 },
      { user_id: userId, fight_id: completedFightIds[1], tier: "sniper", bonus_points: 20 },
    ]);
  }

  // Seed event rankings
  const eventIds = [...new Set(fights.map((f) => f.event_id))];
  for (const [ei, eventId] of eventIds.entries()) {
    await admin.from("rankings").insert({
      type: "event", reference_id: eventId, user_id: userId,
      score: Math.max(0, totalScore - ei * 30), rank: ei + 1,
    });
  }

  return { predictions: preds.length, wins, losses, score: Math.max(0, totalScore), weightClasses: wcMap.size };
}

export async function POST(request: Request) {
  if (!isDev) {
    return NextResponse.json({ error: "Not available" }, { status: 403 });
  }

  try {
    const body = await request.json().catch(() => ({}));
    const action = body?.action;

    const admin = getAdminClient();

    if (action === "empty") {
      const result = await clearTestData(admin);
      return NextResponse.json({ ok: true, action, ...result });
    }

    if (action === "full") {
      const result = await seedFullData(admin);
      return NextResponse.json({ ok: true, action, ...result });
    }

    if (action === "seed-me") {
      const userId = body?.userId;
      if (!userId) {
        return NextResponse.json({ error: "Missing userId" }, { status: 400 });
      }
      const result = await seedMyData(admin, userId);
      return NextResponse.json({ ok: true, action, ...result });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (error) {
    const message = error instanceof Error ? error.message : JSON.stringify(error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
