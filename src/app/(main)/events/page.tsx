import Link from "next/link";
import { createSupabaseServer } from "@/lib/supabase-server";
import { getTranslations } from "@/lib/i18n-server";
import { getSeriesLabel } from "@/lib/constants";
import { getLocalizedEventName } from "@/lib/localized-name";
import {
  RetroEmptyState,
  RetroStatusBadge,
  retroButtonClassName,
  retroChipClassName,
  retroInsetClassName,
  retroPanelClassName,
  retroSegmentClassName,
} from "@/components/ui/retro";

export const dynamic = "force-dynamic";

type EventRow = {
  id: string;
  name: string;
  date: string;
  status: "upcoming" | "live" | "completed";
  series_type: "black_cup" | "numbering" | "rise" | "other";
};

function getStatusTone(status: EventRow["status"]) {
  if (status === "live") return "danger";
  if (status === "completed") return "success";
  return "info";
}

function EventListSection({
  title,
  items,
  locale,
  t,
}: {
  title: string;
  items: EventRow[];
  locale: string;
  t: (key: string) => string;
}) {
  if (items.length === 0) return null;

  return (
    <section>
      <div className="mb-3 flex items-center gap-2">
        <p className="text-sm font-semibold text-[var(--bp-ink)]">{title}</p>
        <span className="text-xs text-[var(--bp-muted)]">{items.length}</span>
      </div>

      <div className="space-y-2">
        {items.map((event) => (
          <Link
            key={event.id}
            href={`/events/${event.id}`}
            className={retroInsetClassName("gold-hover flex items-center justify-between gap-3 p-3 sm:p-4")}
          >
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <RetroStatusBadge tone={getStatusTone(event.status)}>
                  {t(`status.${event.status}`)}
                </RetroStatusBadge>
                <span className="text-[11px] text-[var(--bp-muted)]">{getSeriesLabel(event.series_type, t)}</span>
              </div>
              <p className="mt-1.5 truncate text-sm font-semibold text-[var(--bp-ink)]">
                {getLocalizedEventName(event, locale as "en" | "ko" | "ja" | "pt-BR", event.name)}
              </p>
              <p className="mt-0.5 text-xs text-[var(--bp-muted)]">{event.date}</p>
            </div>

            <span className={retroButtonClassName({ variant: event.status === "completed" ? "ghost" : "primary", size: "sm" })}>
              {event.status === "completed" ? t("event.result") : t("event.makeYourPick")}
            </span>
          </Link>
        ))}
      </div>
    </section>
  );
}

export default async function EventsPage() {
  const supabase = await createSupabaseServer();
  const { t, locale } = await getTranslations();

  const { data: events } = await supabase
    .from("events")
    .select("id, name, date, status, series_type")
    .order("date", { ascending: true });

  const typedEvents = (events ?? []) as EventRow[];
  const liveEvents = typedEvents.filter((event) => event.status === "live");
  const upcomingEvents = typedEvents.filter((event) => event.status === "upcoming");
  const completedEvents = typedEvents.filter((event) => event.status === "completed");
  const featured = liveEvents[0] ?? upcomingEvents[0] ?? null;

  return (
    <div className="flex flex-col gap-10">
      {/* Header */}
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-[var(--bp-ink)]">{t("event.allEvents")}</h1>
          <div className="mt-2 flex gap-2">
            <span className={retroChipClassName({ tone: liveEvents.length > 0 ? "accent" : "neutral" })}>
              {liveEvents.length} {t("status.live")}
            </span>
            <span className={retroChipClassName({ tone: "neutral" })}>
              {upcomingEvents.length} {t("status.upcoming")}
            </span>
            <span className={retroChipClassName({ tone: "neutral" })}>
              {completedEvents.length} {t("status.completed")}
            </span>
          </div>
        </div>
        {featured ? (
          <Link href={`/events/${featured.id}`} className={retroButtonClassName({ variant: "primary", size: "sm" })}>
            {t("event.makeYourPick")}
          </Link>
        ) : null}
      </div>

      {/* Event Lists */}
      <div className={retroPanelClassName({ className: "flex flex-col gap-6 p-4 sm:p-6" })}>
        <EventListSection title={t("status.live")} items={liveEvents} locale={locale} t={t} />
        <EventListSection title={t("status.upcoming")} items={upcomingEvents} locale={locale} t={t} />
        <EventListSection title={t("status.completed")} items={completedEvents} locale={locale} t={t} />
        {typedEvents.length === 0 ? <RetroEmptyState title={t("common.noData")} /> : null}
      </div>
    </div>
  );
}
