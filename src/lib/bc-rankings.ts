import axios from "axios";
import * as cheerio from "cheerio";

/**
 * Black Combat official division rankings.
 *
 * Source: `https://blackcombat-official.com/ranking.php`.
 *
 * Top-15 + champion per division. Fighters outside the top 15 don't
 * appear. Vacant titles render as an empty champion block (no onclick
 * href, empty `<span class="champ"></span>`) — the parser drops these
 * so callers see "division with 0 champions, N ranked".
 */

export type BcRankingEntry = {
  sourceFighterId: string;
  /** Korean weight class name, e.g. "라이트급". Taken verbatim from
   *  `<h3><span class="weight">…</span>`. Matches the format used by
   *  `bc-predictions.ts` and `fighters.weight_class`. */
  weightClass: string;
  /** BC's displayed fighter name (ring name OR Korean name, whichever
   *  BC renders inside `<span class="fighter_name">`). Used as a
   *  fallback match key when `source_fighter_id` is not yet backfilled
   *  on the target fighter row. */
  displayName: string | null;
  kind: "champion" | "ranked";
  /** 1..15 for ranked, `null` for champion. */
  position: number | null;
};

export type BcRankingResult = {
  entries: BcRankingEntry[];
  /** Korean weight class names observed in the DOM, including vacant
   *  divisions. Used by the sync script to decide which divisions' DB
   *  rows are in scope for stale-reset. */
  divisionsSeen: string[];
};

const BC_RANKING_URL = "https://blackcombat-official.com/ranking.php";

function cleanText(value: string | null | undefined): string | null {
  if (!value) return null;
  const normalized = value.replace(/\u00a0/g, " ").replace(/\s+/g, " ").trim();
  return normalized || null;
}

function extractFighterSeq(onclick: string | null | undefined): string | null {
  if (!onclick) return null;
  return onclick.match(/\/fighter\/(\d+)/)?.[1] ?? null;
}

/**
 * Pure HTML parser for the BC ranking page. Exported so unit tests can
 * feed canned fixtures without hitting the network. Network callers use
 * `fetchBcRankings` below.
 *
 * Guarantees:
 *   - Skips vacant champion blocks (empty `.champ` text AND/OR missing
 *     onclick href — either alone could appear depending on BC's markup
 *     state).
 *   - Skips ranked items whose onclick doesn't match `/fighter/\d+/`
 *     (defensive against BC markup drift).
 *   - Returns `divisionsSeen` as the list of weight classes whose
 *     `<span class="weight">` text was parsed, regardless of whether
 *     that division had any valid entries.
 *   - Position is taken from `.ranking_list_num` text; values outside
 *     1..15 are dropped (defensive — BC has always rendered 1..15 but
 *     we don't rely on it).
 */
export function parseBcRankingsHtml(html: string): BcRankingResult {
  const $ = cheerio.load(html);
  const entries: BcRankingEntry[] = [];
  const divisionsSeen: string[] = [];

  $(".ranking_list_part").each((_, partEl) => {
    const $part = $(partEl);
    const weightClass = cleanText($part.find("h3 > span.weight").first().text());
    if (!weightClass) return;
    if (!divisionsSeen.includes(weightClass)) divisionsSeen.push(weightClass);

    // Champion block. Only emit an entry if BOTH the CHAMPION text is
    // present AND we can extract a fighter seq — either absence implies
    // a vacant title.
    const $champBlock = $part.find(".ranking_list_part_champ").first();
    if ($champBlock.length) {
      const champLabel = cleanText($champBlock.find("h3 > span.champ").first().text());
      const champOnclick = $champBlock.attr("onclick") ?? "";
      const champSeq = extractFighterSeq(champOnclick);
      if (champLabel && champSeq) {
        entries.push({
          sourceFighterId: champSeq,
          weightClass,
          displayName: cleanText(
            $champBlock.find(".ranking_champ_name .fighter_name").first().text(),
          ),
          kind: "champion",
          position: null,
        });
      }
    }

    // Ranked items. Trailing whitespace on the className
    // ("ranking_list_part_item ") is intentional on BC's side, so the
    // selector uses the exact class token.
    $part.find(".ranking_list_part_item").each((_, itemEl) => {
      const $item = $(itemEl);
      const seq = extractFighterSeq($item.attr("onclick") ?? "");
      const posText = cleanText($item.find(".ranking_list_num").first().text());
      const posNum = posText ? Number.parseInt(posText, 10) : Number.NaN;
      if (!seq || !Number.isInteger(posNum) || posNum < 1 || posNum > 15) {
        return;
      }
      entries.push({
        sourceFighterId: seq,
        weightClass,
        displayName: cleanText(
          $item.find(".ranking_list_name .fighter_name").first().text(),
        ),
        kind: "ranked",
        position: posNum,
      });
    });
  });

  return { entries, divisionsSeen };
}

/**
 * Network caller. Throws on non-2xx or axios error — callers decide
 * whether to retry or abort. Does NOT cache; `sync-bc-fighter-ranks.ts`
 * runs on demand and its freshness policy is "whenever the script is
 * invoked".
 */
export async function fetchBcRankings(): Promise<BcRankingResult> {
  const res = await axios.get<string>(BC_RANKING_URL, {
    timeout: 20_000,
    headers: {
      "User-Agent":
        "Mozilla/5.0 (compatible; BlackPickCrawler/3.0; +https://blackcombat-official.com)",
      Accept: "text/html,application/xhtml+xml",
    },
  });
  return parseBcRankingsHtml(res.data);
}

/**
 * Minimal BC fighter profile — just enough to reconcile a BC seq with
 * one of our `fighters` rows by name when `sync-bc-event-card.ts`
 * never touched them.
 *
 * BC profile markup shape (from `/fighter/{seq}`):
 *
 *     <div class="data_name">
 *         <span class="fi fi-kr"></span> 김재웅<br />
 *         <span class="data_ringname">"투신"</span>
 *         <span class="data_age">AGE : 33</span>
 *     </div>
 *
 *   - `displayName` is the top-level text inside `.data_name` after
 *     stripping the flag, ring name, and age sub-elements. This is
 *     usually the Korean real name (김재웅), or the romanized name for
 *     international fighters.
 *   - `ringName` is `.data_ringname` text with the surrounding double
 *     quotes stripped.
 */
export type BcFighterProfile = {
  displayName: string | null;
  ringName: string | null;
};

export function parseBcFighterProfileHtml(html: string): BcFighterProfile {
  const $ = cheerio.load(html);
  const $dataName = $(".data_name").first();
  if (!$dataName.length) {
    return { displayName: null, ringName: null };
  }
  const rawRing = cleanText($dataName.find(".data_ringname").first().text());
  const ringName = rawRing ? rawRing.replace(/^["'“”]+|["'“”]+$/g, "").trim() || null : null;

  // Clone the node and drop all child elements that aren't the real
  // name text. What's left is the bare text node (김재웅 / "Gabriel
  // Rodrigues" / etc.).
  const $clone = $dataName.clone();
  $clone.find(".fi, .data_ringname, .data_age, .sns_link, br").remove();
  const displayName = cleanText($clone.text());

  return { displayName, ringName };
}

/**
 * Fetches + parses BC fighter profile HTML. Used by
 * `sync-bc-fighter-ranks.ts` tier-3 fallback to resolve a BC seq to a
 * DB fighter when neither `source_fighter_id` nor the strict
 * weight-class-scoped name match hit. Rate limiting is the caller's
 * responsibility.
 */
export async function fetchBcFighterProfile(
  sourceFighterId: string,
): Promise<BcFighterProfile> {
  const res = await axios.get<string>(
    `https://blackcombat-official.com/fighter/${encodeURIComponent(sourceFighterId)}`,
    {
      timeout: 15_000,
      headers: {
        "User-Agent":
          "Mozilla/5.0 (compatible; BlackPickCrawler/3.0; +https://blackcombat-official.com)",
        Accept: "text/html,application/xhtml+xml",
      },
    },
  );
  return parseBcFighterProfileHtml(res.data);
}
