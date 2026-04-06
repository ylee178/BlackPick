/**
 * Match manifest entries to Supabase fighters by scraping names from
 * blackcombat-official.com and fuzzy-matching against the DB.
 *
 * Adds `db_id` and `ring_name` to each manifest entry.
 *
 * Usage:
 *   npx tsx src/scripts/match-manifest-db.ts
 *
 * Requires:
 *   - NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env
 *   - Fighter_Images/_manifest.json
 */

import * as fs from "fs";
import * as path from "path";
import { createClient } from "@supabase/supabase-js";
import axios, { AxiosInstance } from "axios";
import * as cheerio from "cheerio";

/* ── Config ── */

const MANIFEST_PATH = path.resolve(process.cwd(), "Fighter_Images/_manifest.json");
const BASE_URL = "https://blackcombat-official.com";
const REQUEST_DELAY_MS = 1200;
const MAX_RETRIES = 3;

/* ── Types ── */

type ManifestEntry = {
  source_id: string;
  db_id?: string;
  ring_name?: string | null;
  name: string | null;
  filename: string;
};

type DbFighter = {
  id: string;
  name: string;
  ring_name: string | null;
  name_en: string | null;
  name_ko: string | null;
};

type ScrapedInfo = {
  nameEn: string | null;
  nameKo: string | null;
  ringName: string | null;
  name: string | null;
};

/* ── Env ── */

function loadEnv(): { url: string; key: string } {
  const envPath = path.resolve(process.cwd(), ".env");
  const content = fs.readFileSync(envPath, "utf8");

  const urlMatch = content.match(/NEXT_PUBLIC_SUPABASE_URL=(.+)/);
  const keyMatch = content.match(/SUPABASE_SERVICE_ROLE_KEY=(.+)/);

  if (!urlMatch || !keyMatch) {
    throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env");
  }

  return { url: urlMatch[1].trim(), key: keyMatch[1].trim() };
}

/* ── HTTP client ── */

const client: AxiosInstance = axios.create({
  baseURL: BASE_URL,
  timeout: 20000,
  headers: {
    "User-Agent":
      "Mozilla/5.0 (compatible; BlackPickCrawler/2.0; +https://blackcombat-official.com)",
    Accept: "text/html,application/xhtml+xml",
  },
});

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function fetchWithRetry(url: string, attempt = 1): Promise<string> {
  try {
    if (attempt > 1) console.log(`  Retry ${url} (${attempt}/${MAX_RETRIES})`);
    const res = await client.get<string>(url);
    await sleep(REQUEST_DELAY_MS);
    return res.data;
  } catch (err) {
    if (attempt >= MAX_RETRIES) throw err;
    await sleep(1500 * attempt);
    return fetchWithRetry(url, attempt + 1);
  }
}

function cleanText(v: string | null | undefined): string | null {
  if (!v) return null;
  return v.replace(/\s+/g, " ").replace(/\u00a0/g, " ").trim() || null;
}

/* ── Scrape fighter detail page ── */

async function scrapeFighterDetail(sourceId: string): Promise<ScrapedInfo> {
  const html = await fetchWithRetry(`/fighter/${sourceId}`);
  const $ = cheerio.load(html);

  const fighterInfo = $(".fighter_info").first();

  const infoTextLines = fighterInfo
    .text()
    .split("\n")
    .map((line) => cleanText(line))
    .filter(Boolean) as string[];

  let nameEn: string | null = null;
  let nameKo: string | null = null;
  let ringName: string | null = null;

  for (const line of infoTextLines) {
    if (!nameEn && /^[A-Za-z\s.'-]+$/.test(line)) {
      nameEn = line;
      continue;
    }
    if (!nameKo && /[가-힣]/.test(line)) {
      nameKo = line;
      continue;
    }
  }

  // Check for ring name in event fight cards (from the detail page links)
  // Ring names are sometimes shown in the fighter info section
  for (const line of infoTextLines) {
    if (/ring\s*name/i.test(line)) {
      ringName = cleanText(line.replace(/ring\s*name/i, "").replace(/[:：\-]/g, " "));
      break;
    }
  }

  const name =
    nameEn ||
    nameKo ||
    cleanText(fighterInfo.find("h1,h2,h3,strong").first().text()) ||
    null;

  return { nameEn, nameKo, ringName, name };
}

/* ── Name normalization for matching ── */

function normalize(s: string | null | undefined): string {
  if (!s) return "";
  return s
    .toLowerCase()
    .replace(/\s+/g, "")
    .replace(/[.\-']/g, "")
    .trim();
}

function matchFighter(
  scraped: ScrapedInfo,
  dbFighters: DbFighter[],
): DbFighter | null {
  const candidates = [scraped.nameKo, scraped.nameEn, scraped.ringName, scraped.name];
  const normalizedCandidates = candidates.map(normalize).filter(Boolean);

  if (normalizedCandidates.length === 0) return null;

  // Pass 1: exact normalized match against all DB name fields
  for (const dbf of dbFighters) {
    const dbNames = [dbf.name, dbf.name_ko, dbf.name_en, dbf.ring_name]
      .map(normalize)
      .filter(Boolean);

    for (const sc of normalizedCandidates) {
      for (const db of dbNames) {
        if (sc === db) return dbf;
      }
    }
  }

  // Pass 2: substring match (scraped name contained in DB or vice versa)
  for (const dbf of dbFighters) {
    const dbNames = [dbf.name, dbf.name_ko, dbf.name_en, dbf.ring_name]
      .map(normalize)
      .filter(Boolean);

    for (const sc of normalizedCandidates) {
      if (sc.length < 2) continue;
      for (const db of dbNames) {
        if (db.length < 2) continue;
        if (sc.includes(db) || db.includes(sc)) return dbf;
      }
    }
  }

  return null;
}

/* ── Main ── */

async function main() {
  // Load env and create Supabase client
  const env = loadEnv();
  const supabase = createClient(env.url, env.key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  // Load manifest
  const manifest: ManifestEntry[] = JSON.parse(fs.readFileSync(MANIFEST_PATH, "utf8"));
  console.log(`\nManifest: ${manifest.length} entries\n`);

  // Fetch all fighters from DB
  const { data: dbFighters, error } = await supabase
    .from("fighters")
    .select("id, name, ring_name, name_en, name_ko");

  if (error || !dbFighters) {
    console.error("Failed to fetch fighters from DB:", error?.message);
    process.exit(1);
  }

  console.log(`DB fighters: ${dbFighters.length}\n`);

  let matched = 0;
  let unmatched = 0;
  const unmatchedList: { source_id: string; scraped: ScrapedInfo }[] = [];

  for (let i = 0; i < manifest.length; i++) {
    const entry = manifest[i];
    const label = `[${i + 1}/${manifest.length}] source_id=${entry.source_id}`;

    // Scrape fighter detail page
    let scraped: ScrapedInfo;
    try {
      scraped = await scrapeFighterDetail(entry.source_id);
    } catch (err) {
      console.log(`  ${label} -- scrape failed: ${(err as Error).message}`);
      unmatched++;
      unmatchedList.push({
        source_id: entry.source_id,
        scraped: { nameEn: null, nameKo: null, ringName: null, name: null },
      });
      continue;
    }

    console.log(
      `  ${label} scraped: ko=${scraped.nameKo || "-"} en=${scraped.nameEn || "-"} ring=${scraped.ringName || "-"}`,
    );

    // Match against DB
    const dbMatch = matchFighter(scraped, dbFighters);

    if (dbMatch) {
      entry.db_id = dbMatch.id;
      entry.ring_name = dbMatch.ring_name;
      // Also update the name field with a meaningful name
      entry.name = scraped.nameKo || scraped.nameEn || scraped.name || entry.name;
      console.log(`    -> MATCHED: ${dbMatch.name} (${dbMatch.id.slice(0, 8)}...)`);
      matched++;
    } else {
      console.log(`    -> NO MATCH`);
      unmatched++;
      unmatchedList.push({ source_id: entry.source_id, scraped });
    }
  }

  // Write updated manifest
  fs.writeFileSync(MANIFEST_PATH, JSON.stringify(manifest, null, 2) + "\n");

  // Summary
  console.log(`\n${"─".repeat(50)}`);
  console.log(`Matched:   ${matched}`);
  console.log(`Unmatched: ${unmatched}`);
  console.log(`Manifest:  ${MANIFEST_PATH}\n`);

  if (unmatchedList.length > 0) {
    console.log("Unmatched fighters:");
    for (const u of unmatchedList) {
      const s = u.scraped;
      console.log(
        `  source_id=${u.source_id}  ko=${s.nameKo || "-"}  en=${s.nameEn || "-"}  ring=${s.ringName || "-"}`,
      );
    }
    console.log();
  }
}

main().catch((err) => {
  console.error("Script failed:", err);
  process.exit(1);
});
