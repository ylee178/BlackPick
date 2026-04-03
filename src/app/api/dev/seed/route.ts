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

  if (testUserIds.length > 0) {
    await admin.from("predictions").delete().in("user_id", testUserIds);
    await admin.from("users").delete().in("id", testUserIds);
  }

  for (const user of testAuthUsers) {
    await admin.auth.admin.deleteUser(user.id);
  }

  return {
    deleted_users: testAuthUsers.length,
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
    };
  });

  const { error: usersError } = await admin.from("users").insert(publicUsers);

  if (usersError) {
    throw usersError;
  }

  const { data: completedFights, error: fightsError } = await admin
    .from("fights")
    .select("id, winner_id, status")
    .eq("status", "completed")
    .not("winner_id", "is", null)
    .limit(5);

  if (fightsError) {
    throw fightsError;
  }

  const predictionsToInsert: Array<{
    user_id: string;
    fight_id: string;
    predicted_winner_id: string;
    created_at?: string;
  }> = [];

  if (completedFights && completedFights.length > 0) {
    for (const [fightIndex, fight] of completedFights.entries()) {
      for (const [userIndex, authUser] of createdUsers.entries()) {
        const shouldPickWinner =
          userIndex === 0 ||
          userIndex === 1 ||
          (userIndex + fightIndex) % 3 !== 0;

        predictionsToInsert.push({
          user_id: authUser.id,
          fight_id: fight.id,
          predicted_winner_id: shouldPickWinner && fight.winner_id ? fight.winner_id : fight.winner_id!,
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

  return {
    created_users: createdUsers.length,
    created_predictions: predictionsToInsert.length,
  };
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

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
