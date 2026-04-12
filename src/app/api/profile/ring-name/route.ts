import { NextResponse } from "next/server";
import { createSupabaseAdmin } from "@/lib/supabase-admin";
import { createSupabaseServer } from "@/lib/supabase-server";
import {
  buildRingNameSuggestions,
  escapeIlikePattern,
  getRingNameValidationError,
  normalizeRingName,
} from "@/lib/ring-name";

type ExistingUser = {
  id: string;
  ring_name: string;
};

type AdminClient = ReturnType<typeof createSupabaseAdmin>;

async function findRingNameConflict(
  admin: AdminClient,
  currentUserId: string,
  ringName: string
) {
  const normalizedTarget = normalizeRingName(ringName).toLowerCase();

  // Escape `_`/`%`/`\` so the ILIKE compares the literal string. Ring
  // names allow `_` (see RING_NAME_PATTERN) which is also a single-char
  // ILIKE wildcard — without the escape, "a_b" would silently collide
  // with "acb" and we'd reject a perfectly valid name. The post-fetch
  // JS comparison already filtered to exact-lowercase matches, but the
  // unfiltered DB query would return false positives that wasted reads.
  const { data, error } = await admin
    .from("users")
    .select("id, ring_name")
    .ilike("ring_name", escapeIlikePattern(ringName));

  if (error) {
    throw error;
  }

  return (data ?? []).find((user) => {
    if (user.id === currentUserId) {
      return false;
    }

    return normalizeRingName(user.ring_name).toLowerCase() === normalizedTarget;
  }) as ExistingUser | undefined;
}

async function getAvailableSuggestions(
  admin: AdminClient,
  currentUserId: string,
  baseRingName: string
) {
  const suggestions: string[] = [];

  for (const candidate of buildRingNameSuggestions(baseRingName)) {
    const conflict = await findRingNameConflict(admin, currentUserId, candidate);

    if (!conflict) {
      suggestions.push(candidate);
    }

    if (suggestions.length === 3) {
      break;
    }
  }

  return suggestions;
}

export async function POST(request: Request) {
  const supabase = await createSupabaseServer();
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();

  if (!authUser) {
    return NextResponse.json({ code: "unauthorized" }, { status: 401 });
  }

  let body: { ringName?: string } = {};

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ code: "invalid_payload" }, { status: 400 });
  }

  const ringName = normalizeRingName(body.ringName ?? "");
  const validationError = getRingNameValidationError(ringName);

  if (validationError) {
    return NextResponse.json({ code: validationError }, { status: 400 });
  }

  try {
    const admin = createSupabaseAdmin();
    const existingConflict = await findRingNameConflict(admin, authUser.id, ringName);

    if (existingConflict) {
      return NextResponse.json(
        {
          code: "ring_name_taken",
          suggestions: await getAvailableSuggestions(admin, authUser.id, ringName),
        },
        { status: 409 }
      );
    }

    const { data: existingUser, error: existingUserError } = await admin
      .from("users")
      .select("id")
      .eq("id", authUser.id)
      .maybeSingle();

    if (existingUserError) {
      throw existingUserError;
    }

    const mutation = existingUser
      ? admin
          .from("users")
          .update({
            ring_name: ringName,
          })
          .eq("id", authUser.id)
      : admin.from("users").insert({
          id: authUser.id,
          ring_name: ringName,
        });

    const { error: mutationError } = await mutation;

    if (mutationError) {
      if (mutationError.code === "23505") {
        return NextResponse.json(
          {
            code: "ring_name_taken",
            suggestions: await getAvailableSuggestions(admin, authUser.id, ringName),
          },
          { status: 409 }
        );
      }

      throw mutationError;
    }

    return NextResponse.json({ ringName });
  } catch (error) {
    console.error("Failed to save ring name", error);

    return NextResponse.json({ code: "unexpected_error" }, { status: 500 });
  }
}
