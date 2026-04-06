import Link from "next/link";
import { createSupabaseServer } from "@/lib/supabase-server";
import { getTranslations } from "@/lib/i18n-server";
import { getSeriesLabel } from "@/lib/constants";
import { getLocalizedEventName } from "@/lib/localized-name";
import {
  RetroEmptyState,
  RetroStatusBadge,
  retroButtonClassName,
  retroInsetClassName,
  retroPanelClassName,
} from "@/components/ui/retro";

export const dynamic = "force-dynamic";

type EventRow = {
  id: string;
  name: string;
  date: string;
  status: "upcoming" | "live" | "completed";
  series_type: "black_cup" | "numbering" | "rise" | "other";
};

export default async function ResultsPage() {
  const supabase = await createSupabaseServer();
  const { t, locale } = await getTranslations();

  const { data: events } = await supabase
    .from("events")
    .select("id, name, date, status, series_type")
    .eq("status", "completed")
    .order("date", { ascending: false });

  const completedEvents = (events ?? []) as EventRow[];

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-2xl font-bold text-[var(--bp-ink)]">{t("nav.results")}</h1>
        <p className="mt-1 text-sm text-[var(--bp-muted)]">
          {completedEvents.length} {t("results.totalEvents")}
        </p>
      </div>

      <div className={retroPanelClassName({ className: "p-4 sm:p-6" })}>
        {completedEvents.length === 0 ? (
          <RetroEmptyState title={t("common.noData")} />
        ) : (
          <div className="space-y-2">
            {completedEvents.map((event) => (
              <Link
                key={event.id}
                href={`/events/${event.id}`}
                className={retroInsetClassName("gold-hover flex items-center justify-between gap-3 p-3 sm:p-4")}
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <RetroStatusBadge tone="success">
                      {t("status.completed")}
                    </RetroStatusBadge>
                    <span className="text-xs text-[var(--bp-muted)]">
                      {getSeriesLabel(event.series_type, t)}
                    </span>
                  </div>
                  <p className="mt-1.5 truncate text-sm font-semibold text-[var(--bp-ink)]">
                    {getLocalizedEventName(event, locale as "en" | "ko" | "ja" | "pt-BR", event.name)}
                  </p>
                  <p className="mt-0.5 text-xs text-[var(--bp-muted)]">{event.date}</p>
                </div>

                <span className={retroButtonClassName({ variant: "ghost", size: "sm" })}>
                  {t("event.result")}
                </span>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
