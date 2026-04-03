import Link from "next/link";
import { createSupabaseServer } from "@/lib/supabase-server";
import { getTranslations } from "@/lib/i18n-server";

export const dynamic = "force-dynamic";

function formatDate(date: string, locale: string) {
  return new Intl.DateTimeFormat(locale === "pt-BR" ? "pt-BR" : locale, {
    month: "short",
    day: "numeric",
    weekday: "short",
  }).format(new Date(date));
}

function getDDay(date: string) {
  const now = new Date();
  const target = new Date(date);
  const diff = target.getTime() - now.getTime();
  const days = Math.ceil(diff / (1000 * 60 * 60 * 24));

  if (days <= 0) return "D-DAY";
  return `D-${days}`;
}

function getStatusLabel(status: string) {
  if (status === "live") return "LIVE";
  if (status === "completed") return "FINAL";
  return "UPCOMING";
}

export default async function HomePage() {
  const supabase = await createSupabaseServer();
  const { t, locale } = await getTranslations();

  const { data: events } = await supabase
    .from("events")
    .select("id, name, date, status, series_type")
    .order("date", { ascending: true });

  const upcomingEvents = (events ?? []).filter(
    (event) => event.status === "upcoming" || event.status === "live"
  );

  const featuredEvent = upcomingEvents[0] ?? null;
  const eventFeed = upcomingEvents.slice(0, 5);

  return (
    <div className="space-y-8 lg:space-y-10">
      <section className="hero-texture fight-grid relative min-h-[calc(100dvh-10rem)] overflow-hidden rounded-[28px] border border-white/10 bg-[#111315]">
        <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(11,11,12,0.96)_0%,rgba(11,11,12,0.88)_42%,rgba(11,11,12,0.58)_100%)]" />
        <div className="relative grid min-h-[calc(100dvh-10rem)] items-end gap-8 px-5 py-8 sm:px-8 sm:py-10 lg:grid-cols-[minmax(0,1.15fr)_420px] lg:px-10 lg:py-12">
          <div className="flex max-w-3xl flex-col justify-between gap-10">
            <div className="space-y-5">
              <div className="inline-flex items-center gap-3">
                <span className="display-font rounded-sm border border-[#e10600]/30 bg-[#e10600]/12 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-[#ff5a55]">
                  Fight Intelligence
                </span>
                <span className="h-px w-16 bg-gradient-to-r from-[#e10600] to-transparent" />
              </div>

              <div className="space-y-4">
                <p className="text-sm font-medium tracking-[0.02em] text-[#c9a96a]">
                  찍는 게 아니라, 읽는 거다
                </p>
                <h1 className="display-font max-w-4xl text-5xl font-extrabold uppercase leading-[0.92] text-white sm:text-6xl lg:text-7xl">
                  Black Pick
                  <span className="mt-2 block text-white/72">
                    Read the fight before it happens
                  </span>
                </h1>
                <p className="max-w-2xl text-sm leading-7 text-[#9ca3af] sm:text-base">
                  {t("home.heroDescription")}
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <Link
                  href={featuredEvent ? `/events/${featuredEvent.id}` : "/events"}
                  className="inline-flex items-center rounded-md bg-[#e10600] px-6 py-3 text-sm font-semibold text-white shadow-[0_14px_30px_rgba(225,6,0,0.28)] transition hover:bg-[#f20f09]"
                >
                  {locale === "ko" ? "지금 예측하기" : "Predict Now"}
                </Link>
                <Link
                  href="/ranking"
                  className="inline-flex items-center rounded-md border border-white/12 bg-white/[0.03] px-6 py-3 text-sm font-medium text-white/88 transition hover:border-white/20 hover:bg-white/[0.06] hover:text-white"
                >
                  {t("nav.ranking")}
                </Link>
              </div>
            </div>

            <div className="grid max-w-2xl gap-3 sm:grid-cols-[repeat(3,minmax(0,1fr))]">
              <div className="surface-panel rounded-2xl p-4">
                <p className="display-font text-xs uppercase tracking-[0.14em] text-white/45">
                  Coverage
                </p>
                <p className="mt-2 display-font text-3xl font-bold text-white">UFC</p>
                <p className="mt-1 text-xs text-[#9ca3af]">Main cards, rankings, momentum</p>
              </div>
              <div className="surface-panel rounded-2xl p-4">
                <p className="display-font text-xs uppercase tracking-[0.14em] text-white/45">
                  Signal
                </p>
                <p className="mt-2 display-font text-3xl font-bold text-[#c9a96a]">Data</p>
                <p className="mt-1 text-xs text-[#9ca3af]">Form, matchup, pace, finishing risk</p>
              </div>
              <div className="surface-panel rounded-2xl p-4">
                <p className="display-font text-xs uppercase tracking-[0.14em] text-white/45">
                  Edge
                </p>
                <p className="mt-2 display-font text-3xl font-bold text-white">Sharp</p>
                <p className="mt-1 text-xs text-[#9ca3af]">Built for serious fight readers</p>
              </div>
            </div>
          </div>

          <div className="surface-card relative rounded-[24px] p-5 sm:p-6">
            <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[#e10600]/60 to-transparent" />
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="display-font text-xs font-semibold uppercase tracking-[0.16em] text-[#c9a96a]">
                  Next Event
                </p>
                <h2 className="mt-3 display-font text-3xl font-bold uppercase leading-none text-white">
                  {featuredEvent?.name ?? "No upcoming event"}
                </h2>
              </div>
              <span className="rounded-sm border border-[#e10600]/25 bg-[#e10600]/10 px-2.5 py-1 text-xs font-semibold uppercase tracking-[0.12em] text-[#ff5a55]">
                {featuredEvent ? getDDay(featuredEvent.date) : "--"}
              </span>
            </div>

            <div className="mt-8 grid gap-3">
              <div className="rounded-2xl border border-white/8 bg-black/20 p-4">
                <p className="display-font text-[11px] uppercase tracking-[0.14em] text-white/45">
                  Date
                </p>
                <p className="mt-2 text-base font-semibold text-white">
                  {featuredEvent ? formatDate(featuredEvent.date, locale) : "-"}
                </p>
              </div>
              <div className="rounded-2xl border border-white/8 bg-black/20 p-4">
                <p className="display-font text-[11px] uppercase tracking-[0.14em] text-white/45">
                  Status
                </p>
                <p className="mt-2 text-base font-semibold text-white">
                  {featuredEvent ? getStatusLabel(featuredEvent.status) : "-"}
                </p>
              </div>
              <div className="rounded-2xl border border-white/8 bg-black/20 p-4">
                <p className="display-font text-[11px] uppercase tracking-[0.14em] text-white/45">
                  Series
                </p>
                <p className="mt-2 text-base font-semibold text-white">
                  {featuredEvent?.series_type ?? "UFC"}
                </p>
              </div>
            </div>

            <Link
              href={featuredEvent ? `/events/${featuredEvent.id}` : "/events"}
              className="mt-6 inline-flex w-full items-center justify-center rounded-md bg-white px-4 py-3 text-sm font-semibold text-black transition hover:bg-white/90"
            >
              {locale === "ko" ? "이벤트 보기" : "View Event"}
            </Link>
          </div>
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-[minmax(0,1.2fr)_minmax(320px,0.8fr)]">
        <div className="surface-card rounded-[24px] p-5 sm:p-6">
          <div className="flex items-end justify-between gap-4 border-b border-white/8 pb-4">
            <div>
              <p className="display-font text-xs uppercase tracking-[0.16em] text-[#c9a96a]">
                Upcoming Slate
              </p>
              <h2 className="mt-2 display-font text-3xl font-bold uppercase text-white">
                {t("nav.events")}
              </h2>
            </div>
            <Link
              href="/events"
              className="text-sm font-medium text-white/62 transition hover:text-white"
            >
              {locale === "ko" ? "전체 보기" : "View all"}
            </Link>
          </div>

          <div className="mt-4 grid gap-3">
            {eventFeed.length > 0 ? (
              eventFeed.map((event, index) => (
                <Link
                  key={event.id}
                  href={`/events/${event.id}`}
                  className="grid gap-4 rounded-2xl border border-white/8 bg-white/[0.02] p-4 transition hover:border-white/14 hover:bg-white/[0.04] sm:grid-cols-[72px_minmax(0,1fr)_auto]"
                >
                  <div className="rounded-xl border border-white/8 bg-black/20 p-3 text-center">
                    <p className="display-font text-[11px] uppercase tracking-[0.14em] text-white/45">
                      Card
                    </p>
                    <p className="mt-1 display-font text-3xl font-bold text-white">
                      {String(index + 1).padStart(2, "0")}
                    </p>
                  </div>

                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="rounded-sm border border-[#e10600]/20 bg-[#e10600]/10 px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-[#ff5a55]">
                        {getStatusLabel(event.status)}
                      </span>
                      <span className="text-xs text-white/40">{event.series_type ?? "UFC"}</span>
                    </div>
                    <h3 className="mt-2 truncate text-base font-semibold text-white sm:text-lg">
                      {event.name}
                    </h3>
                    <p className="mt-1 text-sm text-[#9ca3af]">
                      {formatDate(event.date, locale)}
                    </p>
                  </div>

                  <div className="flex items-center">
                    <span className="display-font text-xl font-bold text-[#c9a96a]">
                      {getDDay(event.date)}
                    </span>
                  </div>
                </Link>
              ))
            ) : (
              <div className="rounded-2xl border border-dashed border-white/10 bg-white/[0.02] p-8 text-sm text-[#9ca3af]">
                {locale === "ko" ? "예정된 이벤트가 없습니다." : "No upcoming events."}
              </div>
            )}
          </div>
        </div>

        <div className="grid gap-6">
          <div className="surface-card rounded-[24px] p-5 sm:p-6">
            <p className="display-font text-xs uppercase tracking-[0.16em] text-[#c9a96a]">
              Ranking Focus
            </p>
            <h3 className="mt-2 display-font text-3xl font-bold uppercase text-white">
              Premium Board
            </h3>
            <p className="mt-3 text-sm leading-7 text-[#9ca3af]">
              {locale === "ko"
                ? "랭킹 흐름과 최근 경기력, 스타일 상성을 함께 읽어 다음 결과를 더 정교하게 예측합니다."
                : "Track ranking movement, recent form, and style matchups to sharpen every prediction."}
            </p>
            <Link
              href="/ranking"
              className="mt-6 inline-flex rounded-md border border-[#c9a96a]/30 bg-[#c9a96a]/10 px-4 py-3 text-sm font-semibold text-[#f0dfbf] transition hover:border-[#c9a96a]/45 hover:bg-[#c9a96a]/14"
            >
              {t("nav.ranking")}
            </Link>
          </div>

          <div className="surface-card rounded-[24px] p-5 sm:p-6">
            <div className="flex items-center justify-between">
              <p className="display-font text-xs uppercase tracking-[0.16em] text-[#c9a96a]">
                Method
              </p>
              <span className="display-font text-xs uppercase tracking-[0.14em] text-white/35">
                Black Pick
              </span>
            </div>

            <div className="mt-5 grid gap-4">
              <div className="rounded-2xl border border-white/8 bg-black/20 p-4">
                <p className="display-font text-[11px] uppercase tracking-[0.14em] text-white/45">
                  01
                </p>
                <p className="mt-2 text-sm font-semibold text-white">
                  {locale === "ko" ? "폼과 활동량" : "Form and activity"}
                </p>
              </div>
              <div className="rounded-2xl border border-white/8 bg-black/20 p-4">
                <p className="display-font text-[11px] uppercase tracking-[0.14em] text-white/45">
                  02
                </p>
                <p className="mt-2 text-sm font-semibold text-white">
                  {locale === "ko" ? "스타일 상성" : "Style matchup"}
                </p>
              </div>
              <div className="rounded-2xl border border-white/8 bg-black/20 p-4">
                <p className="display-font text-[11px] uppercase tracking-[0.14em] text-white/45">
                  03
                </p>
                <p className="mt-2 text-sm font-semibold text-white">
                  {locale === "ko" ? "피니시 리스크" : "Finishing risk"}
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
