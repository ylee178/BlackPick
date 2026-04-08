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

  // Black Cup: compute winning country per event
  const blackCupWinners: Record<string, string> = {}; // eventId → flag emoji
  {
    const bcEvents = new Set<string>();
    const eventFights = new Map<string, { winnerId: string | null; aId: string | null; bId: string | null; aNat: string | null; bNat: string | null }[]>();

    for (const p of preds ?? []) {
      const fight = p.fight as Record<string, unknown> | null;
      if (!fight) continue;
      const event = fight.event as Record<string, string | null> | null;
      if (event?.series_type !== "black_cup") continue;
      const eid = event?.id ?? "";
      if (!eid) continue;
      bcEvents.add(eid);
      const fa = fight.fighter_a as Record<string, string | null> | null;
      const fb = fight.fighter_b as Record<string, string | null> | null;
      const arr = eventFights.get(eid) ?? [];
      arr.push({
        winnerId: fight.winner_id as string | null,
        aId: fa?.id ?? null, bId: fb?.id ?? null,
        aNat: fa?.nationality ?? null, bNat: fb?.nationality ?? null,
      });
      eventFights.set(eid, arr);
    }

    for (const eid of bcEvents) {
      const countryMap = new Map<string, number>();
      for (const f of eventFights.get(eid) ?? []) {
        if (!f.winnerId) continue;
        const nat = f.winnerId === f.aId ? f.aNat : f.bNat;
        if (nat) countryMap.set(nat, (countryMap.get(nat) ?? 0) + 1);
      }
      let top = "";
      let topN = 0;
      for (const [c, n] of countryMap) { if (n > topN) { top = c; topN = n; } }
      if (top) blackCupWinners[eid] = countryCodeToFlag(top);
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
