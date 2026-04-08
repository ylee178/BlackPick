import type { SupabaseClient } from "@supabase/supabase-js";
import type { EarnedBadge } from "./badge-config";

const VALID_TIERS = new Set(["oracle", "sniper", "sharp_call"]);
type HofTier = "oracle" | "sniper" | "sharp_call";

/** Single user badge query */
export async function getUserBadges(
  supabase: SupabaseClient,
  userId: string,
): Promise<EarnedBadge[]> {
  const [hofRes, perfectRes] = await Promise.all([
    supabase
      .from("hall_of_fame_entries")
      .select("tier")
      .eq("user_id", userId),
    supabase
      .from("perfect_card_entries")
      .select("event_id")
      .eq("user_id", userId),
  ]);

  if (hofRes.error || perfectRes.error) return [];

  const badges: EarnedBadge[] = [];
  const tierCount = new Map<HofTier, number>();

  for (const row of hofRes.data ?? []) {
    if (!VALID_TIERS.has(row.tier)) continue;
    const t = row.tier as HofTier;
    tierCount.set(t, (tierCount.get(t) ?? 0) + 1);
  }

  for (const tier of ["oracle", "sniper", "sharp_call"] as const) {
    const count = tierCount.get(tier) ?? 0;
    if (count > 0) badges.push({ type: tier, count });
  }

  const perfectCount = perfectRes.data?.length ?? 0;
  if (perfectCount > 0) badges.push({ type: "perfect_card", count: perfectCount });

  return badges;
}

/** Batch query for multiple users (ranking/comments) */
export async function getUsersBadgeMap(
  supabase: SupabaseClient,
  userIds: string[],
): Promise<Record<string, EarnedBadge[]>> {
  if (userIds.length === 0) return {};

  const unique = [...new Set(userIds)];

  const [hofRes, perfectRes] = await Promise.all([
    supabase
      .from("hall_of_fame_entries")
      .select("user_id, tier")
      .in("user_id", unique),
    supabase
      .from("perfect_card_entries")
      .select("user_id")
      .in("user_id", unique),
  ]);

  if (hofRes.error || perfectRes.error) return {};

  const result: Record<string, EarnedBadge[]> = {};
  for (const id of unique) result[id] = [];

  // HOF badges
  for (const row of hofRes.data ?? []) {
    if (!VALID_TIERS.has(row.tier)) continue;
    if (!result[row.user_id]) continue;
    const tier = row.tier as HofTier;
    const existing = result[row.user_id].find((b) => b.type === tier);
    if (existing) existing.count++;
    else result[row.user_id].push({ type: tier, count: 1 });
  }

  // Perfect card
  for (const row of perfectRes.data ?? []) {
    if (!result[row.user_id]) continue;
    const existing = result[row.user_id].find((b) => b.type === "perfect_card");
    if (existing) existing.count++;
    else result[row.user_id].push({ type: "perfect_card", count: 1 });
  }

  return result;
}
