"use client";

import { useMemo } from "react";
import { Globe } from "lucide-react";
import { retroFieldClassName } from "@/components/ui/retro";
import {
  buildPreferredTimezoneList,
  getAllTimezones,
  getTimezoneDisplayName,
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
 * Timezone dropdown. Pins the detected zone at the top, then the venue
 * (Asia/Seoul), then the rest of the full IANA list so users from any
 * region can find their zone without being limited to a curated shortlist.
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
    const rest = getAllTimezones().filter((tz) => !seen.has(tz));
    return rest;
  }, [preferred]);

  return (
    <div className={`relative ${className ?? ""}`}>
      <Globe
        className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[var(--bp-muted)]"
        strokeWidth={1.8}
        aria-hidden
      />
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        aria-label={ariaLabel}
        className={retroFieldClassName(
          "appearance-none pl-7 pr-2 text-xs uppercase tracking-[0.08em]",
        )}
      >
        <optgroup label="———">
          {preferred.map((tz) => (
            <option key={`pref-${tz}`} value={tz}>
              {tz === detected ? "⚲ " : ""}
              {getTimezoneDisplayName(tz, locale)} ({tz})
            </option>
          ))}
        </optgroup>
        {allZones.length > 0 ? (
          <optgroup label="———">
            {allZones.map((tz) => (
              <option key={`all-${tz}`} value={tz}>
                {getTimezoneDisplayName(tz, locale)} ({tz})
              </option>
            ))}
          </optgroup>
        ) : null}
      </select>
    </div>
  );
}
