import { Link } from "@/i18n/navigation";
import { createSupabaseServer, getUser } from "@/lib/supabase-server";
import { getTranslations } from "@/lib/i18n-server";
import { getLocalizedEventName, getLocalizedFighterName } from "@/lib/localized-name";
import { countryCodeToFlag } from "@/lib/flags";
import { getFighterAvatarUrl } from "@/lib/fighter-avatar";
import FighterAvatar from "@/components/FighterAvatar";
import { Check, X } from "lucide-react";
import {
  RetroEmptyState,
  RetroLabel,
  RetroStatusBadge,
  retroButtonClassName,
} from "@/components/ui/retro";

export const dynamic = "force-dynamic";

const dCard = "rounded-[16px] border border-[rgba(255,255,255,0.06)] bg-[#0a0a0a] p-5 sm:p-6";

type Params = Promise<{ eventId: string }>;

export default async function MyRecordEventPage({ params }: { params: Params }) {
  const { eventId } = await params;
  const supabase = await createSupabaseServer();
  const authUser = await getUser();
  const { t, locale } = await getTranslations();

  if (!authUser) {
    return (
      <RetroEmptyState
        title={t("profile.signInToView")}
        action={<Link href="/login" className={retroButtonClassName({ variant: "primary" })}>{t("nav.login")}</Link>}
      />
    );
  }

  const [{ data: event }, { data: preds }, { data: eventFights }] = await Promise.all([
    supabase.from("events").select("id, name, date, status, series_type").eq("id", eventId).single(),
    supabase
      .from("predictions")
      .select(`
        id, winner_id, method, round, score, is_winner_correct, is_method_correct, is_round_correct, created_at, fight_id,
        fight:fights!fight_id(
          id, status, winner_id, method, round, start_time,
          fighter_a:fighters!fighter_a_id(id, name, ring_name, name_en, name_ko, nationality, image_url),
          fighter_b:fighters!fighter_b_id(id, name, ring_name, name_en, name_ko, nationality, image_url)
        )
      `)
      .eq("user_id", authUser.id)
      .order("created_at", { ascending: false }),
    supabase
      .from("fights")
      .select(`
        id, status, winner_id, method, round, start_time,
        fighter_a:fighters!fighter_a_id(id, name, ring_name, name_en, name_ko, nationality, image_url),
        fighter_b:fighters!fighter_b_id(id, name, ring_name, name_en, name_ko, nationality, image_url)
      `)
      .eq("event_id", eventId)
      .order("start_time", { ascending: false }),
  ]);

  if (!event) {
    return <RetroEmptyState title={t("event.notFound")} />;
  }

  type Pred = {
    id: string; winner_id: string; method?: string | null; round?: number | null;
    score?: number | null; is_winner_correct?: boolean | null; is_method_correct?: boolean | null;
    is_round_correct?: boolean | null; fight_id: string;
    fight?: {
      id: string; status: string; winner_id: string | null; method: string | null; round: number | null;
      fighter_a?: { id: string; name: string; ring_name?: string | null; name_en?: string | null; name_ko?: string | null; nationality?: string | null; image_url?: string | null } | null;
      fighter_b?: { id: string; name: string; ring_name?: string | null; name_en?: string | null; name_ko?: string | null; nationality?: string | null; image_url?: string | null } | null;
    } | null;
  };

  const allPreds = ((preds ?? []) as Pred[]).filter((p) => p.fight);
  const eventFightIds = new Set((eventFights ?? []).map((f: { id: string }) => f.id));
  const myPreds = allPreds.filter((p) => eventFightIds.has(p.fight_id));
  const predictedIds = new Set(myPreds.map((p) => p.fight_id));

  type FightRow = {
    id: string; status: string; winner_id: string | null; method: string | null; round: number | null;
    fighter_a?: { id: string; name: string; ring_name?: string | null; name_en?: string | null; name_ko?: string | null; nationality?: string | null; image_url?: string | null } | null;
    fighter_b?: { id: string; name: string; ring_name?: string | null; name_en?: string | null; name_ko?: string | null; nationality?: string | null; image_url?: string | null } | null;
  };

  const skipped = ((eventFights ?? []) as FightRow[]).filter((f) => !predictedIds.has(f.id));

  const eventWins = myPreds.filter((p) => p.is_winner_correct === true).length;
  const eventLosses = myPreds.filter((p) => p.is_winner_correct === false).length;
  const eventScore = myPreds.reduce((sum, p) => sum + (p.score ?? 0), 0);
  const eventWinRate = eventWins + eventLosses > 0 ? Math.round((eventWins / (eventWins + eventLosses)) * 100) : 0;
  const eventName = getLocalizedEventName(event, locale, event.name);

  // Method accuracy for this event
  const methodStats = { "KO/TKO": { correct: 0, total: 0 }, Submission: { correct: 0, total: 0 }, Decision: { correct: 0, total: 0 } };
  for (const p of myPreds) {
    if (p.method && p.method in methodStats) {
      const key = p.method as keyof typeof methodStats;
      methodStats[key].total++;
      if (p.is_winner_correct) methodStats[key].correct++;
    }
  }

  // Win rate ring
  const circleR = 42;
  const circleC = 2 * Math.PI * circleR;
  const circleOffset = circleC - (eventWinRate / 100) * circleC;

  return (
    <div className="space-y-5">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-1.5 text-sm text-[var(--bp-muted)]">
        <Link href="/my-record" className="transition hover:text-[var(--bp-ink)]">{t("nav.myRecord")}</Link>
        <svg viewBox="0 0 16 16" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M6 4l4 4-4 4" /></svg>
        <span className="truncate font-medium text-[var(--bp-ink)]">{eventName}</span>
      </nav>

      {/* 2-col layout */}
      <div className="flex flex-col gap-5 lg:flex-row">

        {/* Left: Stats + Predictions */}
        <div className="min-w-0 flex-1 space-y-5">

          {/* Event Hero — reuses analytics pattern */}
          <div className={dCard}>
            <div className="flex items-center gap-5">
              <div className="relative flex h-28 w-28 shrink-0 items-center justify-center">
                <svg className="absolute inset-0 -rotate-90" viewBox="0 0 100 100">
                  <circle cx="50" cy="50" r={circleR} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="5" />
                  <circle cx="50" cy="50" r={circleR} fill="none" stroke="var(--bp-accent)" strokeWidth="5" strokeLinecap="round" strokeDasharray={circleC} strokeDashoffset={circleOffset} />
                </svg>
                <div className="text-center">
                  <p className="text-2xl font-extrabold tabular-nums text-[var(--bp-ink)]">{eventWinRate}<span className="pct-unit text-xs font-semibold text-[var(--bp-muted)]">%</span></p>
                  <p className="text-xs uppercase text-[var(--bp-muted)]">{t("common.winRate")}</p>
                </div>
              </div>
              <div className="min-w-0">
                <p className="text-xs font-semibold uppercase tracking-wider text-[var(--bp-accent)]">{event.date}</p>
                <h1 className="mt-1 truncate text-xl font-bold text-[var(--bp-ink)]">{eventName}</h1>
                <p className="mt-1 text-base tabular-nums text-[var(--bp-muted)]">{eventWins}W {eventLosses}L</p>
              </div>
            </div>

            {/* Stats row — same pattern as main analytics */}
            <div className="mt-5 grid grid-cols-4 gap-4 border-t border-[rgba(255,255,255,0.06)] pt-4">
              <div className="text-center">
                <p className="text-xl font-extrabold tabular-nums text-[var(--bp-success)]">{eventWins}</p>
                <p className="mt-0.5 text-xs text-[var(--bp-muted)]">WIN</p>
              </div>
              <div className="text-center">
                <p className="text-xl font-extrabold tabular-nums text-[var(--bp-danger)]">{eventLosses}</p>
                <p className="mt-0.5 text-xs text-[var(--bp-muted)]">LOSS</p>
              </div>
              <div className="text-center">
                <p className={`text-xl font-extrabold tabular-nums ${eventScore >= 0 ? "text-[var(--bp-accent)]" : "text-[var(--bp-danger)]"}`}>
                  {eventScore > 0 ? "+" : ""}{eventScore}
                </p>
                <p className="mt-0.5 text-xs text-[var(--bp-muted)]">PTS</p>
              </div>
              <div className="text-center">
                <p className="text-xl font-extrabold tabular-nums text-[var(--bp-ink)]">{myPreds.length}</p>
                <p className="mt-0.5 text-xs text-[var(--bp-muted)]">{t("event.fights")}</p>
              </div>
            </div>
          </div>

          {/* Method Accuracy — reused donut ring pattern */}
          <div className={dCard}>
            <p className="text-sm font-semibold uppercase tracking-wide text-[var(--bp-muted)]">{t("myRecord.methodAccuracy")}</p>
            <div className="mt-5 grid grid-cols-3 gap-6">
              {(Object.entries(methodStats) as [string, { correct: number; total: number }][]).map(([method, stat]) => {
                const pct = stat.total > 0 ? Math.round((stat.correct / stat.total) * 100) : 0;
                const mR = 36;
                const mC = 2 * Math.PI * mR;
                const mOffset = mC - (pct / 100) * mC;
                return (
                  <div key={method} className="flex flex-col items-center gap-3">
                    <div className="relative flex h-24 w-24 items-center justify-center">
                      <svg className="-rotate-90" viewBox="0 0 86 86" width="96" height="96">
                        <circle cx="43" cy="43" r={mR} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="5" />
                        <circle cx="43" cy="43" r={mR} fill="none" stroke="var(--bp-accent)" strokeWidth="5" strokeLinecap="round"
                          strokeDasharray={mC} strokeDashoffset={mOffset} opacity={stat.total > 0 ? 0.85 : 0.15} />
                      </svg>
                      <p className="absolute text-xl font-extrabold tabular-nums text-[var(--bp-ink)]">{pct}<span className="pct-unit text-[10px] font-semibold text-[var(--bp-muted)]">%</span></p>
                    </div>
                    <div className="text-center">
                      <p className="text-sm font-bold uppercase text-[var(--bp-ink)]">{method}</p>
                      <p className="mt-0.5 text-xs tabular-nums text-[var(--bp-muted)]">{stat.correct}/{stat.total}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Prediction Cards */}
          <div className={dCard}>
            <p className="text-sm font-semibold uppercase tracking-wide text-[var(--bp-muted)]">{t("profile.recentPredictions")}</p>
            <div className="mt-4 space-y-3">
              {myPreds.map((prediction) => {
                const fight = prediction.fight;
                if (!fight) return null;
                const fighterALabel = getLocalizedFighterName(fight.fighter_a, locale, fight.fighter_a?.name);
                const fighterBLabel = getLocalizedFighterName(fight.fighter_b, locale, fight.fighter_b?.name);
                const isAWinner = fight.winner_id === fight.fighter_a?.id;
                const winnerLabel = isAWinner ? fighterALabel : fighterBLabel;
                const loserLabel = isAWinner ? fighterBLabel : fighterALabel;
                const winnerFlag = countryCodeToFlag(isAWinner ? fight.fighter_a?.nationality : fight.fighter_b?.nationality);
                const loserFlag = countryCodeToFlag(isAWinner ? fight.fighter_b?.nationality : fight.fighter_a?.nationality);
                const winnerFighter = isAWinner ? fight.fighter_a : fight.fighter_b;
                const avatarUrl = getFighterAvatarUrl(winnerFighter);

                // Build detail line
                const details: { text: string; ok: boolean }[] = [];
                if (prediction.is_winner_correct !== null) {
                  if (prediction.is_winner_correct) {
                    details.push({ text: "승자 맞춤", ok: true });
                  } else {
                    const pickedLabel = prediction.winner_id === fight.fighter_a?.id ? fighterALabel : fighterBLabel;
                    details.push({ text: "승자 틀림", ok: false });
                  }
                }
                if (prediction.is_method_correct === true) {
                  details.push({ text: "방법 맞춤", ok: true });
                } else if (prediction.is_method_correct === false) {
                  details.push({ text: "방법 틀림", ok: false });
                }
                if (prediction.is_round_correct === true) {
                  details.push({ text: "라운드 맞춤", ok: true });
                } else if (prediction.is_round_correct === false) {
                  details.push({ text: "라운드 틀림", ok: false });
                }

                return (
                  <div
                    key={prediction.id}
                    className="flex items-center gap-4 rounded-[12px] border border-[rgba(255,255,255,0.04)] bg-[#0d0d0d] p-4"
                  >
                    {/* Avatar */}
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-full border border-[rgba(255,255,255,0.08)] bg-[#111]">
                      {avatarUrl ? (
                        <FighterAvatar src={avatarUrl} alt={winnerLabel} className="h-full w-full object-cover" />
                      ) : (
                        <span className="text-base font-bold text-[var(--bp-muted)]">{(winnerFighter?.name ?? "?").charAt(0)}</span>
                      )}
                    </div>

                    {/* Info */}
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-[var(--bp-ink)]">
                        {winnerLabel} {winnerFlag} <span className="text-[var(--bp-muted)]">vs</span> <span className="opacity-40">{loserLabel} {loserFlag}</span>
                      </p>
                      <p className="mt-0.5 text-xs text-[var(--bp-muted)]">
                        {fight.method}{fight.round ? ` · R${fight.round}` : ""}
                      </p>
                      {details.length > 0 && (
                        <div className="mt-1 flex flex-wrap items-center gap-x-1.5 text-xs">
                          {details.map((d, i) => (
                            <span key={i} className="inline-flex items-center gap-0.5">
                              {i > 0 && <span className="mr-1 text-[var(--bp-muted)]">·</span>}
                              {d.ok
                                ? <Check className="h-3 w-3 text-[#4ade80]" strokeWidth={2.5} />
                                : <X className="h-3 w-3 text-[#f87171]" strokeWidth={2.5} />}
                              <span className="text-[var(--bp-muted)]">{d.text}</span>
                            </span>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Score */}
                    <div className="shrink-0">
                      {prediction.is_winner_correct === null ? (
                        <p className="text-xs text-[var(--bp-muted)]">{t("common.pending")}</p>
                      ) : (
                        <p className={`text-lg font-bold tabular-nums ${prediction.is_winner_correct ? "text-[#4ade80]" : "text-[#f87171]"}`}>
                          {prediction.is_winner_correct && typeof prediction.score === "number" ? `+${prediction.score}` : prediction.score}
                        </p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Right: Skipped fights panel */}
        {skipped.length > 0 && (
          <div className="w-full lg:w-[320px] lg:shrink-0">
            <div className={dCard}>
              <div className="flex items-center gap-2">
                <p className="text-sm font-semibold uppercase tracking-wide text-[var(--bp-muted)]">{t("myRecord.skippedFights")}</p>
                <RetroLabel size="sm" tone="neutral">{skipped.length}</RetroLabel>
              </div>
              <div className="mt-4 space-y-2.5">
                {skipped.map((fight) => {
                  const aLabel = getLocalizedFighterName(fight.fighter_a, locale, fight.fighter_a?.name);
                  const bLabel = getLocalizedFighterName(fight.fighter_b, locale, fight.fighter_b?.name);
                  const winnerLabel = fight.winner_id
                    ? fight.winner_id === fight.fighter_a?.id ? aLabel : bLabel
                    : null;
                  return (
                    <div key={fight.id} className="rounded-[12px] border border-[rgba(255,255,255,0.04)] bg-[#0d0d0d] p-3 opacity-50">
                      <p className="text-sm font-semibold text-[var(--bp-ink)]">{aLabel} vs {bLabel}</p>
                      {winnerLabel && (
                        <p className="mt-1 text-xs text-[var(--bp-muted)]">
                          {winnerLabel} {t("event.won")}{fight.method ? ` \u00B7 ${fight.method}` : ""}
                        </p>
                      )}
                      <div className="mt-1.5">
                        <RetroLabel size="sm" tone="neutral">{t("myRecord.skipped")}</RetroLabel>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
