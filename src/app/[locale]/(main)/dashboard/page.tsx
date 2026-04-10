import { Link } from "@/i18n/navigation";
import { createSupabaseServer, getUser } from "@/lib/supabase-server";
import { getTranslations } from "@/lib/i18n-server";
import { getLocalizedEventName } from "@/lib/localized-name";
import SignInCard from "@/components/auth/SignInCard";
import {
  RetroLabel,
  retroSegmentClassName,
} from "@/components/ui/retro";
import nextDynamic from "next/dynamic";
const ScoreTrendChart = nextDynamic(
  () => import("@/components/ScoreTrendChart").then((m) => m.ScoreTrendChart),
);
import { ScoreValue, WLRecord } from "@/components/ui/ranking";
import { Flame, TrendingUp, TrendingDown } from "lucide-react";
import { getWeightClassOrder } from "@/lib/weight-class";
import { getUserBadges } from "@/lib/badge-service";
import { BadgeList } from "@/components/BadgeChip";

export const dynamic = "force-dynamic";

const dCard =
  "rounded-[16px] border border-[rgba(255,255,255,0.06)] bg-[#0a0a0a] p-5 sm:p-6";

function DeltaIndicator({ value }: { value: number | null }) {
  if (value == null) return null;
  const isPositive = value >= 0;
  return (
    <span
      className={`inline-flex items-center gap-0.5 text-xs font-semibold tabular-nums ${
        isPositive ? "text-[var(--bp-success)]" : "text-[var(--bp-danger)]"
      }`}
    >
      {isPositive ? (
        <TrendingUp className="h-3 w-3" />
      ) : (
        <TrendingDown className="h-3 w-3" />
      )}
      {value > 0 ? "+" : ""}
      {value}
    </span>
  );
}

function DonutRing({
  label,
  correct,
  total,
}: {
  label: string;
  correct: number;
  total: number;
}) {
  const pct = total > 0 ? Math.round((correct / total) * 100) : 0;
  const mR = 36;
  const mC = 2 * Math.PI * mR;
  const mOffset = mC - (pct / 100) * mC;
  return (
    <div className="flex flex-col items-center gap-3">
      <div className="relative flex h-24 w-24 items-center justify-center">
        <svg className="-rotate-90" viewBox="0 0 86 86" width="96" height="96">
          <circle
            cx="43"
            cy="43"
            r={mR}
            fill="none"
            stroke="rgba(255,255,255,0.06)"
            strokeWidth="5"
          />
          <circle
            cx="43"
            cy="43"
            r={mR}
            fill="none"
            stroke="var(--bp-accent)"
            strokeWidth="5"
            strokeLinecap="round"
            strokeDasharray={mC}
            strokeDashoffset={mOffset}
            opacity={total > 0 ? 0.85 : 0.15}
          />
        </svg>
        <p className="absolute text-xl font-extrabold tabular-nums text-[var(--bp-ink)]">
          {pct}
          <span className="pct-unit text-[10px] font-semibold text-[var(--bp-muted)]">%</span>
        </p>
      </div>
      <div className="text-center">
        <p className="text-sm font-bold uppercase text-[var(--bp-ink)]">{label}</p>
        <p className="mt-0.5 text-xs tabular-nums text-[var(--bp-muted)]">
          {correct}/{total}
        </p>
      </div>
    </div>
  );
}

/* ──────────────── Time range helpers ──────────────── */

const RANGES = ["all", "7days", "30days", "90days", "1year", "lastEvent"] as const;
type Range = (typeof RANGES)[number];

const RANGE_LABEL_KEYS: Record<Range, string> = {
  all: "myRecord.rangeAll",
  "7days": "myRecord.range7days",
  "30days": "myRecord.range30days",
  "90days": "myRecord.range90days",
  "1year": "myRecord.range1year",
  lastEvent: "myRecord.rangeLastEvent",
};

function rangeToDate(range: Range): Date | null {
  const now = new Date();
  switch (range) {
    case "7days":
      return new Date(now.getTime() - 7 * 86_400_000);
    case "30days":
      return new Date(now.getTime() - 30 * 86_400_000);
    case "90days":
      return new Date(now.getTime() - 90 * 86_400_000);
    case "1year":
      return new Date(now.getTime() - 365 * 86_400_000);
    default:
      return null;
  }
}

function prevRangeDate(range: Range): { from: Date; to: Date } | null {
  const now = new Date();
  switch (range) {
    case "7days":
      return { from: new Date(now.getTime() - 14 * 86_400_000), to: new Date(now.getTime() - 7 * 86_400_000) };
    case "30days":
      return { from: new Date(now.getTime() - 60 * 86_400_000), to: new Date(now.getTime() - 30 * 86_400_000) };
    case "90days":
      return { from: new Date(now.getTime() - 180 * 86_400_000), to: new Date(now.getTime() - 90 * 86_400_000) };
    case "1year":
      return { from: new Date(now.getTime() - 730 * 86_400_000), to: new Date(now.getTime() - 365 * 86_400_000) };
    default:
      return null;
  }
}

/* ──────────────── Page ──────────────── */

type SearchParams = Promise<{ range?: string }>;

export default async function MyRecordDashboardPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const sp = await searchParams;
  const range: Range = RANGES.includes(sp.range as Range) ? (sp.range as Range) : "all";

  const supabase = await createSupabaseServer();
  const authUser = await getUser();
  const { t, locale } = await getTranslations();

  if (!authUser) {
    return (
      <div className="mx-auto max-w-md">
        <SignInCard
          eyebrow={t("myRecord.dashboard")}
          title={t("auth.dashboardGateTitle")}
          description={t("auth.dashboardGateDescription")}
          redirectTo="/dashboard"
        />
      </div>
    );
  }

  /* ── Fetch all data in parallel ── */
  const [{ data: profile }, { data: rankRow }, { data: allPreds }] = await Promise.all([
    supabase
      .from("users")
      .select("ring_name, score, wins, losses, current_streak, best_streak, p4p_score")
      .eq("id", authUser.id)
      .single(),
    supabase
      .from("rankings")
      .select("rank")
      .eq("user_id", authUser.id)
      .eq("type", "event")
      .order("rank", { ascending: true })
      .limit(1)
      .maybeSingle(),
    supabase
      .from("predictions")
      .select(`
        id, winner_id, method, round, score, is_winner_correct, is_method_correct, is_round_correct, created_at, fight_id,
        fight:fights!fight_id(
          id, event_id, status, winner_id, method, round, start_time,
          fighter_a:fighters!fighter_a_id(id, name, ring_name, name_en, name_ko, nationality, image_url, weight_class),
          fighter_b:fighters!fighter_b_id(id, name, ring_name, name_en, name_ko, nationality, image_url, weight_class),
          event:events!event_id(id, name, date, status, series_type)
        )
      `)
      .eq("user_id", authUser.id)
      .order("created_at", { ascending: true }),
  ]);

  const badges = await getUserBadges(supabase, authUser.id);

  const wins = profile?.wins ?? 0;
  const losses = profile?.losses ?? 0;
  const totalScore = profile?.score ?? 0;
  const currentStreak = profile?.current_streak ?? 0;
  const bestStreak = profile?.best_streak ?? 0;
  const ringName = profile?.ring_name ?? authUser.email?.split("@")[0] ?? "User";
  const userRank = rankRow?.rank ?? "-";

  type Pred = {
    id: string;
    winner_id: string;
    method?: string | null;
    round?: number | null;
    score?: number | null;
    is_winner_correct?: boolean | null;
    is_method_correct?: boolean | null;
    is_round_correct?: boolean | null;
    created_at: string;
    fight_id: string;
    fight?: {
      id: string;
      event_id: string;
      status: string;
      winner_id: string | null;
      method: string | null;
      round: number | null;
      start_time?: string | null;
      fighter_a?: {
        id: string; name: string; ring_name?: string | null;
        name_en?: string | null; name_ko?: string | null;
        nationality?: string | null; image_url?: string | null;
        weight_class?: string | null;
      } | null;
      fighter_b?: {
        id: string; name: string; ring_name?: string | null;
        name_en?: string | null; name_ko?: string | null;
        nationality?: string | null; image_url?: string | null;
        weight_class?: string | null;
      } | null;
      event?: {
        id: string; name: string; date: string; status: string; series_type?: string | null;
      } | null;
    } | null;
  };

  const predictions = ((allPreds ?? []) as Pred[]).filter((p) => p.fight);

  /* ── Filter by time range ── */
  let lastEventId: string | null = null;
  if (range === "lastEvent") {
    // Find the most recent event the user has predictions for
    for (let i = predictions.length - 1; i >= 0; i--) {
      if (predictions[i].fight?.event?.id) {
        lastEventId = predictions[i].fight!.event!.id;
        break;
      }
    }
  }

  const cutoff = rangeToDate(range);

  const filteredPreds = predictions.filter((p) => {
    if (range === "all") return true;
    if (range === "lastEvent") return p.fight?.event?.id === lastEventId;
    return cutoff ? new Date(p.created_at) >= cutoff : true;
  });

  /* ── Period-over-period delta ── */
  const prev = prevRangeDate(range);
  const prevPreds = prev
    ? predictions.filter(
        (p) => new Date(p.created_at) >= prev.from && new Date(p.created_at) < prev.to
      )
    : [];

  const periodWins = filteredPreds.filter((p) => p.is_winner_correct === true).length;
  const periodLosses = filteredPreds.filter((p) => p.is_winner_correct === false).length;
  const periodScore = filteredPreds.reduce((s, p) => s + (p.score ?? 0), 0);

  const prevWins = prevPreds.filter((p) => p.is_winner_correct === true).length;
  const prevScore = prevPreds.reduce((s, p) => s + (p.score ?? 0), 0);

  const winDelta = prev ? periodWins - prevWins : null;

  const displayWins = range === "all" ? wins : periodWins;
  const displayLosses = range === "all" ? losses : periodLosses;
  // Score always shows total; delta shows period change
  const displayScore = totalScore;
  const scoreDelta = range === "all" ? null : periodScore;
  const winRate =
    displayWins + displayLosses > 0
      ? Math.round((displayWins / (displayWins + displayLosses)) * 100)
      : 0;

  /* ── Win rate ring SVG values ── */
  const circleR = 42;
  const circleC = 2 * Math.PI * circleR;
  const circleOffset = circleC - (winRate / 100) * circleC;

  /* ── Score trend chart points ── */
  const trendPoints = filteredPreds
    .filter((p) => p.is_winner_correct !== null)
    .reduce<Array<{ date: string; score: number; cumulative: number; isWin: boolean; detail?: string }>>((points, p) => {
      const pts = p.score ?? 0;
      const cumulative = (points.at(-1)?.cumulative ?? 0) + pts;
      const date = p.created_at.slice(0, 10);
      const isWin = p.is_winner_correct === true;

      const details: string[] = [];
      if (p.is_winner_correct) details.push("Winner");
      if (p.is_method_correct) details.push(p.method ?? "Method");
      if (p.is_round_correct) details.push(`R${p.round}`);

      points.push({
        date,
        score: pts,
        cumulative,
        isWin,
        detail: details.length > 0 ? details.join(" + ") : undefined,
      });
      return points;
    }, []);

  const prevRangeLabel = prev ? t("myRecord.vsPrevious").replace("{range}", t(RANGE_LABEL_KEYS[range])) : undefined;

  /* ── Method accuracy ── */
  const methodStats: Record<string, { correct: number; total: number }> = {
    "KO/TKO": { correct: 0, total: 0 },
    Submission: { correct: 0, total: 0 },
    Decision: { correct: 0, total: 0 },
  };
  const roundStats = { correct: 0, total: 0 };

  for (const p of filteredPreds) {
    if (!p.method) continue;
    const key = p.method in methodStats ? p.method : null;
    if (key) {
      methodStats[key].total++;
      if (p.is_method_correct) methodStats[key].correct++;
    }
    if (p.round != null) {
      roundStats.total++;
      if (p.is_round_correct) roundStats.correct++;
    }
  }

  const donutRings = [
    ...Object.entries(methodStats).map(([method, stat]) => ({
      label: method,
      correct: stat.correct,
      total: stat.total,
    })),
    {
      label: "Round",
      correct: roundStats.correct,
      total: roundStats.total,
    },
  ];

  /* ── Weight class breakdown ── */
  const wcMap = new Map<string, { wins: number; losses: number; score: number }>();
  for (const p of filteredPreds) {
    let rawWc = p.fight?.fighter_a?.weight_class ?? p.fight?.fighter_b?.weight_class;
    if (!rawWc) continue;
    // Strip championship suffix (e.g. "라이트급#C" → "라이트급")
    rawWc = rawWc.replace(/#C$/i, "").trim();
    if (!rawWc) continue;
    if (!wcMap.has(rawWc)) wcMap.set(rawWc, { wins: 0, losses: 0, score: 0 });
    const entry = wcMap.get(rawWc)!;
    if (p.is_winner_correct === true) entry.wins++;
    else if (p.is_winner_correct === false) entry.losses++;
    entry.score += p.score ?? 0;
  }
  const weightClasses = [...wcMap.entries()]
    .sort((a, b) => getWeightClassOrder(a[0]) - getWeightClassOrder(b[0]));

  /* ── Event history (right panel) ── */
  const eventMap = new Map<
    string,
    { id: string; name: string; date: string; wins: number; losses: number; score: number; status: string }
  >();
  for (const p of predictions) {
    const ev = p.fight?.event;
    if (!ev) continue;
    if (!eventMap.has(ev.id)) {
      eventMap.set(ev.id, {
        id: ev.id,
        name: getLocalizedEventName(ev as Parameters<typeof getLocalizedEventName>[0], locale, ev.name),
        date: ev.date,
        wins: 0,
        losses: 0,
        score: 0,
        status: ev.status,
      });
    }
    const entry = eventMap.get(ev.id)!;
    if (p.is_winner_correct === true) entry.wins++;
    else if (p.is_winner_correct === false) entry.losses++;
    entry.score += p.score ?? 0;
  }
  const events = [...eventMap.values()].sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
  );

  /* ════════════════════════════════════════ RENDER ════════════════════════════════════════ */

  return (
    <div className="space-y-5">
      {/* Page title */}
      <h1 className="text-[32px] font-bold leading-tight text-[var(--bp-ink)]">
        {t("myRecord.dashboard")}
      </h1>

      {/* Badges */}
      {badges.length > 0 && (
        <BadgeList badges={badges} size="md" />
      )}

      {/* Time range segmented control */}
      <div className="flex flex-wrap gap-2">
        {RANGES.map((r) => (
          <Link
            key={r}
            href={r === "all" ? "/dashboard" : `/dashboard?range=${r}`}
            className={retroSegmentClassName({ active: range === r })}
          >
            {t(RANGE_LABEL_KEYS[r])}
          </Link>
        ))}
      </div>

      {/* 2-col layout */}
      <div className="flex flex-col gap-5 lg:flex-row">
        {/* ─── Left column ─── */}
        <div className="min-w-0 flex-1 space-y-5">
          {/* Hero Card */}
          <div className={dCard}>
            <div className="flex items-center gap-5">
              {/* Win rate ring */}
              <div className="relative flex h-28 w-28 shrink-0 items-center justify-center">
                <svg className="absolute inset-0 -rotate-90" viewBox="0 0 100 100">
                  <circle
                    cx="50"
                    cy="50"
                    r={circleR}
                    fill="none"
                    stroke="rgba(255,255,255,0.06)"
                    strokeWidth="5"
                  />
                  <circle
                    cx="50"
                    cy="50"
                    r={circleR}
                    fill="none"
                    stroke="var(--bp-accent)"
                    strokeWidth="5"
                    strokeLinecap="round"
                    strokeDasharray={circleC}
                    strokeDashoffset={circleOffset}
                  />
                </svg>
                <div className="text-center">
                  <p className="text-2xl font-extrabold tabular-nums text-[var(--bp-ink)]">
                    {winRate}<span className="pct-unit text-xs font-semibold text-[var(--bp-muted)]">%</span>
                  </p>
                  <p className="text-xs uppercase text-[var(--bp-muted)]">
                    {t("common.winRate")}
                  </p>
                </div>
              </div>

              {/* Ring name + W/L */}
              <div className="min-w-0">
                <h2 className="truncate text-xl font-bold text-[var(--bp-ink)]">
                  {ringName}
                </h2>
                <div className="mt-1 flex items-center gap-2 text-base tabular-nums text-[var(--bp-muted)]">
                  <WLRecord wins={displayWins} losses={displayLosses} />
                  {winDelta != null && (
                    <DeltaIndicator value={winDelta} />
                  )}
                </div>
              </div>
            </div>

            {/* 4-col stats grid */}
            <div className="mt-5 grid grid-cols-4 gap-4 border-t border-[rgba(255,255,255,0.06)] pt-4">
              <div className="text-center">
                <ScoreValue value={displayScore} className="text-lg" />
                <p className="mt-0.5 text-xs text-[var(--bp-muted)]">
                  {t("profile.score")}
                </p>
                {scoreDelta !== null && (
                  <p className={`mt-0.5 text-xs font-semibold tabular-nums ${scoreDelta >= 0 ? "text-[#4ade80]" : "text-[#f87171]"}`}>
                    {scoreDelta > 0 ? "+" : ""}{scoreDelta}
                  </p>
                )}
              </div>
              <div className="text-center">
                <p className="text-lg font-extrabold tabular-nums text-[var(--bp-ink)]">
                  #{typeof userRank === "number" ? userRank : "-"}
                </p>
                <p className="mt-0.5 text-xs text-[var(--bp-muted)]">
                  {t("profile.ranking")}
                </p>
              </div>
              <div className="text-center">
                <p className="inline-flex items-center gap-1 text-lg font-extrabold tabular-nums text-[var(--bp-ink)]">
                  {currentStreak > 0 && (
                    <Flame className="h-4 w-4 text-[var(--bp-accent)]" />
                  )}
                  {currentStreak}
                </p>
                <p className="mt-0.5 text-xs text-[var(--bp-muted)]">
                  {t("profile.currentStreak")}
                </p>
              </div>
              <div className="text-center">
                <p className="inline-flex items-center gap-1 text-lg font-extrabold tabular-nums text-[var(--bp-ink)]">
                  {bestStreak > 0 && (
                    <Flame className="h-4 w-4 text-[var(--bp-accent)]" />
                  )}
                  {bestStreak}
                </p>
                <p className="mt-0.5 text-xs text-[var(--bp-muted)]">
                  {t("profile.bestStreak")}
                </p>
              </div>
            </div>
          </div>

          {/* Score Trend Chart */}
          <div className={dCard}>
            {trendPoints.length >= 2 ? (
              <ScoreTrendChart
                points={trendPoints}
                label={t("myRecord.recentTrend")}
                prevScore={prev ? prevScore : null}
                prevRangeLabel={prevRangeLabel}
              />
            ) : (
              <>
                <p className="text-sm font-semibold uppercase tracking-wide text-[var(--bp-muted)]">{t("myRecord.recentTrend")}</p>
                <p className="mt-4 text-center text-sm text-[var(--bp-muted)]">{t("myRecord.noPredictions")}</p>
              </>
            )}
          </div>

          {/* Method Accuracy — 4 donut rings */}
          <div className={dCard}>
            <p className="text-sm font-semibold uppercase tracking-wide text-[var(--bp-muted)]">
              {t("myRecord.methodAccuracy")}
            </p>
            <div className="mt-5 grid grid-cols-2 gap-6 sm:grid-cols-4">
              {donutRings.map((ring) => (
                <DonutRing
                  key={ring.label}
                  label={ring.label}
                  correct={ring.correct}
                  total={ring.total}
                />
              ))}
            </div>
          </div>

          {/* Weight Class Breakdown */}
            <div className={dCard}>
              <div className="flex items-center gap-2">
                <p className="text-sm font-semibold uppercase tracking-wide text-[var(--bp-muted)]">
                  {t("myRecord.weightClassBreakdown")}
                </p>
              </div>
              {weightClasses.length > 0 ? (
                <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
                  {weightClasses.map(([wc, stat]) => {
                    const wcWinRate =
                      stat.wins + stat.losses > 0
                        ? Math.round((stat.wins / (stat.wins + stat.losses)) * 100)
                        : 0;
                    return (
                      <div
                        key={wc}
                        className="flex flex-col rounded-[12px] border border-[rgba(255,255,255,0.04)] bg-[#0d0d0d] p-3"
                      >
                        {/* Top: name + score */}
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <p className="truncate text-sm font-semibold text-[var(--bp-ink)]">
                              {wc}
                            </p>
                            <WLRecord wins={stat.wins} losses={stat.losses} size="xs" className="mt-0.5" />
                          </div>
                          <p
                            className={`text-lg font-bold tabular-nums ${
                              stat.score >= 0 ? "text-[#4ade80]" : "text-[#f87171]"
                            }`}
                          >
                            {stat.score > 0 ? "+" : ""}{stat.score}
                          </p>
                        </div>
                        {/* Bottom: win rate bar */}
                        <div className="mt-2 flex items-center gap-2 border-t border-[rgba(255,255,255,0.04)] pt-2">
                          <div className="flex h-1.5 flex-1 overflow-hidden rounded-full bg-[rgba(255,255,255,0.06)]">
                            <div
                              className="rounded-full bg-[var(--bp-accent)]"
                              style={{ width: `${wcWinRate}%` }}
                            />
                          </div>
                          <p className="shrink-0 text-xs font-semibold tabular-nums text-[var(--bp-muted)]">
                            {wcWinRate}<span className="pct-unit text-[10px]">%</span>
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="mt-4 text-center text-sm text-[var(--bp-muted)]">{t("myRecord.noPredictions")}</p>
              )}
            </div>
        </div>

        {/* ─── Right column: Event History ─── */}
        <div className="w-full lg:w-[320px] lg:shrink-0">
          <div className={dCard}>
            <div className="flex items-center gap-2">
              <p className="text-sm font-semibold uppercase tracking-wide text-[var(--bp-muted)]">
                {t("myRecord.eventHistory")}
              </p>
              <RetroLabel size="sm" tone="neutral">
                {events.length}
              </RetroLabel>
            </div>

            {events.length === 0 ? (
              <p className="mt-4 text-sm text-[var(--bp-muted)]">
                {t("myRecord.noPredictions")}
              </p>
            ) : (
              <div className="mt-4 space-y-2.5">
                {events.map((ev) => {
                  const evWinRate =
                    ev.wins + ev.losses > 0
                      ? Math.round((ev.wins / (ev.wins + ev.losses)) * 100)
                      : 0;
                  return (
                    <Link
                      key={ev.id}
                      href={`/my-record/${ev.id}`}
                      className="block cursor-pointer rounded-[12px] border border-[rgba(255,255,255,0.04)] bg-[#0d0d0d] p-3 transition hover:border-[rgba(255,255,255,0.12)]"
                    >
                      <div className="flex items-center justify-between">
                        <p className="truncate text-sm font-semibold text-[var(--bp-ink)]">
                          {ev.name}
                        </p>
                        <RetroLabel
                          size="xs"
                          tone={
                            ev.status === "completed"
                              ? "success"
                              : ev.status === "live"
                                ? "danger"
                                : "info"
                          }
                        >
                          {t(`event.${ev.status}`)}
                        </RetroLabel>
                      </div>
                      <p className="mt-1 text-xs text-[var(--bp-muted)]">{ev.date}</p>
                      <div className="mt-2 flex items-center justify-between">
                        <p className="flex items-center gap-1.5 text-xs tabular-nums text-[var(--bp-muted)]">
                          <WLRecord wins={ev.wins} losses={ev.losses} size="xs" />
                          <span className="opacity-60">({evWinRate}%)</span>
                        </p>
                        <p
                          className={`text-sm font-bold tabular-nums ${
                            ev.score >= 0
                              ? "text-[var(--bp-success)]"
                              : "text-[var(--bp-danger)]"
                          }`}
                        >
                          {ev.score > 0 ? "+" : ""}
                          {ev.score}
                        </p>
                      </div>
                    </Link>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
