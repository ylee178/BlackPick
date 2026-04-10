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

async function main() {
  const { data: users, error: usersError } = await dev
    .from("users")
    .select("id, ring_name, created_at")
    .order("created_at", { ascending: true });

  if (usersError || !users || users.length < 6) {
    throw new Error(`Failed to fetch dev users: ${usersError?.message ?? "Not enough dev users"}`);
  }

  const { data: event, error: eventError } = await dev
    .from("events")
    .select("id, name")
    .eq("status", "upcoming")
    .order("date", { ascending: true })
    .limit(1)
    .single();

  if (eventError || !event) {
    throw new Error(`Failed to fetch current upcoming event: ${eventError?.message ?? "Not found"}`);
  }

  const { data: fights, error: fightsError } = await dev
    .from("fights")
    .select(`
      id,
      fighter_a:fighters!fighter_a_id(id, name, ring_name),
      fighter_b:fighters!fighter_b_id(id, name, ring_name)
    `)
    .eq("event_id", event.id)
    .order("start_time", { ascending: false })
    .limit(3);

  if (fightsError || !fights || fights.length === 0) {
    throw new Error(`Failed to fetch event fights: ${fightsError?.message ?? "No fights"}`);
  }

  const fightIds = fights.map((fight) => fight.id);

  const { data: existingComments, error: existingCommentsError } = await dev
    .from("fight_comments")
    .select("id")
    .in("fight_id", fightIds);

  if (existingCommentsError) {
    throw new Error(`Failed to fetch existing fight comments: ${existingCommentsError.message}`);
  }

  const existingCommentIds = (existingComments ?? []).map((comment) => comment.id);
  if (existingCommentIds.length > 0) {
    await dev.from("comment_likes").delete().in("comment_id", existingCommentIds);
    await dev.from("comment_translations").delete().in("comment_id", existingCommentIds);
    await dev.from("fight_comments").delete().in("id", existingCommentIds);
  }

  const [fightOne, fightTwo, fightThree] = fights;

  const samples = [
    {
      fightId: fightOne.id,
      body: `${fightOne.fighter_a.ring_name ?? fightOne.fighter_a.name} 쪽이 템포를 더 빨리 잡을 것 같음. 초반 압박이 핵심.`,
      userIndex: 0,
      parentIndex: null,
    },
    {
      fightId: fightOne.id,
      body: `난 ${fightOne.fighter_b.ring_name ?? fightOne.fighter_b.name}가 후반에 읽어낼 것 같아. 판정까지 보면 더 위험함.`,
      userIndex: 1,
      parentIndex: 0,
    },
    {
      fightId: fightOne.id,
      body: `If ${fightOne.fighter_a.ring_name ?? fightOne.fighter_a.name} keeps it standing, this probably doesn't go the distance.`,
      userIndex: 2,
      parentIndex: 0,
    },
    {
      fightId: fightOne.id,
      body: `이 경기 댓글 분위기 보니까 거의 반반이네. 그래서 더 재밌다.`,
      userIndex: 3,
      parentIndex: null,
    },
    {
      fightId: fightTwo?.id ?? fightOne.id,
      body: `${fightTwo?.fighter_a.ring_name ?? fightTwo?.fighter_a.name ?? "A"} vs ${fightTwo?.fighter_b.ring_name ?? fightTwo?.fighter_b.name ?? "B"}는 의외로 그라운드 한 번에 갈릴 수도 있음.`,
      userIndex: 4,
      parentIndex: null,
    },
    {
      fightId: fightTwo?.id ?? fightOne.id,
      body: `이건 method 맞추는 사람이 진짜 적을 듯. 승자보다 방법이 더 어려움.`,
      userIndex: 5,
      parentIndex: 4,
    },
    {
      fightId: fightThree?.id ?? fightOne.id,
      body: `${fightThree?.fighter_a.ring_name ?? fightThree?.fighter_a.name ?? "A"} upset 가능성 꽤 있어 보이는데?`,
      userIndex: 0,
      parentIndex: null,
    },
  ];

  const insertedCommentIds = [];

  for (const sample of samples) {
    const parentId =
      sample.parentIndex === null ? null : insertedCommentIds[sample.parentIndex] ?? null;
    const { data: inserted, error: insertError } = await dev
      .from("fight_comments")
      .insert({
        fight_id: sample.fightId,
        user_id: users[sample.userIndex].id,
        parent_id: parentId,
        body: sample.body,
      })
      .select("id")
      .single();

    if (insertError || !inserted) {
      throw new Error(`Failed to insert fight comment: ${insertError?.message ?? "Unknown error"}`);
    }

    insertedCommentIds.push(inserted.id);
  }

  let likesInserted = 0;
  const { error: commentLikesProbeError } = await dev
    .from("comment_likes")
    .select("comment_id")
    .limit(1);

  if (!commentLikesProbeError) {
    const likePatterns = [
      { commentIndex: 0, userIndexes: [1, 2, 3, 4] },
      { commentIndex: 3, userIndexes: [0, 2, 5] },
      { commentIndex: 4, userIndexes: [0, 1, 2] },
      { commentIndex: 6, userIndexes: [1, 3] },
    ];

    const likes = [];
    for (const pattern of likePatterns) {
      for (const userIndex of pattern.userIndexes) {
        likes.push({
          comment_id: insertedCommentIds[pattern.commentIndex],
          user_id: users[userIndex].id,
        });
      }
    }

    if (likes.length > 0) {
      const { error: likesError } = await dev.from("comment_likes").insert(likes);
      if (likesError) {
        throw new Error(`Failed to insert comment likes: ${likesError.message}`);
      }
      likesInserted = likes.length;
    }
  }

  console.log(
    JSON.stringify(
      {
        event: {
          id: event.id,
          name: event.name,
        },
        seeded: {
          comments: insertedCommentIds.length,
          likes: likesInserted,
          fights: fightIds.length,
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
