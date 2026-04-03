/**
 * Black Combat Crawler
 * Crawls blackcombat-official.com for events, fights, and fighter data.
 *
 * Site structure (discovered):
 *   Event list:   /event.php?page=10&eventCategory=BC|N|R|C
 *   Event detail:  /eventDetail.php?eventSeq={id}
 *   Fighter detail: /fighter/{id}
 *
 * Usage: npx ts-node src/scripts/crawler.ts
 */

import axios from "axios";
import * as cheerio from "cheerio";

// ── Types ──────────────────────────────────────────────

interface CrawledEvent {
  sourceId: string; // eventSeq from the site
  name: string;
  date: string; // ISO date
  category: string; // BC, N, R, C
  fights: CrawledFight[];
}

interface CrawledFight {
  fighterA: CrawledFighter;
  fighterB: CrawledFighter;
}

interface CrawledFighter {
  sourceId: string; // fighter seq from the site
  name: string;
  ringName: string;
  nationality: string; // flag class e.g. "fi-kr"
  record: string; // e.g. "9W 2L"
  weightClass: string;
  division: string; // e.g. "라이트급 #16"
}

// ── Config ─────────────────────────────────────────────

const BASE_URL = "https://www.blackcombat-official.com";
const RATE_LIMIT_MS = 1200;
const MAX_RETRIES = 3;
const CATEGORIES = ["BC", "N", "R", "C"] as const;

// ── Helpers ────────────────────────────────────────────

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

async function fetchPage(url: string): Promise<string> {
  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      const { data } = await axios.get<string>(url, {
        headers: { "User-Agent": "BlackPick-Crawler/1.0" },
        timeout: 15000,
      });
      return data;
    } catch (err: any) {
      console.warn(
        `  [retry ${attempt}/${MAX_RETRIES}] ${url}: ${err.message}`
      );
      if (attempt === MAX_RETRIES) throw err;
      await sleep(2000 * attempt);
    }
  }
  throw new Error("unreachable");
}

// ── Parsers ────────────────────────────────────────────

/**
 * Parse event list page → array of { sourceId, name, date }
 * URL pattern: /event.php?page=10&eventCategory=BC
 */
function parseEventList(
  html: string,
  category: string
): Pick<CrawledEvent, "sourceId" | "name" | "date" | "category">[] {
  const $ = cheerio.load(html);
  const events: Pick<CrawledEvent, "sourceId" | "name" | "date" | "category">[] = [];

  $(".event_list li").each((_, li) => {
    const $li = $(li);

    // Extract eventSeq from button onclick
    const btnHtml = $li.find("button").toArray()
      .map((b) => $(b).attr("onclick") || "")
      .join(" ");
    const seqMatch = btnHtml.match(/eventSeq=(\d+)/);
    if (!seqMatch) return;

    const sourceId = seqMatch[1];
    const name = $li.find("b").first().text().trim();
    const dateText = $li
      .find("div")
      .toArray()
      .map((d) => $(d).text().trim())
      .find((t) => /\d{4}년/.test(t));

    // Parse Korean date format "2026년 04월 11일" → "2026-04-11"
    let date = "";
    if (dateText) {
      const m = dateText.match(/(\d{4})년\s*(\d{2})월\s*(\d{2})일/);
      if (m) date = `${m[1]}-${m[2]}-${m[3]}`;
    }

    events.push({ sourceId, name, date, category });
  });

  return events;
}

/**
 * Parse event detail page → array of fight cards with fighter info
 * URL pattern: /eventDetail.php?eventSeq=287
 */
function parseEventDetail(html: string): CrawledFight[] {
  const $ = cheerio.load(html);
  const fights: CrawledFight[] = [];

  // Each fight card is a flex div inside the fightcard area
  // Structure: div(flex) > div(fighter_img left) + div(info center) + div(fighter_img right)
  const fightCards = $(".fightcard > div > div").filter(function () {
    return $(this).css("display") === "flex" || $(this).attr("style")?.includes("display:flex");
  });

  fightCards.each((_, card) => {
    const $card = $(card);

    // Find fighter links: /fighter/{id}
    const fighterLinks = $card.find('a[href*="/fighter/"]').toArray();
    if (fighterLinks.length < 2) return;

    const idA = $(fighterLinks[0]).attr("href")?.match(/fighter\/(\d+)/)?.[1] || "";
    const idB = $(fighterLinks[1]).attr("href")?.match(/fighter\/(\d+)/)?.[1] || "";

    // Fighter names are in the 1.5rem font-size section
    const nameElements = $card.find('div[style*="font-size:1.5rem"] > div > span').toArray();
    const nameA = nameElements[0] ? $(nameElements[0]).text().trim() : "";
    const nameB = nameElements[1] ? $(nameElements[1]).text().trim() : "";

    // Ring names + records from the 0.8rem section with RING NAME
    const ringNameSection = $card
      .find('div[style*="font-size:0.8rem"]')
      .filter(function () {
        return $(this).text().includes("RING NAME");
      })
      .first();

    let ringNameA = "";
    let ringNameB = "";
    let recordA = "";
    let recordB = "";

    if (ringNameSection.length) {
      const parts = ringNameSection.children("div").toArray();
      if (parts.length >= 3) {
        // Left fighter
        const leftText = $(parts[0]).text().trim();
        const leftLines = leftText.split("\n").map((s) => s.trim()).filter(Boolean);
        ringNameA = leftLines[0] || "";
        recordA = leftLines.find((l) => /\d+W/.test(l)) || "";

        // Right fighter
        const rightText = $(parts[2]).text().trim();
        const rightLines = rightText.split("\n").map((s) => s.trim()).filter(Boolean);
        ringNameB = rightLines[0] || "";
        recordB = rightLines.find((l) => /\d+W/.test(l)) || "";
      }
    }

    // Division info (e.g. "라이트급 #16")
    const divisionInfos = $card.find("span.division-info").toArray();
    const divisionA = divisionInfos[0] ? $(divisionInfos[0]).text().trim() : "";
    const divisionB = divisionInfos[1] ? $(divisionInfos[1]).text().trim() : "";

    // Nationality flags
    const flags = $card.find("span.fi").toArray();
    const natA = flags[0]
      ? ($(flags[0]).attr("class") || "").replace("fi ", "").trim()
      : "";
    const natB = flags[1]
      ? ($(flags[1]).attr("class") || "").replace("fi ", "").trim()
      : "";

    // Extract weight class from division (e.g. "라이트급" from "라이트급 #16")
    const weightA = divisionA.replace(/#\d+/, "").trim();
    const weightB = divisionB.replace(/#\d+/, "").trim();

    fights.push({
      fighterA: {
        sourceId: idA,
        name: nameA,
        ringName: ringNameA,
        nationality: natA,
        record: recordA,
        weightClass: weightA,
        division: divisionA,
      },
      fighterB: {
        sourceId: idB,
        name: nameB,
        ringName: ringNameB,
        nationality: natB,
        record: recordB,
        weightClass: weightB,
        division: divisionB,
      },
    });
  });

  return fights;
}

// ── Main ───────────────────────────────────────────────

async function crawlAllEvents(): Promise<CrawledEvent[]> {
  const allEvents: CrawledEvent[] = [];

  for (const category of CATEGORIES) {
    console.log(`\n📋 Crawling category: ${category}`);
    const listUrl = `${BASE_URL}/event.php?page=10&eventCategory=${category}`;

    try {
      const listHtml = await fetchPage(listUrl);
      const events = parseEventList(listHtml, category);
      console.log(`  Found ${events.length} events`);

      for (const event of events) {
        await sleep(RATE_LIMIT_MS);
        console.log(`  🥊 Crawling event: ${event.name} (seq=${event.sourceId})`);

        try {
          const detailUrl = `${BASE_URL}/eventDetail.php?eventSeq=${event.sourceId}`;
          const detailHtml = await fetchPage(detailUrl);
          const fights = parseEventDetail(detailHtml);
          console.log(`    Found ${fights.length} fights`);

          allEvents.push({ ...event, fights });
        } catch (err: any) {
          console.error(`    ❌ Failed to crawl event ${event.sourceId}: ${err.message}`);
          allEvents.push({ ...event, fights: [] });
        }
      }
    } catch (err: any) {
      console.error(`  ❌ Failed to crawl category ${category}: ${err.message}`);
    }
  }

  return allEvents;
}

// ── Entry point ────────────────────────────────────────

async function main() {
  console.log("🚀 Black Combat Crawler starting...\n");

  const events = await crawlAllEvents();

  // Deduplicate fighters
  const fighterMap = new Map<string, CrawledFighter>();
  for (const event of events) {
    for (const fight of event.fights) {
      if (fight.fighterA.sourceId)
        fighterMap.set(fight.fighterA.sourceId, fight.fighterA);
      if (fight.fighterB.sourceId)
        fighterMap.set(fight.fighterB.sourceId, fight.fighterB);
    }
  }

  const output = {
    crawledAt: new Date().toISOString(),
    totalEvents: events.length,
    totalFights: events.reduce((sum, e) => sum + e.fights.length, 0),
    totalFighters: fighterMap.size,
    events,
    fighters: Array.from(fighterMap.values()),
  };

  // Write to file
  const fs = await import("fs");
  const outPath = "./data/crawl-result.json";
  fs.mkdirSync("./data", { recursive: true });
  fs.writeFileSync(outPath, JSON.stringify(output, null, 2), "utf-8");

  console.log(`\n✅ Done!`);
  console.log(`  Events: ${output.totalEvents}`);
  console.log(`  Fights: ${output.totalFights}`);
  console.log(`  Fighters: ${output.totalFighters}`);
  console.log(`  Output: ${outPath}`);
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
