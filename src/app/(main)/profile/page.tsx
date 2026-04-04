import Link from "next/link";
import { createSupabaseServer, getUser } from "@/lib/supabase-server";
import { getTranslations } from "@/lib/i18n-server";
import { getLocalizedEventName, getLocalizedFighterName } from "@/lib/localized-name";
import {
  RetroEmptyState,
  RetroStatTile,
  RetroStatusBadge,
  retroButtonClassName,
  retroInsetClassName,
  retroPanelClassName,
} from "@/components/ui/retro";

export const dynamic = "force-dynamic";

type RecentPrediction = {
  id: string;
  winner_id: string;
  method?: string | null;
  round?: number | null;
  score?: number | null;
  is_winner_correct?: boolean | null;
  fight?: {
    id: string;
    fighter_a?: {
      id: string;
      name: string;
      ring_name?: string | null;
      name_en?: string | null;
      name_ko?: string | null;
    } | null;
    fighter_b?: {
      id: string;
      name: string;
      ring_name?: string | null;
      name_en?: string | null;
      name_ko?: string | null;
    } | null;
    event?: {
      id: string;
      name: string;
      date: string;
    } | null;
  } | null;
};

export default async function ProfilePage() {
  const supabase = await createSupabaseServer();
  const authUser = await getUser();
  const { t, locale } = await getTranslations();

  if (!authUser) {
    return (
      <RetroEmptyState
        title={t("profile.myAccount")}
        description={t("profile.signInToView")}
        action={
          <div className="flex gap-2">
            <Link href="/login" className={retroButtonClassName({ variant: "ghost" })}>
              {t("nav.login")}
            </Link>
            <Link href="/signup" className={retroButtonClassName({ variant: "primary" })}>
              {t("nav.signup")}
            </Link>
          </div>
        }
      />
    );
  }

  const { data: user } = await supabase.from("users").select("*").eq("id", authUser.id).single();
  const { count: higherCount } = await supabase.from("users").select("*", { count: "exact", head: true }).gt("score", user?.score ?? 0);
  const { count: totalUsers } = await supabase.from("users").select("*", { count: "exact", head: true });
  const rank = (higherCount ?? 0) + 1;

  const { data: recentPreds } = await supabase
    .from("predictions")
    .select(`
      id, winner_id, method, round, score, is_winner_correct, created_at,
      fight:fights!fight_id(
        id, status, winner_id, method, round,
        fighter_a:fighters!fighter_a_id(id, name, ring_name, name_en, name_ko),
        fighter_b:fighters!fighter_b_id(id, name, ring_name, name_en, name_ko),
        event:events!event_id(id, name, date)
      )
    `)
    .eq("user_id", authUser.id)
    .order("created_at", { ascending: false })
    .limit(10);

  const wins = user?.wins ?? 0;
  const losses = user?.losses ?? 0;
  const total = wins + losses;
  const winRate = total > 0 ? Math.round((wins / total) * 100) : 0;

  return (
    <div className="space-y-4">
      {/* Profile Header */}
      <div className={retroPanelClassName({ className: "p-4 sm:p-5" })}>
        <div className="flex items-start justify-between gap-3">
          <div>
            <h1 className="text-xl font-bold text-[var(--bp-ink)]">{user?.ring_name ?? t("ranking.unknown")}</h1>
            <p className="mt-0.5 text-sm text-[var(--bp-muted)]">{authUser.email}</p>
          </div>
          <Link href="/events" className={retroButtonClassName({ variant: "primary", size: "sm" })}>
            {t("event.makeYourPick")}
          </Link>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
          <RetroStatTile
            label={t("profile.fightRecord")}
            value={`${wins}W-${losses}L`}
            meta={`${winRate}%`}
          />
          <RetroStatTile
            label={t("profile.score")}
            value={user?.score ?? 0}
            tone="accent"
          />
          <RetroStatTile
            label={t("profile.ranking")}
            value={`#${rank}`}
            meta={`/ ${totalUsers ?? 0}`}
          />
          <RetroStatTile
            label={t("ranking.streak")}
            value={`${user?.current_streak ?? 0}`}
            meta={`${t("profile.bestStreak")} ${user?.best_streak ?? 0}`}
          />
        </div>
      </div>

      {/* Recent Predictions */}
      <section className={retroPanelClassName({ className: "p-4" })}>
        <div className="flex items-center justify-between">
          <p className="text-sm font-semibold text-[var(--bp-ink)]">{t("profile.recentPredictions")}</p>
          <Link href="/events" className="text-xs font-medium text-[var(--bp-accent)]">
            {t("nav.events")}
          </Link>
        </div>

        <div className="mt-3 space-y-2">
          {(recentPreds ?? []).length === 0 ? (
            <RetroEmptyState
              title={t("common.noData")}
              action={
                <Link href="/events" className={retroButtonClassName({ variant: "primary", size: "sm" })}>
                  {t("common.startPredicting")}
                </Link>
              }
            />
          ) : (
            ((recentPreds ?? []) as RecentPrediction[]).map((prediction) => {
              const fight = prediction.fight;
              if (!fight) return null;

              const fighterALabel = getLocalizedFighterName(fight.fighter_a, locale, fight.fighter_a?.name);
              const fighterBLabel = getLocalizedFighterName(fight.fighter_b, locale, fight.fighter_b?.name);
              const pickedName = prediction.winner_id === fight.fighter_a?.id ? fighterALabel : fighterBLabel;

              return (
                <Link
                  key={prediction.id}
                  href={`/events/${fight.event?.id || ""}`}
                  className="gold-hover flex items-center justify-between gap-3 rounded-[10px] border border-[var(--bp-line)] bg-[var(--bp-card-inset)] p-3"
                >
                  <div className="min-w-0 flex-1">
                    <p className="text-[11px] text-[var(--bp-muted)]">
                      {fight.event ? getLocalizedEventName(fight.event, locale, fight.event.name) : ""} · {fight.event?.date}
                    </p>
                    <p className="mt-1 truncate text-sm font-semibold text-[var(--bp-ink)]">
                      {fighterALabel} vs {fighterBLabel}
                    </p>
                    <p className="mt-0.5 text-xs text-[var(--bp-muted)]">
                      {t("prediction.yourPick")}: <span className="text-[var(--bp-ink)]">{pickedName}</span>
                      {prediction.method ? ` · ${prediction.method}` : ""}
                      {prediction.round ? ` · R${prediction.round}` : ""}
                    </p>
                  </div>

                  <div className="shrink-0 text-right">
                    {prediction.is_winner_correct === null ? (
                      <RetroStatusBadge tone="neutral">{t("common.pending")}</RetroStatusBadge>
                    ) : prediction.is_winner_correct ? (
                      <div className="space-y-1">
                        <RetroStatusBadge tone="success">{t("event.win")}</RetroStatusBadge>
                        {typeof prediction.score === "number" ? (
                          <p className="text-xs font-semibold text-[var(--bp-accent)]">+{prediction.score}</p>
                        ) : null}
                      </div>
                    ) : (
                      <div className="space-y-1">
                        <RetroStatusBadge tone="danger">{t("event.loss")}</RetroStatusBadge>
                        {typeof prediction.score === "number" ? (
                          <p className="text-xs text-[var(--bp-muted)]">{prediction.score}</p>
                        ) : null}
                      </div>
                    )}
                  </div>
                </Link>
              );
            })
          )}
        </div>
      </section>
    </div>
  );
}
