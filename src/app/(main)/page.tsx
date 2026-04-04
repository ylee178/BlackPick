import Link from "next/link";
import { createSupabaseServer } from "@/lib/supabase-server";
import { getTranslations } from "@/lib/i18n-server";
import { getSeriesLabel } from "@/lib/constants";
import {
  RetroMeter,
  RetroSectionHeading,
  RetroStatTile,
  RetroStatusBadge,
  retroButtonClassName,
  retroChipClassName,
  retroInsetClassName,
  retroPanelClassName,
} from "@/components/ui/retro";

export const dynamic = "force-dynamic";

type HomeLeaderboardUser = {
  ring_name: string;
  score: number;
  wins: number;
  losses: number;
};

type HomeResultEvent = {
  id: string;
  name: string;
  date: string;
  series_type: "black_cup" | "numbering" | "rise" | "other";
};

function getDDay(date: string) {
  const diff = new Date(date).getTime() - Date.now();
  const days = Math.ceil(diff / (1000 * 60 * 60 * 24));
  if (days <= 0) return "D-DAY";
  return `D-${days}`;
}

export default async function HomePage() {
  const supabase = await createSupabaseServer();
  const { t } = await getTranslations();

  const [{ data: events }, { data: topUsers }, { data: recentCompleted }] =
    await Promise.all([
      supabase.from("events").select("id, name, date, status, series_type").order("date", { ascending: false }),
      supabase.from("users").select("ring_name, score, wins, losses").order("score", { ascending: false }).limit(3),
      supabase.from("events").select("id, name, date, series_type").eq("status", "completed").order("date", { ascending: false }).limit(5),
    ]);

  const upcomingEvents = (events ?? []).filter((e) => e.status === "upcoming" || e.status === "live");
  const featured = upcomingEvents[0] ?? null;
  const topScore = Math.max(...(topUsers ?? []).map((user) => user.score ?? 0), 1);
  const leaderboardUsers = (topUsers ?? []) as HomeLeaderboardUser[];
  const resultEvents = (recentCompleted ?? []) as HomeResultEvent[];

  return (
    <div className="space-y-6">
      <section className={retroPanelClassName({ className: "retro-grid p-6 md:p-8" })}>
        <div className="grid gap-5 lg:grid-cols-[1.2fr_0.9fr]">
          <div className="space-y-6">
            <RetroSectionHeading
              eyebrow={t("home.platformLabel")}
              title={t("home.heroTitle")}
              description={t("home.heroDescription")}
            />

            <div className="flex flex-wrap gap-3">
              <Link
                href={featured ? `/events/${featured.id}` : "/events"}
                className={retroButtonClassName({ variant: "primary", size: "lg" })}
              >
                {t("event.makeYourPick")}
              </Link>
              <Link
                href="/ranking"
                className={retroButtonClassName({ variant: "ghost", size: "lg" })}
              >
                {t("nav.ranking")}
              </Link>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <RetroStatTile
                label={t("common.nextEvent")}
                value={featured ? getDDay(featured.date) : t("common.comingSoon")}
                meta={featured ? featured.name : t("common.noData")}
                tone="accent"
              />
              <RetroStatTile
                label={t("rankingPage.title")}
                value={topUsers?.[0]?.ring_name ?? t("common.noData")}
                meta={
                  topUsers?.[0]
                    ? `${topUsers[0].score}${t("prediction.points")} · ${topUsers[0].wins}W-${topUsers[0].losses}L`
                    : t("common.noData")
                }
              />
            </div>
          </div>

          <div className={retroPanelClassName({ tone: "accent", className: "p-5 md:p-6" })}>
            {featured ? (
              <>
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <span className={retroChipClassName({ tone: "neutral" })}>
                      {t("common.nextEvent")}
                    </span>
                    <h2
                      className="mt-4 text-3xl font-black uppercase leading-[0.92] text-[#07111b] md:text-4xl"
                      style={{ fontFamily: "var(--font-display)" }}
                    >
                      {featured.name}
                    </h2>
                    <p className="mt-2 text-sm font-semibold text-black/60">
                      {getSeriesLabel(featured.series_type, t)}
                    </p>
                  </div>

                  <RetroStatusBadge tone={featured.status === "live" ? "danger" : "info"}>
                    {t(`status.${featured.status}`)}
                  </RetroStatusBadge>
                </div>

                <div className="mt-6 grid gap-3 sm:grid-cols-2">
                  <div className={retroInsetClassName("p-4")}>
                    <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-[var(--retro-muted)]">
                      {t("event.status")}
                    </p>
                    <p
                      className="mt-2 text-2xl font-black uppercase text-[var(--retro-ink)]"
                      style={{ fontFamily: "var(--font-display)" }}
                    >
                      {getDDay(featured.date)}
                    </p>
                  </div>
                  <div className={retroInsetClassName("p-4")}>
                    <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-[var(--retro-muted)]">
                      {t("common.nextEvent")}
                    </p>
                    <p
                      className="mt-2 text-2xl font-black uppercase text-[var(--retro-ink)]"
                      style={{ fontFamily: "var(--font-display)" }}
                    >
                      {featured.date}
                    </p>
                  </div>
                </div>

                <div className="mt-6">
                  <RetroMeter
                    label={t("common.platform")}
                    value={featured.status === "live" ? 100 : 72}
                    max={100}
                    valueLabel={t(featured.status === "live" ? "status.live" : "status.upcoming")}
                    tone={featured.status === "live" ? "danger" : "accent"}
                  />
                </div>

                <div className="mt-6 flex flex-wrap gap-3">
                  <Link
                    href={`/events/${featured.id}`}
                    className={retroButtonClassName({ variant: "secondary" })}
                  >
                    {t("event.fightCard")}
                  </Link>
                  <Link
                    href={`/events/${featured.id}`}
                    className={retroButtonClassName({ variant: "ghost" })}
                  >
                    {t("event.makeYourPick")}
                  </Link>
                </div>
              </>
            ) : (
              <RetroSectionHeading
                eyebrow={t("common.nextEvent")}
                title={t("common.comingSoon")}
                description={t("common.noData")}
              />
            )}
          </div>
        </div>
      </section>

      <div className="grid gap-4 lg:grid-cols-[1fr_1.4fr]">
        <section className={retroPanelClassName({ tone: "muted", className: "p-5 md:p-6" })}>
          <RetroSectionHeading
            eyebrow={t("rankingPage.title")}
            action={
              <Link href="/ranking" className={retroButtonClassName({ variant: "ghost", size: "sm" })}>
                {t("common.viewAll")}
              </Link>
            }
          />

          {(topUsers ?? []).length === 0 ? (
            <div className="py-8 text-center text-sm text-[var(--retro-muted)]">{t("common.noData")}</div>
          ) : (
            <div className="mt-5 space-y-3">
              {leaderboardUsers.map((user, i: number) => (
                <div
                  key={i}
                  className={retroPanelClassName({
                    tone: i === 0 ? "accent" : "default",
                    interactive: true,
                    className: "p-4",
                  })}
                >
                  <div className="flex items-start gap-4">
                    <RetroStatusBadge tone={i === 0 ? "accent" : "neutral"}>
                      #{i + 1}
                    </RetroStatusBadge>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div className="min-w-0">
                          <p
                            className="truncate text-xl font-black uppercase text-[var(--retro-ink)]"
                            style={{ fontFamily: "var(--font-display)" }}
                          >
                            {user.ring_name}
                          </p>
                          <p className="mt-1 text-xs uppercase tracking-[0.18em] text-[var(--retro-muted)]">
                            {user.wins}W-{user.losses}L
                          </p>
                        </div>
                        <p
                          className="text-2xl font-black uppercase text-[var(--retro-accent)]"
                          style={{ fontFamily: "var(--font-display)" }}
                        >
                          {user.score}
                        </p>
                      </div>

                      <RetroMeter
                        className="mt-4"
                        label={t("profile.score")}
                        value={user.score}
                        max={topScore}
                        valueLabel={`${user.score}${t("prediction.points")}`}
                        tone={i === 0 ? "accent" : "info"}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        <section className={retroPanelClassName({ className: "p-5 md:p-6" })}>
          <RetroSectionHeading eyebrow={t("common.latestResults")} />

          <div className="mt-5 space-y-3">
            {resultEvents.map((ev) => (
              <Link
                key={ev.id}
                href={`/events/${ev.id}`}
                className={`${retroInsetClassName("block p-4 transition-transform duration-150")} hover:-translate-y-px`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p
                      className="truncate text-lg font-black uppercase text-[var(--retro-ink)]"
                      style={{ fontFamily: "var(--font-display)" }}
                    >
                      {ev.name}
                    </p>
                    <p className="mt-2 text-xs uppercase tracking-[0.16em] text-[var(--retro-muted)]">
                      {ev.date} · {getSeriesLabel(ev.series_type, t)}
                    </p>
                  </div>
                  <RetroStatusBadge tone="success">{t("event.result")}</RetroStatusBadge>
                </div>
              </Link>
            ))}
          </div>
        </section>
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        <a
          href="https://hegemonyblack.com"
          target="_blank"
          rel="noopener noreferrer"
          className={retroPanelClassName({ tone: "accent", interactive: true, className: "p-5 md:p-6" })}
        >
          <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-black/55">{t("common.tickets")}</p>
          <p
            className="mt-3 text-2xl font-black uppercase text-[#07111b]"
            style={{ fontFamily: "var(--font-display)" }}
          >
            {t("common.blackCombatTickets")}
          </p>
          <p className="mt-2 text-sm text-black/65">{t("common.getSeats")}</p>
        </a>
        <a
          href="https://www.youtube.com/@BlackCombat"
          target="_blank"
          rel="noopener noreferrer"
          className={retroPanelClassName({ tone: "muted", interactive: true, className: "p-5 md:p-6" })}
        >
          <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-[var(--retro-muted)]">{t("common.membership")}</p>
          <p
            className="mt-3 text-2xl font-black uppercase text-[var(--retro-ink)]"
            style={{ fontFamily: "var(--font-display)" }}
          >
            {t("common.blackCombatYoutube")}
          </p>
          <p className="mt-2 text-sm text-[var(--retro-muted)]">{t("common.joinMembership")}</p>
        </a>
      </div>
    </div>
  );
}
