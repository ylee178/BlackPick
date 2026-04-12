"use client";

import { CalendarDays } from "lucide-react";
import { useI18n } from "@/lib/i18n-provider";
import { useTimezone } from "@/lib/use-timezone";
import TimezoneSelect from "@/components/TimezoneSelect";

type EventDateLineProps = {
  /** Calendar day of the event in `YYYY-MM-DD` form (`events.date`). */
  eventDate: string;
  /** UTC ISO timestamp of the earliest fight, if available. */
  startTime?: string | null;
  /** Optional className override for the wrapper element. */
  className?: string;
};

/**
 * Subtext line under the event title showing date + time + an inline
 * timezone picker, all localized to the viewer's currently selected
 * timezone (shared with FlipTimer via the `useTimezone` hook). The
 * calendar icon anchors the line on the left and the timezone picker is
 * the only timezone control on the page now — FlipTimer is purely the
 * countdown.
 *
 * Hydration-safe: while the timezone is unknown (first server pass) we
 * render only the calendar day so the layout never flashes a wrong time.
 */
export default function EventDateLine({
  eventDate,
  startTime,
  className,
}: EventDateLineProps) {
  const { locale } = useI18n();
  const { tz, detected, setTz } = useTimezone();

  const dateLabel = formatDateLabel(eventDate, tz, startTime, locale);
  const timeLabel =
    tz && startTime ? formatTimeLabel(startTime, tz, locale) : null;

  return (
    <div
      className={`flex flex-wrap items-center gap-2 text-sm text-[var(--bp-muted)] ${className ?? ""}`}
    >
      <CalendarDays
        className="h-4 w-4 shrink-0"
        strokeWidth={1.8}
        aria-hidden
      />
      <span>{dateLabel}</span>
      {timeLabel ? (
        <>
          <span className="opacity-50">·</span>
          <span suppressHydrationWarning>{timeLabel}</span>
        </>
      ) : null}
      {tz ? (
        <TimezoneSelect
          value={tz}
          detected={detected ?? tz}
          onChange={setTz}
          locale={locale}
          ariaLabel="Change timezone"
        />
      ) : null}
    </div>
  );
}

/**
 * Choose the source of the date label.
 * - If we have a fight start_time AND a viewer timezone, format the wall
 *   clock day in that zone (so a midnight-crossing card lands on the
 *   right calendar day for the viewer).
 * - Otherwise fall back to the raw event.date string.
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
        month: "long",
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
