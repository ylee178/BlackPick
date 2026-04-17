import axios, { AxiosInstance } from "axios";
import * as cheerio from "cheerio";
import type { AnyNode } from "domhandler";

export type BcEventCategory = "BC" | "N" | "R" | "C";

export type BcOfficialFighter = {
  sourceId: string;
  name: string | null;
  ringName: string | null;
  nationality: string | null;
  record: string | null;
  division: string | null;
  weightClass: string | null;
};

export type BcOfficialFight = {
  fighterA: BcOfficialFighter;
  fighterB: BcOfficialFighter;
  fightSeq: string | null;
  boutLabel: string | null;
  isMainEvent: boolean;
  /**
   * `sourceId` of whichever fighter the BC site flags with the "Win"
   * badge (a `<div>Win</div>` nested inside one fighter's anchor tag,
   * styled with `background-color: #ffba3c`). `null` for fights that
   * are not yet resulted, are cancelled, or where the BC site hasn't
   * published a winner yet.
   *
   * Method and round of victory are NOT in the static HTML — those
   * live behind a "SCORE CARD" JS modal on the BC site, so admins
   * still have to enter method + round via `/admin/results`. This
   * field exists so the sync script can pre-stage `winner_id` and
   * the admin UI can default the winner dropdown to the correct
   * pick, dropping the admin's entry cost to 2 fields per fight.
   */
  winnerSourceId: string | null;
};

export type BcOfficialEventMeta = {
  sourceId: string;
  name: string | null;
  date: string | null;
  category: BcEventCategory;
};

const BC_BASE_URL = "https://blackcombat-official.com";
const BC_CATEGORIES: readonly BcEventCategory[] = ["BC", "N", "R", "C"];

const client: AxiosInstance = axios.create({
  baseURL: BC_BASE_URL,
  timeout: 20_000,
  headers: {
    "User-Agent":
      "Mozilla/5.0 (compatible; BlackPickCrawler/3.0; +https://blackcombat-official.com)",
    Accept: "text/html,application/xhtml+xml",
  },
});

function cleanText(value: string | null | undefined): string | null {
  if (!value) return null;
  const normalized = value.replace(/\u00a0/g, " ").replace(/\s+/g, " ").trim();
  return normalized || null;
}

function extractEventSeq(onclick: string | undefined): string | null {
  if (!onclick) return null;
  const match =
    onclick.match(/eventSeq\s*=\s*['"]?(\d+)['"]?/i) ||
    onclick.match(/eventDetail\.php\?eventSeq=(\d+)/i) ||
    onclick.match(/['"](\d+)['"]/);
  return match?.[1] ?? null;
}

function extractFighterIdFromHref(href: string | undefined): string | null {
  if (!href) return null;
  return href.match(/\/fighter\/(\d+)/)?.[1] ?? null;
}

function extractNationalityFromNode(node: cheerio.Cheerio<AnyNode>): string | null {
  const flag = node.find("span.fi").first();
  if (!flag.length) return null;
  const classAttr = flag.attr("class") || "";
  const match = classAttr.match(/fi-([a-z]{2})/i);
  return match?.[1]?.toUpperCase() ?? null;
}

function parseRecordText(text: string | null): string | null {
  if (!text) return null;
  return cleanText(text);
}

function weightClassFromBoutLabel(label: string | null): string | null {
  if (!label) return null;
  const match = label.match(/(?:\[MAIN EVENT\]\s*)?(.+?)\s+BOUT/i);
  return cleanText(match?.[1] ?? null);
}

async function fetchHtml(path: string): Promise<string> {
  const response = await client.get<string>(path);
  return response.data;
}

export async function fetchBcEventList(
  category: BcEventCategory,
): Promise<BcOfficialEventMeta[]> {
  const html = await fetchHtml(`/event.php?page=10&eventCategory=${category}`);
  const $ = cheerio.load(html);
  const events: BcOfficialEventMeta[] = [];

  $(".event_list li").each((_, el) => {
    const li = $(el);
    const onclickCandidates = [
      ...li.find("button").toArray().map((button) => $(button).attr("onclick")),
      li.attr("onclick"),
    ].filter(Boolean) as string[];
    const sourceId = onclickCandidates
      .map((onclick) => extractEventSeq(onclick))
      .find(Boolean);
    if (!sourceId) return;

    const textLines = li
      .text()
      .split("\n")
      .map((line) => cleanText(line))
      .filter(Boolean) as string[];

    const name = textLines[0] ?? null;
    const dateText =
      textLines.find((line) => /\d{4}년\s*\d{2}월\s*\d{2}일/.test(line)) ?? null;

    events.push({
      sourceId,
      name,
      date: dateText,
      category,
    });
  });

  return events;
}

export async function findBcSourceEventId(eventName: string): Promise<string | null> {
  for (const category of BC_CATEGORIES) {
    const events = await fetchBcEventList(category);
    const match = events.find((event) => event.name === eventName);
    if (match) return match.sourceId;
  }
  return null;
}

export async function fetchBcOfficialEventCard(sourceEventId: string): Promise<BcOfficialFight[]> {
  const html = await fetchHtml(`/eventDetail.php?eventSeq=${sourceEventId}`);
  const $ = cheerio.load(html);
  const fightRoots = $(".fightcard")
    .find('[style*="margin-bottom:50px"], [style*="margin-bottom: 50px"]')
    .toArray();

  const fights: BcOfficialFight[] = [];

  for (const fightEl of fightRoots) {
    const fight = $(fightEl);
    const fighterLinks = fight.find('a[href*="/fighter/"]').toArray();
    const fighterAId = extractFighterIdFromHref($(fighterLinks[0]).attr("href"));
    const fighterBId = extractFighterIdFromHref($(fighterLinks[1]).attr("href"));
    if (!fighterAId || !fighterBId) continue;

    const nameRow = fight
      .find('div[style*="font-size:1.5rem"], div[style*="font-size: 1.5rem"]')
      .first();
    const nameCells = nameRow.children("div").toArray();
    const metaRows = fight
      .find('div[style*="font-size:0.8rem"], div[style*="font-size: 0.8rem"]')
      .toArray();
    const metaRow = metaRows.find((row) => $(row).find("span.fi, .division-info").length > 0);
    const ringRow = metaRows.find((row) => ($(row).text() || "").includes("RING NAME"));
    const metaCells = metaRow ? $(metaRow).children("div").toArray() : [];
    const ringCells = ringRow ? $(ringRow).children("div").toArray() : [];

    const fighterAName = cleanText($(nameCells[0]).text());
    const fighterBName = cleanText($(nameCells[nameCells.length - 1]).text());

    const fighterARing = cleanText($(ringCells[0]).text()?.split("\n")[0] ?? null);
    const fighterBRing = cleanText($(ringCells[ringCells.length - 1]).text()?.split("\n")[0] ?? null);

    const fighterARecord = parseRecordText(
      cleanText($(ringCells[0]).find('span[style*="#bbbbbb"]').first().text()),
    );
    const fighterBRecord = parseRecordText(
      cleanText($(ringCells[ringCells.length - 1]).find('span[style*="#bbbbbb"]').first().text()),
    );

    const fighterANationality = extractNationalityFromNode($(metaCells[0]));
    const fighterBNationality = extractNationalityFromNode($(metaCells[metaCells.length - 1]));
    const fighterADivision = cleanText($(metaCells[0]).find(".division-info").first().text());
    const fighterBDivision = cleanText(
      $(metaCells[metaCells.length - 1]).find(".division-info").first().text(),
    );

    const openModalHref = fight.find('a[id="openModal"]').attr("href") || "";
    const fightSeq =
      openModalHref.match(/openScoreCard\((\d+)/)?.[1] ||
      fight.find(".cheer-mini").attr("data-fight-seq") ||
      null;

    // Winner detection: BC marks the winning fighter's anchor with a
    // nested `<div>Win</div>` (cosmetic badge). We scope the search to
    // anchors INSIDE this fight row so a winner from a neighbouring
    // fight can't leak in. Fighter-detail anchors have href shaped
    // like `/fighter/{id}` — we pull the id from the first anchor
    // that contains a `div` with exact text "Win".
    let winnerSourceId: string | null = null;
    for (const fighterLink of fighterLinks) {
      const $link = $(fighterLink);
      const hasWinBadge = $link
        .find("div")
        .toArray()
        .some((d) => cleanText($(d).text()) === "Win");
      if (hasWinBadge) {
        winnerSourceId = extractFighterIdFromHref($link.attr("href"));
        break;
      }
    }

    const boutLabel = cleanText(
      fight
        .find("div")
        .filter((_, el) => ($(el).text() || "").includes("BOUT"))
        .last()
        .text(),
    );

    fights.push({
      fighterA: {
        sourceId: fighterAId,
        name: fighterAName,
        ringName: fighterARing,
        nationality: fighterANationality,
        record: fighterARecord,
        division: fighterADivision,
        weightClass: fighterADivision?.replace(/\s*#\d+\s*$/u, "") ?? weightClassFromBoutLabel(boutLabel),
      },
      fighterB: {
        sourceId: fighterBId,
        name: fighterBName,
        ringName: fighterBRing,
        nationality: fighterBNationality,
        record: fighterBRecord,
        division: fighterBDivision,
        weightClass: fighterBDivision?.replace(/\s*#\d+\s*$/u, "") ?? weightClassFromBoutLabel(boutLabel),
      },
      fightSeq,
      boutLabel,
      isMainEvent: boutLabel?.includes("[MAIN EVENT]") ?? false,
      winnerSourceId,
    });
  }

  return fights;
}
