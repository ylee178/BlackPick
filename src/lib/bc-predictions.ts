/**
 * Fetch fan prediction percentages + fight metadata from
 * the Black Combat official site.
 *
 * 1. Crawl BC event list pages to find the matching eventSeq by name.
 * 2. Fetch the event detail page and parse predictions.
 */

export type BcFighterDivision = {
  weightClass: string;
  rank: number | null;
};

export type BcFightData = {
  fighterA_pct: number;
  fighterB_pct: number;
  /** Fight-level weight class from "XXXX BOUT" label (Korean) */
  weightClass: string | null;
  isMainEvent: boolean;
  fighterA_division: BcFighterDivision | null;
  fighterB_division: BcFighterDivision | null;
};

const BC_BASE = "https://blackcombat-official.com";
const CATEGORIES = ["BC", "N", "R", "C"] as const;

const FETCH_OPTS: RequestInit = {
  headers: {
    "User-Agent":
      "Mozilla/5.0 (compatible; BlackPickCrawler/2.0; +https://blackcombat-official.com)",
    Accept: "text/html,application/xhtml+xml",
  },
  next: { revalidate: 300 }, // 5-min cache
};

/**
 * Resolve a BC sourceEventId from image thumbnail paths.
 * The event list page uses `/event/{id}/thumb.jpg`.
 */
async function findSourceEventId(
  eventName: string
): Promise<string | null> {
  for (const cat of CATEGORIES) {
    try {
      const res = await fetch(
        `${BC_BASE}/event.php?page=10&eventCategory=${cat}`,
        FETCH_OPTS
      );
      if (!res.ok) continue;
      const html = await res.text();

      // Check if event name appears on this category page
      if (!html.includes(eventName)) continue;

      // Find the event name position, then find the closest /event/{id}/ BEFORE it.
      // BC site structure: thumbnail image /event/288/... appears before the event title.
      const nameIdx = html.indexOf(eventName);
      const allIds = [...html.matchAll(/\/event\/(\d+)\//g)];

      // Find the last eventId that appears before the event name
      let bestId: string | null = null;
      for (const match of allIds) {
        if (match.index !== undefined && match.index < nameIdx) {
          bestId = match[1];
        }
      }

      if (bestId) return bestId;
    } catch {
      continue;
    }
  }
  return null;
}

/**
 * Fetch predictions and weight classes from a BC event detail page.
 */
async function fetchFromDetailPage(
  sourceId: string
): Promise<BcFightData[]> {
  const res = await fetch(
    `${BC_BASE}/eventDetail.php?eventSeq=${sourceId}`,
    FETCH_OPTS
  );
  if (!res.ok) return [];
  const html = await res.text();

  // ── 1. Parse predictions: <span>21% </span><span>승부예측</span><span> 79%</span>
  const predRegex = /(\d+)%\s*<\/span>\s*<span[^>]*>\s*승부예측\s*<\/span>\s*<span[^>]*>\s*(\d+)%/g;
  const predictions: Array<{ a: number; b: number; pos: number }> = [];
  let pm: RegExpExecArray | null;
  while ((pm = predRegex.exec(html)) !== null) {
    predictions.push({ a: Number(pm[1]), b: Number(pm[2]), pos: pm.index });
  }

  // ── 2. Parse fight-level weight class: "[MAIN EVENT] LIGHTWEIGHT BOUT"
  const BOUT_TO_KO: Record<string, string> = {
    STRAWWEIGHT: "스트로급", FLYWEIGHT: "플라이급", BANTAMWEIGHT: "밴텀급",
    FEATHERWEIGHT: "페더급", LIGHTWEIGHT: "라이트급", WELTERWEIGHT: "웰터급",
    "SUPER LIGHTWEIGHT": "슈퍼라이트급", "SUPER WELTERWEIGHT": "슈퍼웰터급",
    MIDDLEWEIGHT: "미들급", "SUPER MIDDLEWEIGHT": "슈퍼미들급",
    "LIGHT HEAVYWEIGHT": "라이트헤비급", HEAVYWEIGHT: "헤비급",
    CATCHWEIGHT: "캐치웨이트", OPENWEIGHT: "오픈웨이트",
    "SUPER BANTAMWEIGHT": "슈퍼밴텀급", "SUPER FEATHERWEIGHT": "슈퍼페더급",
  };
  const boutRegex = /(\[MAIN EVENT\]\s*)?([\w\s]+?)BOUT/gi;
  const bouts: Array<{ weightClass: string | null; isMain: boolean; pos: number }> = [];
  let bm: RegExpExecArray | null;
  while ((bm = boutRegex.exec(html)) !== null) {
    const isMain = !!bm[1];
    const raw = bm[2].trim().toUpperCase();
    bouts.push({
      weightClass: BOUT_TO_KO[raw] ?? null,
      isMain,
      pos: bm.index,
    });
  }

  // ── 3. Parse per-fighter division: <span class="division-info">웰터급 #10</span>
  const KO_WEIGHT_RE =
    /(플라이급|밴텀급|페더급|라이트급|웰터급|미들급|라이트헤비급|헤비급|스트로급|슈퍼라이트급|캐치웨이트|오픈웨이트|슈퍼웰터급|슈퍼밴텀급|슈퍼페더급|슈퍼미들급)/;
  const divRegex = /class="division-info"[^>]*>([^<]+)/g;
  const divEntries: Array<{ div: BcFighterDivision; pos: number }> = [];
  let dm: RegExpExecArray | null;
  while ((dm = divRegex.exec(html)) !== null) {
    const text = dm[1].trim();
    const wm = text.match(KO_WEIGHT_RE);
    const rm = text.match(/#(\d+)/);
    if (wm) {
      divEntries.push({
        div: { weightClass: wm[1], rank: rm ? Number(rm[1]) : null },
        pos: dm.index,
      });
    }
  }

  // ── 4. Assemble: match bouts + divisions to predictions by position
  const result: BcFightData[] = [];
  for (let i = 0; i < predictions.length; i++) {
    const pred = predictions[i];

    // Find the bout label closest BEFORE this prediction
    let bout = bouts.findLast((b) => b.pos < pred.pos);
    // If this bout was already used by a previous prediction, skip it
    if (bout && i > 0 && predictions[i - 1].pos > bout.pos) {
      // Same bout as previous fight — look for a closer one
      bout = bouts.find((b) => b.pos > (predictions[i - 1]?.pos ?? 0) && b.pos < pred.pos) ?? bout;
    }

    // Find division-info entries between previous prediction and this one
    const prevPos = predictions[i - 1]?.pos ?? 0;
    const fightDivs = divEntries.filter((d) => d.pos > prevPos && d.pos < pred.pos);

    result.push({
      fighterA_pct: pred.a,
      fighterB_pct: pred.b,
      weightClass: bout?.weightClass ?? null,
      isMainEvent: bout?.isMain ?? false,
      fighterA_division: fightDivs[0]?.div ?? null,
      fighterB_division: fightDivs[1]?.div ?? null,
    });
  }

  return result;
}

export type BcEventResult = {
  fights: BcFightData[];
  posterUrl: string | null;
  sourceEventId: string | null;
};

/**
 * Main entry: given an event name, find and return BC fight data + poster URL.
 */
export async function fetchBcEventData(
  eventName: string,
  sourceEventId?: string | null
): Promise<BcFightData[]> {
  return (await fetchBcEventDataFull(eventName, sourceEventId)).fights;
}

const BC_CACHE_TTL_MS = 10 * 60 * 1000; // 10 minutes
const bcCache = new Map<string, { data: BcEventResult; ts: number }>();

export async function fetchBcEventDataFull(
  eventName: string,
  sourceEventId?: string | null
): Promise<BcEventResult> {
  const cacheKey = `${eventName}::${sourceEventId ?? ""}`;
  const cached = bcCache.get(cacheKey);
  if (cached && Date.now() - cached.ts < BC_CACHE_TTL_MS) {
    return cached.data;
  }

  try {
    const id = sourceEventId || (await findSourceEventId(eventName));
    if (!id) return { fights: [], posterUrl: null, sourceEventId: null };
    const fights = await fetchFromDetailPage(id);
    const posterUrl = `${BC_BASE}/theme/blackcombat/img/event/${id}/1.jpg`;
    const result = { fights, posterUrl, sourceEventId: id };
    bcCache.set(cacheKey, { data: result, ts: Date.now() });
    return result;
  } catch {
    return { fights: [], posterUrl: null, sourceEventId: null };
  }
}
