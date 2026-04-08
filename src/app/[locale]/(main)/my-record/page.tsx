import { createSupabaseServer, getUser } from "@/lib/supabase-server";
import { getTranslations } from "@/lib/i18n-server";
import { getLocalizedEventName, getLocalizedFighterName } from "@/lib/localized-name";
import { countryCodeToFlag } from "@/lib/flags";
import { getFighterAvatarUrl } from "@/lib/fighter-avatar";
import { RetroEmptyState } from "@/components/ui/retro";
import PredictionsList from "@/components/PredictionsList";

export const dynamic = "force-dynamic";

export default async function MyRecordPage() {
  const supabase = await createSupabaseServer();
  const authUser = await getUser();
  const { t, locale } = await getTranslations();

  if (!authUser) {
    return <RetroEmptyState title={t("common.loginRequired")} />;
  }

  const { data: preds } = await supabase
    .from("predictions")
    .select(`
      id, winner_id, method, round, score, is_winner_correct, is_method_correct, is_round_correct, created_at,
      fight:fights!fight_id(
        id, event_id, status, winner_id, method, round, start_time,
        fighter_a:fighters!fighter_a_id(id, name, ring_name, name_en, name_ko, nationality, image_url, weight_class),
        fighter_b:fighters!fighter_b_id(id, name, ring_name, name_en, name_ko, nationality, image_url, weight_class),
        event:events!event_id(id, name, date, status, series_type)
      )
    `)
    .eq("user_id", authUser.id)
    .order("created_at", { ascending: false });

  type RawPred = NonNullable<typeof preds>[number];

  const items = (preds ?? []).map((p: RawPred) => {
    const fight = p.fight as Record<string, unknown> | null;
    if (!fight) return null;
    const fighterA = fight.fighter_a as Record<string, string | null> | null;
    const fighterB = fight.fighter_b as Record<string, string | null> | null;
    const event = fight.event as Record<string, string | null> | null;
    const isAWinner = fight.winner_id === fighterA?.id;
    const winnerFighter = isAWinner ? fighterA : fighterB;
    const fighterALabel = getLocalizedFighterName(fighterA as Parameters<typeof getLocalizedFighterName>[0], locale, fighterA?.name ?? "");
    const fighterBLabel = getLocalizedFighterName(fighterB as Parameters<typeof getLocalizedFighterName>[0], locale, fighterB?.name ?? "");
    const winnerLabel = isAWinner ? fighterALabel : fighterBLabel;
    const loserLabel = isAWinner ? fighterBLabel : fighterALabel;

    return {
      id: p.id,
      createdAt: p.created_at,
      winnerCorrect: p.is_winner_correct,
      methodCorrect: p.is_method_correct,
      roundCorrect: p.is_round_correct,
      score: p.score,
      predMethod: p.method,
      predRound: p.round,
      fightMethod: fight.method as string | null,
      fightRound: fight.round as number | null,
      winnerLabel,
      loserLabel,
      winnerFlag: countryCodeToFlag(winnerFighter?.nationality),
      loserFlag: countryCodeToFlag((isAWinner ? fighterB : fighterA)?.nationality),
      avatarUrl: getFighterAvatarUrl(winnerFighter as Parameters<typeof getFighterAvatarUrl>[0]),
      avatarInitial: (winnerFighter?.name ?? "?").charAt(0),
      fighterAName: fighterALabel,
      fighterBName: fighterBLabel,
      fighterAFlag: countryCodeToFlag(fighterA?.nationality),
      fighterBFlag: countryCodeToFlag(fighterB?.nationality),
      fighterAAvatarUrl: getFighterAvatarUrl(fighterA as Parameters<typeof getFighterAvatarUrl>[0]),
      fighterBAvatarUrl: getFighterAvatarUrl(fighterB as Parameters<typeof getFighterAvatarUrl>[0]),
      fighterAInitial: (fighterALabel || "?").charAt(0),
      fighterBInitial: (fighterBLabel || "?").charAt(0),
      myPickName: p.winner_id === fighterA?.id ? fighterALabel : fighterBLabel,
      eventId: event?.id ?? "",
      eventName: event ? getLocalizedEventName(event as Parameters<typeof getLocalizedEventName>[0], locale) : "",
      eventDate: event?.date ?? "",
    };
  }).filter(Boolean) as Array<{
    id: string; createdAt: string;
    winnerCorrect: boolean | null; methodCorrect: boolean | null; roundCorrect: boolean | null;
    score: number | null; predMethod: string | null; predRound: number | null;
    fightMethod: string | null; fightRound: number | null;
    winnerLabel: string; loserLabel: string;
    winnerFlag: string; loserFlag: string;
    avatarUrl: string | null; avatarInitial: string;
    fighterAName: string; fighterBName: string;
    fighterAFlag: string; fighterBFlag: string;
    fighterAAvatarUrl: string | null; fighterBAvatarUrl: string | null;
    fighterAInitial: string; fighterBInitial: string;
    myPickName: string;
    eventId: string; eventName: string; eventDate: string;
  }>;

  // Black Cup: compute winning country per event (cup matches only)
  const blackCupWinners: Record<string, string> = {};
  {
    // Collect Black Cup event IDs from user's predictions
    const bcEventIds = new Set<string>();
    for (const item of items) {
      if (!item) continue;
      // Check series_type from the raw prediction data
      const pred = (preds ?? []).find((p: RawPred) => p.id === item.id);
      const fight = pred?.fight as Record<string, unknown> | null;
      const event = fight?.event as Record<string, string | null> | null;
      if (event?.series_type === "black_cup" && event?.id) bcEventIds.add(event.id);
    }

    if (bcEventIds.size > 0) {
      // Fetch all cup-match fights for these events (not just user's predictions)
      const { data: cupFights } = await supabase
        .from("fights")
        .select("event_id, winner_id, fighter_a_id, fighter_b_id, fighter_a:fighters!fighter_a_id(nationality), fighter_b:fighters!fighter_b_id(nationality)")
        .in("event_id", [...bcEventIds])
        .eq("is_cup_match", true)
        .eq("status", "completed");

      for (const eid of bcEventIds) {
        const countryMap = new Map<string, number>();
        for (const f of (cupFights ?? []).filter((cf: { event_id: string }) => cf.event_id === eid)) {
          if (!f.winner_id) continue;
          const winnerNat = f.winner_id === f.fighter_a_id
            ? (f.fighter_a as Record<string, string | null> | null)?.nationality
            : (f.fighter_b as Record<string, string | null> | null)?.nationality;
          if (winnerNat) countryMap.set(winnerNat, (countryMap.get(winnerNat) ?? 0) + 1);
        }
        let top = "";
        let topN = 0;
        for (const [c, n] of countryMap) { if (n > topN) { top = c; topN = n; } }
        if (top) blackCupWinners[eid] = countryCodeToFlag(top);
      }
    }
  }

  // Perfect card events for this user
  const { data: perfectCards } = await supabase
    .from("perfect_card_entries")
    .select("event_id")
    .eq("user_id", authUser.id);
  const perfectEventIds = new Set((perfectCards ?? []).map((pc) => pc.event_id));

  return (
    <div>
      <h1 className="mb-5 text-2xl font-bold text-[var(--bp-ink)]">
        {t("nav.myRecord")} <span className="text-[var(--bp-muted)]">({items.length})</span>
      </h1>
      <PredictionsList items={items} perfectEventIds={[...perfectEventIds]} blackCupWinners={blackCupWinners} />
    </div>
  );
}
