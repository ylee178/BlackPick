import { createSupabaseServer, getUser } from "@/lib/supabase-server";
import { getTranslations } from "@/lib/i18n-server";
import { getLocalizedFighterName, getLocalizedFighterSubLabel } from "@/lib/localized-name";
import { getFighterAvatarUrl } from "@/lib/fighter-avatar";
import { countryCodeToFlag } from "@/lib/flags";
import { translateWeightClass } from "@/lib/weight-class";
import { RetroEmptyState, retroPanelClassName } from "@/components/ui/retro";
import FighterComments from "@/components/FighterComments";
import FighterAvatar from "@/components/FighterAvatar";
import { parseRecord } from "@/lib/parse-record";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{ id: string }>;
};

export default async function FighterDetailPage({ params }: PageProps) {
  const { id } = await params;
  const supabase = await createSupabaseServer();
  const authUser = await getUser();
  const { t, locale } = await getTranslations();

  const { data: fighter } = await supabase
    .from("fighters")
    .select("id, name, ring_name, name_en, name_ko, record, nationality, weight_class, image_url")
    .eq("id", id)
    .single();

  if (!fighter) {
    return <RetroEmptyState title="Fighter not found" />;
  }

  // Get fight history
  const { data: fights } = await supabase
    .from("fights")
    .select(`
      id, status, winner_id, method, round, start_time,
      fighter_a:fighters!fighter_a_id(id, name, ring_name, name_en, name_ko, nationality),
      fighter_b:fighters!fighter_b_id(id, name, ring_name, name_en, name_ko, nationality),
      event:events!event_id(id, name, date)
    `)
    .or(`fighter_a_id.eq.${id},fighter_b_id.eq.${id}`)
    .in("status", ["completed", "no_contest", "cancelled"])
    .order("start_time", { ascending: false })
    .limit(20);

  // Get user's ring_name for comment avatar
  let currentUserInitial = "?";
  if (authUser) {
    const { data: profile } = await supabase
      .from("users")
      .select("ring_name")
      .eq("id", authUser.id)
      .single();
    currentUserInitial = (profile?.ring_name || authUser.email || "?").charAt(0).toUpperCase();
  }

  const displayName = getLocalizedFighterName(fighter, locale, fighter.name);
  const subLabel = getLocalizedFighterSubLabel(fighter, locale);
  const avatarUrl = getFighterAvatarUrl(fighter);
  const flag = countryCodeToFlag(fighter.nationality);
  const weightClass = fighter.weight_class ? translateWeightClass(fighter.weight_class, locale) : null;

  const { wins, losses, draws } = parseRecord(fighter.record);

  const fightHistory = (fights ?? []).map((f) => {
    const fa = f.fighter_a as Record<string, string | null> | null;
    const fb = f.fighter_b as Record<string, string | null> | null;
    const isA = fa?.id === id;
    const opponent = isA ? fb : fa;
    const won = f.winner_id === id;
    const isNoContest = f.status === "no_contest";
    const isCancelled = f.status === "cancelled";
    const event = f.event as Record<string, string | null> | null;

    return {
      id: f.id,
      opponentName: opponent ? getLocalizedFighterName(opponent as Parameters<typeof getLocalizedFighterName>[0], locale, opponent?.name ?? "") : "?",
      opponentFlag: countryCodeToFlag(opponent?.nationality),
      won,
      isNoContest,
      isCancelled,
      method: f.method,
      round: f.round,
      eventName: event?.name ?? "",
      eventDate: event?.date ?? "",
    };
  });

  // Compute stats from fight history
  const totalFights = fightHistory.length;
  const koWins = fightHistory.filter(f => f.won && f.method && /KO|TKO/i.test(f.method)).length;
  const subWins = fightHistory.filter(f => f.won && f.method && /SUB/i.test(f.method)).length;
  const winStreak = (() => {
    let streak = 0;
    for (const f of fightHistory) {
      if (f.won) streak++;
      else break;
    }
    return streak;
  })();

  return (
    <div className="-mx-4 -mt-4 sm:-mx-6 sm:-mt-6">
      {/* ── Hero Section ── */}
      <div className="relative overflow-hidden bg-[#2a2a2a]">
        {/* Large faded ring name in background */}
        <div className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 select-none text-[120px] font-black leading-none tracking-tighter text-white/[0.03] sm:right-8 sm:text-[180px]">
          {(fighter.ring_name || displayName).charAt(0)}
        </div>

        <div className="relative flex min-h-[320px] sm:min-h-[380px]">
          {/* Image — left, anchored to bottom, large */}
          <div className="relative w-[240px] shrink-0 sm:w-[300px]">
            <FighterAvatar
              src={avatarUrl}
              alt={displayName}
              className="absolute bottom-0 left-0 h-full w-full object-contain object-bottom"
            />
            {/* Gradient fade on right edge */}
            <div className="absolute inset-y-0 right-0 w-16 bg-gradient-to-l from-[#2a2a2a] to-transparent" />
          </div>

          {/* Info — right side */}
          <div className="relative flex flex-1 flex-col justify-end pb-8 pr-5 pt-8 sm:pb-10 sm:pr-8 sm:pt-10">
            {subLabel && (
              <p className="text-sm text-[var(--bp-muted)]">{subLabel}</p>
            )}
            <h1 className="text-5xl font-black tracking-tight text-[var(--bp-ink)] sm:text-6xl">
              {displayName}
            </h1>
            <div className="mt-2 flex items-center gap-3">
              <span className="text-2xl">{flag}</span>
              {weightClass && (
                <span className="rounded-lg bg-[rgba(255,255,255,0.08)] px-3 py-1 text-sm text-[var(--bp-muted)]">{weightClass}</span>
              )}
            </div>

            {/* Record */}
            <div className="mt-5 flex items-center gap-4 text-2xl font-bold sm:text-3xl">
              <span className="text-[#4ade80]">{wins}W</span>
              <span className="text-[#f87171]">{losses}L</span>
              {draws && <span className="text-[var(--bp-muted)]">{draws}D</span>}
            </div>
          </div>
        </div>
      </div>

      {/* ── Stats Bar ── */}
      <div className="grid grid-cols-4 border-b border-[rgba(255,255,255,0.06)] bg-[#1a1a1a]">
        <div className="flex flex-col items-center py-4">
          <span className="text-xl font-bold text-[var(--bp-ink)] sm:text-2xl">{totalFights}</span>
          <span className="mt-0.5 text-[11px] text-[var(--bp-muted)]">Fights</span>
        </div>
        <div className="flex flex-col items-center py-4">
          <span className="text-xl font-bold text-[var(--bp-ink)] sm:text-2xl">{koWins}</span>
          <span className="mt-0.5 text-[11px] text-[var(--bp-muted)]">KO</span>
        </div>
        <div className="flex flex-col items-center py-4">
          <span className="text-xl font-bold text-[var(--bp-ink)] sm:text-2xl">{subWins}</span>
          <span className="mt-0.5 text-[11px] text-[var(--bp-muted)]">SUB</span>
        </div>
        <div className="flex flex-col items-center py-4">
          <span className="text-xl font-bold text-[var(--bp-accent)] sm:text-2xl">{winStreak}</span>
          <span className="mt-0.5 text-[11px] text-[var(--bp-muted)]">Streak</span>
        </div>
      </div>

      {/* ── Content below hero ── */}
      <div className="px-4 pt-6 sm:px-6">
        {/* Fight History */}
        {fightHistory.length > 0 && (
          <div className="mb-6">
            <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-[var(--bp-muted)]">
              {t("fighter.recentFights")}
            </h2>
            <div className={retroPanelClassName({ className: "divide-y divide-[rgba(255,255,255,0.04)] p-0" })}>
              {fightHistory.map((f) => (
                <div
                  key={f.id}
                  className="flex items-center justify-between px-4 py-3"
                >
                  <div className="flex items-center gap-3">
                    <span className={`flex h-7 w-7 items-center justify-center rounded-lg text-xs font-bold ${
                      f.isCancelled || f.isNoContest
                        ? "bg-[rgba(255,255,255,0.06)] text-[var(--bp-muted)]"
                        : f.won
                          ? "bg-[rgba(74,222,128,0.12)] text-[#4ade80]"
                          : "bg-[rgba(248,113,113,0.12)] text-[#f87171]"
                    }`}>
                      {f.isCancelled ? "C" : f.isNoContest ? "NC" : f.won ? "W" : "L"}
                    </span>
                    <div>
                      <span className="text-sm font-medium text-[var(--bp-ink)]">
                        {f.opponentName} {f.opponentFlag}
                      </span>
                      {f.method && (
                        <span className="ml-2 text-xs text-[var(--bp-muted)]">
                          {f.method}{f.round ? ` R${f.round}` : ""}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-xs text-[var(--bp-muted)]">{f.eventName}</span>
                    <p className="text-[11px] text-[var(--bp-muted)] opacity-60">{f.eventDate}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Comments */}
        <FighterComments
          fighterId={id}
          currentUserInitial={currentUserInitial}
        />
      </div>
    </div>
  );
}
