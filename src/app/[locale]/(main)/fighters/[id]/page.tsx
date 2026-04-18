import { createSupabaseServer, getUser } from "@/lib/supabase-server";
import { getTranslations } from "@/lib/i18n-server";
import { Link } from "@/i18n/navigation";
import { getLocalizedFighterName, getLocalizedFighterSubLabel } from "@/lib/localized-name";
import { getFighterAvatarUrl } from "@/lib/fighter-avatar";
import { countryCodeToFlag } from "@/lib/flags";
import { translateWeightClass } from "@/lib/weight-class";
import { RetroEmptyState, retroPanelClassName } from "@/components/ui/retro";
import FighterComments from "@/components/FighterComments";
import FighterAvatar from "@/components/FighterAvatar";
import ShareMenu from "@/components/ShareMenu";
import { parseRecord } from "@/lib/parse-record";
import { resolveDivisionChip } from "@/lib/division-chip";
import { Crown, Flame } from "lucide-react";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{ id: string }>;
};

export default async function FighterDetailPage({ params }: PageProps) {
  const { id } = await params;
  const supabase = await createSupabaseServer();
  const authUser = await getUser();
  const { t, locale } = await getTranslations();

  // Wildcard select matches the pattern used by home / event / fight-
  // detail pages (e.g. `src/app/[locale]/(main)/page.tsx:172`) and
  // keeps the query resilient when new fighter columns land before
  // Supabase codegen is rerun. `is_champion` / `rank_position` from
  // migration 202604190001 are consumed via `resolveDivisionChip`
  // below — wildcard ensures they're returned even while generated
  // types are stale.
  const { data: fighter } = await supabase
    .from("fighters")
    .select("*")
    .eq("id", id)
    .single<{
      id: string;
      name: string;
      ring_name: string | null;
      name_en: string | null;
      name_ko: string | null;
      record: string | null;
      nationality: string | null;
      weight_class: string | null;
      image_url: string | null;
      is_champion: boolean | null;
      rank_position: number | null;
    }>();

  if (!fighter) {
    return <RetroEmptyState title="Fighter not found" />;
  }

  const { data: fights } = await supabase
    .from("fights")
    .select(`
      id, status, winner_id, method, round, start_time, is_title_fight, is_main_card,
      fighter_a:fighters!fighter_a_id(id, name, ring_name, name_en, name_ko, nationality),
      fighter_b:fighters!fighter_b_id(id, name, ring_name, name_en, name_ko, nationality),
      event:events!event_id(id, name, date)
    `)
    .or(`fighter_a_id.eq.${id},fighter_b_id.eq.${id}`)
    .in("status", ["completed", "no_contest", "cancelled"])
    .order("start_time", { ascending: false })
    .limit(20);

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
  const ringName = fighter.ring_name || displayName;
  const subLabel = getLocalizedFighterSubLabel(fighter, locale);
  const avatarUrl = getFighterAvatarUrl(fighter);
  const flag = countryCodeToFlag(fighter.nationality);
  const weightClass = fighter.weight_class ? translateWeightClass(fighter.weight_class, locale) : null;
  const { wins, losses, draws } = parseRecord(fighter.record);

  // Detail page has no event context — DB rank is the sole source. The
  // resolver's fallback path handles champion / ranked / unranked states
  // per the same logic used on fight cards (`src/lib/division-chip.ts`).
  const divisionChip = resolveDivisionChip(null, fighter, locale, t("division.champion"));

  const fightHistory = (fights ?? []).map((f) => {
    const fa = f.fighter_a as Record<string, string | null> | null;
    const fb = f.fighter_b as Record<string, string | null> | null;
    const isA = fa?.id === id;
    const opponent = isA ? fb : fa;
    const won = f.winner_id === id;
    const isDraw = f.status === "completed" && !f.winner_id;
    const isNoContest = f.status === "no_contest";
    const isCancelled = f.status === "cancelled";
    const event = f.event as Record<string, string | null> | null;

    return {
      id: f.id,
      opponentId: opponent?.id ?? null,
      opponentName: opponent ? getLocalizedFighterName(opponent as Parameters<typeof getLocalizedFighterName>[0], locale, opponent?.name ?? "") : "?",
      opponentFlag: countryCodeToFlag(opponent?.nationality),
      opponentAvatarUrl: opponent ? getFighterAvatarUrl(opponent as Parameters<typeof getFighterAvatarUrl>[0]) : null,
      won,
      isDraw,
      isNoContest,
      isCancelled,
      method: f.method,
      round: f.round,
      eventName: event?.name ?? "",
      eventDate: event?.date ?? "",
      isTitleFight: Boolean((f as { is_title_fight?: boolean }).is_title_fight),
      isMainCard: Boolean((f as { is_main_card?: boolean }).is_main_card),
    };
  });

  // Derived stats
  const totalFights = fightHistory.length;
  const winsCount = fightHistory.filter(f => f.won).length;
  const koWins = fightHistory.filter(f => f.won && f.method && /KO|TKO/i.test(f.method)).length;
  const subWins = fightHistory.filter(f => f.won && f.method && /SUB/i.test(f.method)).length;
  const winRate = totalFights > 0 ? Math.round((winsCount / totalFights) * 100) : 0;
  const currentStreak = (() => {
    let streak = 0;
    for (const f of fightHistory) {
      if (f.won) streak++;
      else break;
    }
    return streak;
  })();

  return (
    <div className="-mx-4 -mt-4 sm:-mx-6 sm:-mt-6">
      {/* ═══════════ HERO ═══════════ */}
      <section className="relative overflow-hidden bg-[#2a2a2a]">
        {/* Background watermark */}
        <span
          aria-hidden
          className="pointer-events-none absolute -right-4 top-1/2 -translate-y-1/2 select-none text-[200px] font-black leading-none tracking-tighter text-white/[0.03] sm:text-[280px]"
        >
          {ringName.slice(0, 2)}
        </span>

        {/* Share button — top-right inside hero. Direct share of this
            fighter page URL, with a localized "Check out {name}"
            sub-title for share intents. */}
        <div className="absolute right-3 top-3 z-10 sm:right-5 sm:top-5">
          <ShareMenu
            url={`/fighters/${id}`}
            title={displayName}
            text={t("fighter.shareText", { name: displayName })}
            triggerLabel={t("share.trigger")}
            triggerVariant="soft"
            triggerSize="sm"
          />
        </div>

        <div className="relative grid min-h-[340px] grid-cols-[auto_1fr] sm:min-h-[400px]">
          {/* Image — left, bottom-anchored, original proportions */}
          <div className="relative w-[200px] sm:w-[280px] md:w-[320px]">
            <FighterAvatar
              src={avatarUrl}
              alt={displayName}
              className="absolute bottom-0 left-0 h-full w-full object-contain object-bottom"
            />
            {/* Right edge fade */}
            <div className="absolute inset-y-0 right-0 w-20 bg-gradient-to-l from-[#2a2a2a] to-transparent" />
          </div>

          {/* Info — right */}
          <div className="flex flex-col justify-end pb-8 pr-5 sm:pb-10 sm:pr-8">
            {/* Sub label (real name) */}
            {subLabel && (
              <p className="mb-1 text-sm tracking-wide text-[var(--bp-muted)]">{subLabel}</p>
            )}

            {/* Ring name — hero title */}
            <h1 className="text-5xl font-black tracking-tighter text-[var(--bp-ink)] sm:text-6xl md:text-7xl">
              {ringName}
            </h1>

            {/* Meta row */}
            <div className="mt-3 flex flex-wrap items-center gap-3">
              <span className="text-xl">{flag}</span>
              {weightClass && (
                <span className="rounded-xl bg-white/[0.06] px-3 py-1 text-xs font-semibold uppercase tracking-[0.06em] text-[var(--bp-muted)]">
                  {weightClass}
                </span>
              )}
              {divisionChip && (
                <span
                  // Weight class is already shown in the adjacent chip,
                  // so the hero badge shows only the rank/champion
                  // accent to avoid duplication. aria-label still names
                  // the full context for screen readers.
                  aria-label={[divisionChip.weightLabel, divisionChip.rankLabel]
                    .filter(Boolean)
                    .join(" ")}
                  className="rounded-xl border border-[var(--bp-line)] bg-white/[0.06] px-3 py-1 text-xs font-semibold text-[var(--bp-accent)]"
                >
                  {divisionChip.rankLabel}
                </span>
              )}
            </div>

            {/* Record — large */}
            <div className="mt-5 flex items-baseline gap-4">
              <span className="text-3xl font-black text-[#4ade80] sm:text-4xl">{wins}W</span>
              <span className="text-3xl font-black text-[#f87171] sm:text-4xl">{losses}L</span>
              {draws && (
                <span className="text-3xl font-black text-[var(--bp-muted)] sm:text-4xl">{draws}D</span>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* ═══════════ STAT TILES ═══════════ */}
      <section className="grid grid-cols-4 divide-x divide-[rgba(255,255,255,0.06)] border-b border-[rgba(255,255,255,0.06)] bg-[var(--bp-card)]">
        {[
          { value: totalFights, label: t("fighter.statFights"), hasFlame: false },
          { value: koWins, label: "KO", hasFlame: false },
          { value: subWins, label: "SUB", hasFlame: false },
          {
            value: currentStreak > 0 ? currentStreak : `${winRate}%`,
            label: currentStreak > 0 ? t("fighter.statStreak") : t("fighter.statWinRate"),
            hasFlame: currentStreak > 0,
          },
        ].map((stat) => (
          <div key={stat.label} className="flex flex-col items-center gap-1 py-5">
            <div className="flex items-center gap-1.5">
              {stat.hasFlame && <Flame className="h-5 w-5 text-[var(--bp-accent)]" strokeWidth={2} />}
              <span className="text-xl font-bold text-[var(--bp-ink)] sm:text-2xl">{stat.value}</span>
            </div>
            <span className="text-xs text-[var(--bp-muted)]">{stat.label}</span>
          </div>
        ))}
      </section>

      {/* ═══════════ CONTENT ═══════════ */}
      <div className="space-y-6 px-4 pb-8 pt-6 sm:px-6">
        {/* Fight History */}
        {fightHistory.length > 0 && (
          <section>
            <h2 className="mb-3 text-xs font-semibold uppercase tracking-widest text-[var(--bp-muted)]">
              {t("fighter.recentFights")}
            </h2>
            <div className={retroPanelClassName({ className: "divide-y divide-[rgba(255,255,255,0.04)] p-0" })}>
              {fightHistory.map((f) => {
                const resultLabel = f.isCancelled ? "C" : f.isNoContest ? "NC" : f.isDraw ? "D" : f.won ? "W" : "L";
                const resultColor = f.isCancelled || f.isNoContest
                  ? "bg-white/[0.04] text-[var(--bp-muted)]"
                  : f.isDraw
                    ? "bg-white/[0.06] text-[var(--bp-muted)]"
                    : f.won
                      ? "bg-[#4ade80]/10 text-[#4ade80]"
                      : "bg-[#f87171]/10 text-[#f87171]";

                const rowInner = (
                  <>
                    {/* Result badge */}
                    <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-xs font-bold ${resultColor}`}>
                      {resultLabel}
                    </span>

                    {/* Opponent avatar */}
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-full border border-[rgba(255,255,255,0.08)] bg-[#2a2a2a]">
                      {f.opponentAvatarUrl ? (
                        <FighterAvatar
                          src={f.opponentAvatarUrl}
                          alt={f.opponentName}
                          className="h-full w-full object-cover object-top"
                        />
                      ) : (
                        <span className="text-xs font-bold text-[var(--bp-muted)]">{f.opponentName.charAt(0)}</span>
                      )}
                    </div>

                    {/* Opponent info */}
                    <div className="min-w-0 flex-1">
                      <p className="flex items-center gap-1.5 text-sm font-medium text-[var(--bp-ink)] transition-colors group-hover:text-[var(--bp-accent)]">
                        {f.isTitleFight ? (
                          <Crown
                            className="h-3.5 w-3.5 shrink-0 text-[var(--bp-accent)]"
                            strokeWidth={2}
                            aria-label={t("event.titleFight")}
                          />
                        ) : null}
                        <span className="truncate">{f.opponentName} {f.opponentFlag}</span>
                      </p>
                      {f.method && (
                        <p className="text-xs text-[var(--bp-muted)]">
                          {f.method}{f.round ? ` R${f.round}` : ""}
                        </p>
                      )}
                    </div>

                    {/* Event + date */}
                    <div className="shrink-0 text-right">
                      <p className="truncate text-xs text-[var(--bp-muted)]">{f.eventName}</p>
                      <p className="text-[11px] text-[var(--bp-muted)] opacity-50">{f.eventDate}</p>
                    </div>
                  </>
                );

                // Link the whole row to the opponent's detail page when we
                // have an opponent id. Fallback to a plain div if the
                // opponent record is missing (e.g. deleted fighter). Uses
                // the `group` pattern so only the opponent name turns
                // accent-gold on hover — we intentionally avoid any
                // background / border change on the row because that
                // would fight the parent retro panel's outline.
                //
                // Title-fight rows get a subtle gold background tint so
                // championship bouts visually stand out in the career
                // retrospective. Uses the same `--bp-accent-dim` token
                // the retro accent chip already uses, so the tint stays
                // inside the design-system palette.
                const rowBgClass = f.isTitleFight ? "bg-[var(--bp-accent-dim)]" : "";
                return f.opponentId ? (
                  <Link
                    key={f.id}
                    href={`/fighters/${f.opponentId}`}
                    className={`group flex cursor-pointer items-center gap-3 px-4 py-3 ${rowBgClass}`}
                  >
                    {rowInner}
                  </Link>
                ) : (
                  <div key={f.id} className={`flex items-center gap-3 px-4 py-3 ${rowBgClass}`}>
                    {rowInner}
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* Empty state when no fights */}
        {fightHistory.length === 0 && (
          <div className="flex flex-col items-center gap-2 py-12 text-center">
            <Flame className="h-8 w-8 text-[var(--bp-muted)] opacity-40" strokeWidth={1.5} />
            <p className="text-sm text-[var(--bp-muted)]">No fight history yet</p>
          </div>
        )}

        {/* Comments */}
        <section>
          <FighterComments
            fighterId={id}
            currentUserInitial={currentUserInitial}
          />
        </section>
      </div>
    </div>
  );
}
