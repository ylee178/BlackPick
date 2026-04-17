const DAY_MS = 24 * 60 * 60 * 1000;
const KST_OFFSET_HOURS = 9;
const EVENT_DATE_RE = /^(\d{4})-(\d{2})-(\d{2})$/;

function getFallbackCompletedAt(eventDate: string): Date {
  const match = eventDate.match(EVENT_DATE_RE);
  if (!match) {
    throw new Error(`Invalid event date: ${eventDate}`);
  }

  const [, year, month, day] = match;
  const kstStartUtcMs = Date.UTC(
    Number(year),
    Number(month) - 1,
    Number(day),
    -KST_OFFSET_HOURS,
    0,
    0,
    0,
  );

  // Legacy fallback: treat a completed event as if it ended at the end of the
  // Korea-local event day, then grant a full 24h voting window from there.
  return new Date(kstStartUtcMs + DAY_MS - 1);
}

export function getMvpVotingDeadline(
  eventDate: string,
  completedAt: string | null,
): Date {
  const anchor = completedAt ? new Date(completedAt) : getFallbackCompletedAt(eventDate);
  if (Number.isNaN(anchor.getTime())) {
    throw new Error(`Invalid completed_at timestamp: ${completedAt}`);
  }
  return new Date(anchor.getTime() + DAY_MS);
}
