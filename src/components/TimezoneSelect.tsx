"use client";

import { useMemo } from "react";
import { ChevronDown, Globe } from "lucide-react";
import {
  buildPreferredTimezoneList,
  getAllTimezones,
  getTimezoneAbbreviation,
} from "@/lib/timezone";

type TimezoneSelectProps = {
  value: string;
  detected: string;
  onChange: (timeZone: string) => void;
  locale?: string;
  ariaLabel?: string;
  className?: string;
};

/**
 * Compact timezone dropdown for the FlipTimer label row.
 *
 * Native `<select>` controls auto-size to the longest option text, so we
 * keep option labels short by showing the runtime-provided abbreviation
 * (KST, AEST, GMT+9 …) followed by the city. The control itself is
 * clamped with an explicit width so a long IANA id like
 * "America/Argentina/ComodRivadavia" cannot stretch the parent layout.
 *
 * We deliberately do not use `retroFieldClassName` here: that helper bakes
 * in `width: 100%` and a 44px min-height that would dominate the small
 * inline timer label and blow the timer card out of its column.
 */
export default function TimezoneSelect({
  value,
  detected,
  onChange,
  locale = "en",
  ariaLabel,
  className,
}: TimezoneSelectProps) {
  const preferred = useMemo(
    () => buildPreferredTimezoneList(detected),
    [detected],
  );

  const allZones = useMemo(() => {
    const seen = new Set(preferred);
    return getAllTimezones().filter((tz) => !seen.has(tz));
  }, [preferred]);

  const renderOption = (tz: string) => {
    const abbr = getTimezoneAbbreviation(tz, locale);
    const isDetected = tz === detected;
    // Strip the IANA prefix and underscores so the dropdown reads like
    // "KST · Seoul" / "AEST · Sydney" instead of dumping the raw id.
    const city = tz.split("/").pop()?.replace(/_/g, " ") ?? tz;
    const label = abbr ? `${abbr} · ${city}` : city;
    return (
      <option key={tz} value={tz}>
        {isDetected ? "• " : ""}
        {label}
      </option>
    );
  };

  return (
    <div className={`relative inline-block w-[180px] ${className ?? ""}`}>
      <Globe
        className="pointer-events-none absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[var(--bp-muted)]"
        strokeWidth={1.8}
        aria-hidden
      />
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        aria-label={ariaLabel}
        className="h-7 w-full appearance-none truncate rounded-[10px] border border-[var(--bp-line)] bg-black pl-7 pr-7 text-[11px] text-[var(--bp-ink)] focus:border-[var(--bp-accent)] focus:outline-none"
      >
        <optgroup label="Suggested">
          {preferred.map(renderOption)}
        </optgroup>
        {allZones.length > 0 ? (
          <optgroup label="All timezones">
            {allZones.map(renderOption)}
          </optgroup>
        ) : null}
      </select>
      <ChevronDown
        className="pointer-events-none absolute right-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[var(--bp-muted)]"
        strokeWidth={1.8}
        aria-hidden
      />
    </div>
  );
}
