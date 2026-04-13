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

async function supportsCommentLikes(admin: ReturnType<typeof getAdminClient>) {
  const { error } = await admin.from("comment_likes").select("comment_id").limit(1);
  return !error;
}

async function getDiscussionSeedFights(admin: ReturnType<typeof getAdminClient>) {
  let { data: event } = await admin
    .from("events")
    .select("id")
    .in("status", ["upcoming", "live"])
    .order("date", { ascending: true })
    .limit(1)
    .single();

  if (!event) {
    const fallback = await admin
      .from("events")
      .select("id")
      .order("date", { ascending: false })
      .limit(1)
      .single();
    event = fallback.data ?? null;
  }

  if (!event) {
    return [];
  }

  const { data: fights } = await admin
    .from("fights")
    .select(`
      id,
      fighter_a:fighters!fighter_a_id(id, name, ring_name),
      fighter_b:fighters!fighter_b_id(id, name, ring_name)
    `)
    .eq("event_id", event.id)
    .order("start_time", { ascending: true })
    .limit(3);

  return fights ?? [];
}

async function seedDiscussionPreview(
  admin: ReturnType<typeof getAdminClient>,
  createdUsers: { id: string; email: string }[],
) {
  let createdComments = 0;
  let createdLikes = 0;

  try {
    const fights = await getDiscussionSeedFights(admin);

    if (fights.length === 0 || createdUsers.length < 6) {
      return { createdComments, createdLikes };
    }

    const getFighterName = (
      fighter: { ring_name?: string | null; name?: string | null } | Array<{ ring_name?: string | null; name?: string | null }> | null | undefined,
    ) => {
      const value = Array.isArray(fighter) ? fighter[0] : fighter;
      return value?.ring_name ?? value?.name ?? "Fighter";
    };

    const [fightOne, fightTwo, fightThree] = fights;
    const samples = [
      {
        fightId: fightOne.id,
        body: `${getFighterName(fightOne.fighter_a)} 쪽이 템포를 먼저 잡을 것 같음. 초반 압박이 변수다.`,
        userIndex: 0,
        parentIndex: null,
      },
      {
        fightId: fightOne.id,
        body: `난 ${getFighterName(fightOne.fighter_b)}가 후반 읽어낼 것 같아. 판정 가면 더 위험함.`,
        userIndex: 1,
        parentIndex: 0,
      },
      {
        fightId: fightOne.id,
        body: `If ${getFighterName(fightOne.fighter_a)} keeps it standing, this probably doesn't go the distance.`,
        userIndex: 2,
        parentIndex: 0,
      },
      {
        fightId: fightOne.id,
        body: "이 경기 댓글 분위기 거의 반반이네. 그래서 더 재밌다.",
        userIndex: 3,
        parentIndex: null,
      },
      {
        fightId: fightTwo?.id ?? fightOne.id,
        body: `${getFighterName(fightTwo?.fighter_a)} vs ${getFighterName(fightTwo?.fighter_b)}는 한 번의 그라운드 전환으로 갈릴 수 있음.`,
        userIndex: 4,
        parentIndex: null,
      },
      {
        fightId: fightTwo?.id ?? fightOne.id,
        body: "이건 승자보다 방법 맞추는 사람이 더 적을 듯.",
        userIndex: 5,
        parentIndex: 4,
      },
      {
        fightId: fightThree?.id ?? fightOne.id,
        body: `${getFighterName(fightThree?.fighter_a)} upset 가능성 꽤 있어 보이는데?`,
        userIndex: 0,
        parentIndex: null,
      },
    ];

    const insertedCommentIds: string[] = [];

    for (const sample of samples) {
      const parentId =
        sample.parentIndex === null ? null : insertedCommentIds[sample.parentIndex] ?? null;

      const { data: inserted, error } = await admin
        .from("fight_comments")
        .insert({
          fight_id: sample.fightId,
          user_id: createdUsers[sample.userIndex].id,
          parent_id: parentId,
          body: sample.body,
        })
        .select("id")
        .single();

      if (error || !inserted) {
        throw error ?? new Error("Failed to insert discussion preview comment");
      }

      insertedCommentIds.push(inserted.id);
      createdComments++;
    }

    if (await supportsCommentLikes(admin)) {
      const likePatterns = [
        { commentIndex: 0, userIndexes: [1, 2, 3, 4] },
        { commentIndex: 3, userIndexes: [0, 2, 5] },
        { commentIndex: 4, userIndexes: [0, 1, 2] },
        { commentIndex: 6, userIndexes: [1, 3] },
      ];

      const likes = likePatterns.flatMap((pattern) =>
        pattern.userIndexes.map((userIndex) => ({
          comment_id: insertedCommentIds[pattern.commentIndex],
          user_id: createdUsers[userIndex].id,
        }))
      );

      if (likes.length > 0) {
        const { error } = await admin.from("comment_likes").insert(likes);
        if (!error) {
          createdLikes = likes.length;
        }
      }
    }
  } catch {
    // Discussion preview seeding is optional
  }

  return { createdComments, createdLikes };
}

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

  const createdSeedFights = 0;
  const createdSeedEvents = 0;
  const createdSeedFighters = 0;

  // Use existing completed fights so dev/local preview stays aligned with the real card.
  const completedFightsQuery = admin
    .from("fights")
    .select("id, winner_id, fighter_a_id, fighter_b_id, method, round, status, start_time")
    .eq("status", "completed")
    .not("winner_id", "is", null);
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

  const { createdComments, createdLikes } = await seedDiscussionPreview(admin, createdUsers);

  return {
    created_users: createdUsers.length,
    created_predictions: predictionsToInsert.length,
    created_rankings: createdRankings,
    created_hof_entries: createdHofEntries,
    created_comments: createdComments,
    created_likes: createdLikes,
    created_seed_events: createdSeedEvents,
    created_seed_fights: createdSeedFights,
    created_seed_fighters: createdSeedFighters,
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
  for (const [i] of fights.entries()) {
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

async function completeFights(admin: ReturnType<typeof getAdminClient>) {
  const methods = ["KO/TKO", "Submission", "Decision"] as const;

  // Find the latest upcoming/live event (the one featured on homepage)
  const { data: latestEvent } = await admin
    .from("events")
    .select("id, name")
    .in("status", ["upcoming", "live"])
    .order("date", { ascending: false })
    .limit(1)
    .single();

  if (!latestEvent) {
    return { completed_fights: 0, completed_events: 0, event_name: null };
  }

  const { data: fights } = await admin
    .from("fights")
    .select("id, fighter_a_id, fighter_b_id, status")
    .eq("event_id", latestEvent.id)
    .in("status", ["upcoming", "live"]);

  if (!fights || fights.length === 0) {
    return { completed_fights: 0, completed_events: 0, event_name: latestEvent.name };
  }

  let completedFights = 0;
  for (const fight of fights) {
    const winnerId = Math.random() < 0.5 ? fight.fighter_a_id : fight.fighter_b_id;
    const method = methods[Math.floor(Math.random() * methods.length)];
    const round = method === "Decision" ? 3 : Math.floor(Math.random() * 3) + 1;

    const { error } = await admin
      .from("fights")
      .update({ status: "completed", winner_id: winnerId, method, round })
      .eq("id", fight.id);

    if (!error) completedFights++;
  }

  // Mark event as completed
  await admin
    .from("events")
    .update({ status: "completed" })
    .eq("id", latestEvent.id);

  return { completed_fights: completedFights, completed_events: 1, event_name: latestEvent.name };
}

// ── DevPanel v2 actions ────────────────────────────────────────────────
//
// These are the finer-grained actions backing the switch-based DevPanel
// rewrite. Everything below targets the latest (featured) event because
// that's the surface Sean actually tests against. The existing
// completeFights / resetFights helpers stay for backwards compat with
// older DevPanel callers.

async function setEventStatus(
  admin: ReturnType<typeof getAdminClient>,
  status: "upcoming" | "live" | "completed",
) {
  const { data: latestEvent } = await admin
    .from("events")
    .select("id, name")
    .order("date", { ascending: false })
    .limit(1)
    .single();

  if (!latestEvent) {
    return { ok: false, reason: "no event" };
  }

  // Mapping:
  //   upcoming  → delegate to resetFights so fights + predictions are
  //               cleaned back to a pre-event state. This is destructive
  //               (clears winner/method/round/scores) but it's dev-only.
  //   completed → delegate to completeFights so random winners + scoring
  //               fills in. Also destructive.
  //   live      → keep the fights untouched (status stays 'upcoming' per
  //               the CHECK constraint on fights.status) but flip the
  //               event itself to 'live'. The fight-level live state is
  //               derived from start_time vs now() in the UI, so this is
  //               enough to simulate the "event in progress" surface.
  if (status === "upcoming") {
    const result = await resetFights(admin);
    return { ok: true, status, ...result };
  }
  if (status === "completed") {
    const result = await completeFights(admin);
    return { ok: true, status, ...result };
  }
  // live
  await admin
    .from("events")
    .update({ status: "live" })
    .eq("id", latestEvent.id);
  return { ok: true, status, event_name: latestEvent.name };
}

/**
 * Preview the title_fight + main_card visual treatments on the latest
 * event. Flips the first fight (earliest start_time) to
 * is_title_fight=true + is_main_card=true, marks the first half of the
 * remaining fights as is_main_card=true, and leaves the second half as
 * undercard. Returns how many rows got each flag so the DevPanel can
 * surface a useful count in the status message.
 *
 * Dev-only preview helper — the crawler can never infer either flag
 * from source markup, so in production an admin flips them manually.
 */
async function setContentFlagsPreview(
  admin: ReturnType<typeof getAdminClient>,
) {
  const { data: latestEvent } = await admin
    .from("events")
    .select("id, name")
    .order("date", { ascending: false })
    .limit(1)
    .single();

  if (!latestEvent) {
    return { ok: false, reason: "no event" };
  }

  // Secondary sort on `id` so dev seed data with identical start_times
  // still produces a deterministic "headline fight" assignment across
  // repeated preview runs.
  const { data: fights, error: fetchErr } = await admin
    .from("fights")
    .select("id")
    .eq("event_id", latestEvent.id)
    .order("start_time", { ascending: true })
    .order("id", { ascending: true });

  if (fetchErr) {
    return { ok: false, reason: `fetch fights: ${fetchErr.message}` };
  }

  const fightIds = (fights ?? []).map((f) => f.id);
  if (fightIds.length === 0) {
    return { ok: true, event_name: latestEvent.name, title_fights: 0, main_card: 0 };
  }

  // Reset every flag on the event first so repeated clicks produce a
  // clean preview state instead of compounding prior runs. Known limit:
  // the 3 sequential updates below are NOT transactional via supabase-js
  // — a failure mid-sequence leaves the event in a partial state and
  // the next preview click self-heals via this reset. Acceptable for
  // dev-only tooling; not safe for production admin flows.
  const { error: resetErr } = await admin
    .from("fights")
    .update({ is_title_fight: false, is_main_card: false })
    .eq("event_id", latestEvent.id);
  if (resetErr) {
    return { ok: false, reason: `reset flags: ${resetErr.message}` };
  }

  const headlineId = fightIds[0];
  const remaining = fightIds.slice(1);
  const mainCardSlice = remaining.slice(0, Math.ceil(remaining.length / 2));
  const mainCardIds = [headlineId, ...mainCardSlice];

  const { error: headlineErr } = await admin
    .from("fights")
    .update({ is_title_fight: true, is_main_card: true })
    .eq("id", headlineId);
  if (headlineErr) {
    return { ok: false, reason: `set headline: ${headlineErr.message}` };
  }

  if (mainCardSlice.length > 0) {
    const { error: mainErr } = await admin
      .from("fights")
      .update({ is_main_card: true })
      .in("id", mainCardSlice);
    if (mainErr) {
      return { ok: false, reason: `set main card: ${mainErr.message}` };
    }
  }

  return {
    ok: true,
    event_name: latestEvent.name,
    title_fights: 1,
    main_card: mainCardIds.length,
  };
}

async function clearContentFlags(admin: ReturnType<typeof getAdminClient>) {
  const { data: latestEvent } = await admin
    .from("events")
    .select("id, name")
    .order("date", { ascending: false })
    .limit(1)
    .single();

  if (!latestEvent) {
    return { ok: false, reason: "no event" };
  }

  const { data: updated, error } = await admin
    .from("fights")
    .update({ is_title_fight: false, is_main_card: false })
    .eq("event_id", latestEvent.id)
    .select("id");

  if (error) {
    return { ok: false, reason: `clear flags: ${error.message}` };
  }

  return {
    ok: true,
    event_name: latestEvent.name,
    fights: updated?.length ?? 0,
  };
}

async function getUserState(
  admin: ReturnType<typeof getAdminClient>,
  userId: string,
) {
  const { data: latestEvent } = await admin
    .from("events")
    .select("id, name, status, date")
    .order("date", { ascending: false })
    .limit(1)
    .single();

  const { data: userRow } = await admin
    .from("users")
    .select("id, ring_name")
    .eq("id", userId)
    .maybeSingle();

  const { count: predictionsCount } = await admin
    .from("predictions")
    .select("*", { count: "exact", head: true })
    .eq("user_id", userId);

  let predictedOnLatest = 0;
  let predictableOnLatest = 0;
  if (latestEvent) {
    const { data: fights } = await admin
      .from("fights")
      .select("id, status")
      .eq("event_id", latestEvent.id);
    const upcomingFightIds = (fights ?? [])
      .filter((f) => f.status === "upcoming")
      .map((f) => f.id);
    predictableOnLatest = upcomingFightIds.length;
    if (upcomingFightIds.length > 0) {
      const { count } = await admin
        .from("predictions")
        .select("*", { count: "exact", head: true })
        .eq("user_id", userId)
        .in("fight_id", upcomingFightIds);
      predictedOnLatest = count ?? 0;
    }
  }

  return {
    has_ring_name: !!userRow?.ring_name,
    ring_name: userRow?.ring_name ?? null,
    has_predictions: (predictionsCount ?? 0) > 0,
    prediction_count: predictionsCount ?? 0,
    predicted_on_latest: predictedOnLatest,
    predictable_on_latest: predictableOnLatest,
    latest_event_id: latestEvent?.id ?? null,
    latest_event_name: latestEvent?.name ?? null,
    latest_event_status: latestEvent?.status ?? null,
  };
}

async function setRingName(
  admin: ReturnType<typeof getAdminClient>,
  userId: string,
  ringName: string | null,
) {
  const { error } = await admin
    .from("users")
    .update({ ring_name: ringName })
    .eq("id", userId);
  return { ok: !error, error: error?.message };
}

async function clearMyPredictions(
  admin: ReturnType<typeof getAdminClient>,
  userId: string,
) {
  const { error, count } = await admin
    .from("predictions")
    .delete({ count: "exact" })
    .eq("user_id", userId);
  return { ok: !error, cleared: count ?? 0, error: error?.message };
}

async function resetFights(admin: ReturnType<typeof getAdminClient>) {
  // Reset the latest event (featured on homepage) back to upcoming
  const { data: latestEvent } = await admin
    .from("events")
    .select("id, name")
    .eq("status", "completed")
    .order("date", { ascending: false })
    .limit(1)
    .single();

  if (!latestEvent) {
    return { reset_fights: 0, reset_events: 0, event_name: null };
  }

  let resetCount = 0;
  const { data: fights } = await admin
    .from("fights")
    .select("id")
    .eq("event_id", latestEvent.id)
    .eq("status", "completed");

  for (const f of fights ?? []) {
    await admin
      .from("predictions")
      .update({ is_winner_correct: null, is_method_correct: null, is_round_correct: null, score: null })
      .eq("fight_id", f.id);

    const { error } = await admin
      .from("fights")
      .update({ status: "upcoming", winner_id: null, method: null, round: null })
      .eq("id", f.id);

    if (!error) resetCount++;
  }

  await admin
    .from("events")
    .update({ status: "upcoming" })
    .eq("id", latestEvent.id);

  return { reset_fights: resetCount, reset_events: 1, event_name: latestEvent.name };
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

    if (action === "complete-fights") {
      const result = await completeFights(admin);
      return NextResponse.json({ ok: true, action, ...result });
    }

    if (action === "reset-fights") {
      const result = await resetFights(admin);
      return NextResponse.json({ ok: true, action, ...result });
    }

    if (action === "status") {
      const { data: latest } = await admin
        .from("events")
        .select("status")
        .order("date", { ascending: false })
        .limit(1)
        .single();
      return NextResponse.json({ ok: true, featured_status: latest?.status ?? "unknown" });
    }

    if (action === "seed-me") {
      const userId = body?.userId;
      if (!userId) {
        return NextResponse.json({ error: "Missing userId" }, { status: 400 });
      }
      const result = await seedMyData(admin, userId);
      return NextResponse.json({ ok: true, action, ...result });
    }

    // ── DevPanel v2 actions ────────────────────────────────────────────

    if (action === "set-event-status") {
      const next = body?.status;
      if (next !== "upcoming" && next !== "live" && next !== "completed") {
        return NextResponse.json({ error: "Invalid status" }, { status: 400 });
      }
      const result = await setEventStatus(admin, next);
      return NextResponse.json({ action, ...result });
    }

    if (action === "get-user-state") {
      const userId = body?.userId;
      if (!userId) {
        return NextResponse.json({ error: "Missing userId" }, { status: 400 });
      }
      const state = await getUserState(admin, userId);
      return NextResponse.json({ ok: true, action, ...state });
    }

    if (action === "set-ring-name") {
      const userId = body?.userId;
      const ringName = body?.ringName ?? null;
      if (!userId) {
        return NextResponse.json({ error: "Missing userId" }, { status: 400 });
      }
      const result = await setRingName(admin, userId, ringName);
      return NextResponse.json({ action, ...result });
    }

    if (action === "clear-my-predictions") {
      const userId = body?.userId;
      if (!userId) {
        return NextResponse.json({ error: "Missing userId" }, { status: 400 });
      }
      const result = await clearMyPredictions(admin, userId);
      return NextResponse.json({ action, ...result });
    }

    if (action === "set-content-flags-preview") {
      const result = await setContentFlagsPreview(admin);
      return NextResponse.json({ action, ...result });
    }

    if (action === "clear-content-flags") {
      const result = await clearContentFlags(admin);
      return NextResponse.json({ action, ...result });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (error) {
    const message = error instanceof Error ? error.message : JSON.stringify(error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
