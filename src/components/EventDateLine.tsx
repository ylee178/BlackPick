"use client";

import { CalendarDays } from "lucide-react";
import { useI18n } from "@/lib/i18n-provider";
import { useTimezone } from "@/lib/use-timezone";
import { getTimezoneAbbreviation } from "@/lib/timezone";

type EventDateLineProps = {
  /** Calendar day of the event in `YYYY-MM-DD` form (`events.date`). */
  eventDate: string;
  /** UTC ISO timestamp of the earliest fight, if available. */
  startTime?: string | null;
  /** Optional className override for the wrapper element. */
  className?: string;
};

/**
 * Subtext line under the event title showing date + time + timezone, all
 * localized to the viewer's currently selected timezone (shared with
 * FlipTimer via the `useTimezone` hook). Calendar icon is on the left.
 *
 * Hydration-safe: while the timezone is unknown (first server pass) we
 * render only the calendar day so the layout does not flash an
 * incorrect time anchored to the SSR host's clock.
 */
export default function EventDateLine({
  eventDate,
  startTime,
  className,
}: EventDateLineProps) {
  const { locale } = useI18n();
  const { tz: selectedTz } = useTimezone();

  const dateLabel = formatDateLabel(eventDate, selectedTz, startTime, locale);
  const timeLabel =
    selectedTz && startTime
      ? formatTimeLabel(startTime, selectedTz, locale)
      : null;
  const tzLabel =
    selectedTz && startTime
      ? getTimezoneAbbreviation(selectedTz, locale) || tzCity(selectedTz)
      : null;

  return (
    <p
      className={`flex flex-wrap items-center gap-1.5 text-xs text-[var(--bp-muted)] ${className ?? ""}`}
    >
      <CalendarDays className="h-3.5 w-3.5 shrink-0" strokeWidth={1.8} aria-hidden />
      <span>{dateLabel}</span>
      {timeLabel ? (
        <>
          <span className="text-[var(--bp-muted)] opacity-50">·</span>
          <span suppressHydrationWarning>{timeLabel}</span>
        </>
      ) : null}
      {tzLabel ? (
        <>
          <span className="text-[var(--bp-muted)] opacity-50">·</span>
          <span suppressHydrationWarning>{tzLabel}</span>
        </>
      ) : null}
    </p>
  );
}

/**
 * Choose the source of the date label.
 * - If we have a fight start_time AND a viewer timezone, format the wall
 *   clock day in that zone (so a midnight-crossing card lands on the
 *   right calendar day for the viewer).
 * - Otherwise fall back to the raw event.date string, which is already
 *   the Korea-local calendar day from the database.
 */
function formatDateLabel(
  eventDate: string,
  tz: string | null,
  startTime: string | null | undefined,
  locale: string,
): string {
  if (tz && startTime) {
    try {
      return new Intl.DateTimeFormat(locale, {
        year: "numeric",
        month: "short",
        day: "numeric",
        timeZone: tz,
      }).format(new Date(startTime));
    } catch {
      // Fall through to the raw eventDate.
    }
  }
  return eventDate;
}

function formatTimeLabel(
  startTime: string,
  tz: string,
  locale: string,
): string {
  try {
    return new Intl.DateTimeFormat(locale, {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
      timeZone: tz,
    }).format(new Date(startTime));
  } catch {
    return "";
  }
}

function tzCity(tz: string): string {
  return tz.split("/").pop()?.replace(/_/g, " ") ?? tz;
}
