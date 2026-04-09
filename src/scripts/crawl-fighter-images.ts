/**
 * Fighter Image Crawler
 *
 * Crawls fighter profile images from blackcombat-official.com
 * for upcoming events and saves them to Fighter_Images/ folder.
 *
 * Usage:
 *   npx tsx src/scripts/crawl-fighter-images.ts
 *
 * Images are saved as: Fighter_Images/{sourceId}_{name}.jpg
 * After post-processing, update the fighter's image_url in the DB.
 */

import axios, { AxiosInstance } from "axios";
import * as cheerio from "cheerio";
import * as fs from "fs";
import * as path from "path";

const BASE_URL = "https://blackcombat-official.com";
const OUTPUT_DIR = path.resolve(process.cwd(), "Fighter_Images");
const REQUEST_DELAY_MS = 1200;
const MAX_RETRIES = 3;

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

function sanitizeFilename(name: string): string {
  return name.replace(/[^a-zA-Z0-9가-힣_\- ]/g, "").replace(/\s+/g, "_");
}

/* ── Get upcoming event IDs ── */

async function getUpcomingEventIds(): Promise<{ id: string; name: string }[]> {
  const categories = ["BC", "N", "R", "C"];
  const events: { id: string; name: string }[] = [];

  for (const cat of categories) {
    const html = await fetchWithRetry(`/event.php?page=10&eventCategory=${cat}`);
    const $ = cheerio.load(html);

    $(".event_list li").each((_, el) => {
      const li = $(el);
      const button = li.find("button").first();
      const onclick = button.attr("onclick") || li.attr("onclick");
      if (!onclick) return;

      // Extract eventSeq from onclick or href patterns
      const seqMatch =
        onclick.match(/eventSeq\s*=\s*['"]?(\d+)['"]?/i) ||
        onclick.match(/eventDetail\.php\?eventSeq=(\d+)/i);

      // Also check for href links inside the li
      let eventSeq = seqMatch?.[1] ?? null;
      if (!eventSeq) {
        const href = li.find("a[href*='eventSeq']").attr("href") || "";
        const hrefMatch = href.match(/eventSeq=(\d+)/);
        eventSeq = hrefMatch?.[1] ?? null;
      }
      // Check the "상세보기" button/link specifically
      if (!eventSeq) {
        li.find("a, button").each((_, child) => {
          const childOnclick = $(child).attr("onclick") || "";
          const childHref = $(child).attr("href") || "";
          const combined = childOnclick + " " + childHref;
          const m = combined.match(/eventSeq=(\d+)/);
          if (m) {
            eventSeq = m[1];
            return false;
          }
        });
      }
      if (!eventSeq) return;

      const fullText = cleanText(li.text()) || "";

      // Extract date — "2026년 04월 11일" or "2026.04.11" patterns
      const dateMatch =
        fullText.match(/(\d{4})년\s*(\d{1,2})월\s*(\d{1,2})일/) ||
        fullText.match(/(\d{4})[.\-/](\d{1,2})[.\-/](\d{1,2})/);

      if (dateMatch) {
        const eventDate = new Date(`${dateMatch[1]}-${dateMatch[2].padStart(2, "0")}-${dateMatch[3].padStart(2, "0")}`);
        const cutoff = new Date();
        cutoff.setDate(cutoff.getDate() - 90);
        if (eventDate >= cutoff) {
          // Extract event name (first meaningful text before the date)
          const name = fullText.split(/\d{4}년/)[0]?.trim() || `Event ${eventSeq}`;
          events.push({ id: eventSeq, name });
        }
      }
    });
  }

  return events;
}

/* ── Get fighter IDs from an event ── */

async function getFighterIdsFromEvent(eventId: string): Promise<{ id: string; name: string }[]> {
  const html = await fetchWithRetry(`/eventDetail.php?eventSeq=${eventId}`);
  const $ = cheerio.load(html);
  const fighters: { id: string; name: string }[] = [];
  const seen = new Set<string>();

  $('a[href*="/fighter/"]').each((_, el) => {
    const href = $(el).attr("href");
    const match = href?.match(/\/fighter\/(\d+)/);
    if (!match) return;
    const fid = match[1];
    if (seen.has(fid)) return;
    seen.add(fid);

    // Try to get name from nearby text
    const parent = $(el).closest("div[style]");
    const nameEl = parent.find('div[style*="font-size:1.5rem"] span, div[style*="font-size: 1.5rem"] span').first();
    const name = cleanText(nameEl.text()) || cleanText($(el).text()) || fid;

    fighters.push({ id: fid, name });
  });

  return fighters;
}

/* ── Download fighter image ── */

async function downloadFighterImage(fighterId: string, fallbackName: string): Promise<string | null> {
  const html = await fetchWithRetry(`/fighter/${fighterId}`);
  const $ = cheerio.load(html);

  // Look for fighter image — target img.fighter_img specifically
  let imgUrl: string | null = null;

  // Primary: img.fighter_img (the actual fighter photo)
  const fighterImg = $("img.fighter_img").first();
  if (fighterImg.length) {
    const src = fighterImg.attr("src") || "";
    if (src && !src.includes("fighter_blank")) {
      imgUrl = src;
    }
  }

  // Fallback: any img inside .fightcard with fighter_new in src
  if (!imgUrl) {
    $("img").each((_, el) => {
      const src = $(el).attr("src") || "";
      if (src.includes("fighter_new") && !src.includes("fighter_blank")) {
        imgUrl = src;
        return false;
      }
    });
  }

  if (!imgUrl) {
    console.log(`  ⚠ No image found for fighter ${fighterId} (${fallbackName})`);
    return null;
  }

  // Resolve relative URLs
  if (imgUrl.startsWith("/")) {
    imgUrl = `${BASE_URL}${imgUrl}`;
  } else if (!imgUrl.startsWith("http")) {
    imgUrl = `${BASE_URL}/${imgUrl}`;
  }

  // Get fighter name from detail page for better filename
  const infoText = $(".fighter_info").text();
  const lines = infoText.split("\n").map((l) => cleanText(l)).filter(Boolean) as string[];
  const nameKo = lines.find((l) => /[가-힣]/.test(l));
  const nameEn = lines.find((l) => /^[A-Za-z\s.'-]+$/.test(l));
  const displayName = nameKo || nameEn || fallbackName;

  // Download image
  const ext = path.extname(new URL(imgUrl).pathname) || ".jpg";
  const filename = `${fighterId}_${sanitizeFilename(displayName)}${ext}`;
  const filepath = path.join(OUTPUT_DIR, filename);

  // Skip if already downloaded
  if (fs.existsSync(filepath)) {
    console.log(`  ✓ Already exists: ${filename}`);
    return filename;
  }

  try {
    const imgRes = await axios.get(imgUrl, {
      responseType: "arraybuffer",
      timeout: 15000,
      headers: {
        "User-Agent": client.defaults.headers["User-Agent"] as string,
        Referer: `${BASE_URL}/fighter/${fighterId}`,
      },
    });
    fs.writeFileSync(filepath, imgRes.data);
    console.log(`  ✓ Downloaded: ${filename} (${Math.round(imgRes.data.length / 1024)}KB)`);
    return filename;
  } catch (err) {
    console.log(`  ✗ Failed to download image for ${fighterId}: ${(err as Error).message}`);
    return null;
  }
}

/* ── Main ── */

async function main() {
  // Ensure output directory exists
  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  }

  console.log("🔍 Finding upcoming events...\n");
  const events = await getUpcomingEventIds();

  if (events.length === 0) {
    console.log("No upcoming events found.");
    return;
  }

  console.log(`Found ${events.length} upcoming event(s):\n`);
  for (const e of events) {
    console.log(`  • ${e.name} (ID: ${e.id})`);
  }
  console.log();

  // Collect all fighters
  const allFighters = new Map<string, string>();
  for (const event of events) {
    console.log(`📋 ${event.name} — fetching fighters...`);
    const fighters = await getFighterIdsFromEvent(event.id);
    for (const f of fighters) {
      if (!allFighters.has(f.id)) allFighters.set(f.id, f.name);
    }
    console.log(`   ${fighters.length} fighters found\n`);
  }

  console.log(`\n📸 Downloading images for ${allFighters.size} fighters...\n`);

  const results: { id: string; name: string; file: string | null }[] = [];

  for (const [id, name] of allFighters) {
    console.log(`  Fighter ${id} (${name})`);
    const file = await downloadFighterImage(id, name);
    results.push({ id, name, file });
  }

  // Summary
  const downloaded = results.filter((r) => r.file);
  const failed = results.filter((r) => !r.file);

  console.log(`\n${"─".repeat(50)}`);
  console.log(`✅ Downloaded: ${downloaded.length}`);
  console.log(`⚠  No image:   ${failed.length}`);
  console.log(`📁 Saved to:   ${OUTPUT_DIR}`);

  if (failed.length > 0) {
    console.log(`\nFighters without images:`);
    for (const f of failed) {
      console.log(`  • ${f.name} (ID: ${f.id})`);
    }
  }

  // Write manifest for easy DB mapping
  const manifest = results.map((r) => ({
    source_id: r.id,
    name: r.name,
    filename: r.file,
  }));
  const manifestPath = path.join(OUTPUT_DIR, "_manifest.json");
  fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));
  console.log(`\n📄 Manifest: ${manifestPath}`);
}

main().catch((err) => {
  console.error("Crawler failed:", err);
  process.exit(1);
});
