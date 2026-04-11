import axios, {AxiosInstance} from 'axios';
import * as cheerio from 'cheerio';
import type { AnyNode } from 'domhandler';

type EventCategory = 'BC' | 'N' | 'R' | 'C';
type WinnerSide = 'A' | 'B' | null;

type FighterOutput = {
  sourceId: string;
  name: string | null;
  nameEn: string | null;
  nameKo: string | null;
  ringName: string | null;
  record: string | null;
  nationality: string | null;
  weightClass: string | null;
  division: string | null;
};

type FightOutput = {
  fighterA: FighterOutput;
  fighterB: FighterOutput;
  winner: WinnerSide;
};

type EventOutput = {
  sourceId: string;
  name: string | null;
  date: string | null;
  category: EventCategory;
  fights: FightOutput[];
};

type CrawlOutput = {
  events: EventOutput[];
};

const BASE_URL = 'https://blackcombat-official.com';
const REQUEST_DELAY_MS = 1200;
const MAX_RETRIES = 3;
const RETRY_BASE_DELAY_MS = 1500;

const client: AxiosInstance = axios.create({
  baseURL: BASE_URL,
  timeout: 20000,
  headers: {
    'User-Agent':
      'Mozilla/5.0 (compatible; BlackPickCrawler/2.0; +https://blackcombat-official.com)',
    Accept: 'text/html,application/xhtml+xml'
  }
});

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

async function fetchWithRetry(url: string, attempt = 1): Promise<string> {
  try {
    if (attempt > 1) {
      console.log(`Retrying ${url} (attempt ${attempt}/${MAX_RETRIES})`);
    }

    const response = await client.get<string>(url);
    await sleep(REQUEST_DELAY_MS);
    return response.data;
  } catch (error) {
    if (attempt >= MAX_RETRIES) {
      throw error;
    }

    const backoff = RETRY_BASE_DELAY_MS * attempt;
    console.warn(`Request failed for ${url}. Waiting ${backoff}ms before retry...`);
    await sleep(backoff);
    return fetchWithRetry(url, attempt + 1);
  }
}

function cleanText(value: string | null | undefined): string | null {
  if (!value) return null;
  const normalized = value.replace(/\s+/g, ' ').replace(/\u00a0/g, ' ').trim();
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
  const match = href.match(/\/fighter\/(\d+)/);
  return match?.[1] ?? null;
}

function extractNationalityFromNode(node: cheerio.Cheerio<AnyNode>): string | null {
  const flag = node.find('span.fi').first();
  if (!flag.length) return null;

  const classAttr = flag.attr('class') || '';
  const match = classAttr.match(/fi-([a-z]{2})/i);
  return match?.[1]?.toUpperCase() ?? null;
}

function parseRecordText(text: string | null): string | null {
  if (!text) return null;
  const match = text.match(/(\d+)\s*W\s*(\d+)\s*L(?:\s*(\d+)\s*D)?/i);
  if (!match) return text;
  const [, wins, losses, draws] = match;
  return draws ? `${wins}-${losses}-${draws}` : `${wins}-${losses}`;
}

function detectWinnerFromFight($: cheerio.CheerioAPI, fightEl: cheerio.Element): WinnerSide {
  const fight = $(fightEl);

  const winSpans = fight
    .find('span')
    .filter((_, el) => cleanText($(el).text())?.toLowerCase() === 'win');

  if (!winSpans.length) return null;

  let leftScore = 0;
  let rightScore = 0;

  winSpans.each((_, el) => {
    const span = $(el);
    const style = (span.attr('style') || '').toLowerCase();
    const parentStyle = (span.parent().attr('style') || '').toLowerCase();
    const combinedStyle = `${style} ${parentStyle}`;

    const isGold =
      combinedStyle.includes('#ffba3c') ||
      combinedStyle.includes('rgb(255,186,60)') ||
      combinedStyle.includes('font-weight:bold') ||
      combinedStyle.includes('font-weight: bold');

    if (!isGold) return;

    const sideContainer = span
      .parents()
      .toArray()
      .find((parent) => {
        const parentStyleText = (parent.attribs?.style || '').toLowerCase();
        return (
          parentStyleText.includes('text-align:left') ||
          parentStyleText.includes('text-align: left') ||
          parentStyleText.includes('text-align:right') ||
          parentStyleText.includes('text-align: right')
        );
      });

    const sideStyle = (sideContainer?.attribs?.style || '').toLowerCase();

    if (sideStyle.includes('text-align:left') || sideStyle.includes('text-align: left')) {
      leftScore += 1;
    } else if (
      sideStyle.includes('text-align:right') ||
      sideStyle.includes('text-align: right')
    ) {
      rightScore += 1;
    }
  });

  if (leftScore > rightScore) return 'A';
  if (rightScore > leftScore) return 'B';

  const text = cleanText(fight.text())?.toLowerCase() || '';
  if (text.includes(' win ') || text.startsWith('win ') || text.endsWith(' win')) {
    return null;
  }

  return null;
}

function parseNameBlocks(sideNode: cheerio.Cheerio<AnyNode>): {
  name: string | null;
  ringName: string | null;
  record: string | null;
  nationality: string | null;
} {
  const name =
    cleanText(
      sideNode
        .find('div[style*="font-size:1.5rem"] span[style*="word-break"], div[style*="font-size: 1.5rem"] span[style*="word-break"]')
        .first()
        .text()
    ) ||
    cleanText(
      sideNode
        .find('div[style*="font-size:1.5rem"], div[style*="font-size: 1.5rem"]')
        .first()
        .text()
    );

  let ringName: string | null = null;
  sideNode.find('div').each((_, el) => {
    const text = cleanText(sideNode.find(el).text());
    if (text && /ring name/i.test(text)) {
      ringName = cleanText(text.replace(/ring name/i, '').replace(/[:：-]/g, ' '));
    }
  });

  const recordText =
    cleanText(
      sideNode
        .find('span[style*="color:#bbbbbb"], span[style*="color: #bbbbbb"]')
        .filter((_, el) => /\d+\s*W\s*\d+\s*L/i.test(cleanText(sideNode.find(el).text()) || ''))
        .first()
        .text()
    ) || null;

  const nationality = extractNationalityFromNode(sideNode);

  return {
    name,
    ringName,
    record: parseRecordText(recordText),
    nationality
  };
}

function splitFightSides(
  $: cheerio.CheerioAPI,
  fightEl: cheerio.Element
): {left: cheerio.Cheerio<AnyNode>; right: cheerio.Cheerio<AnyNode>} | null {
  const fight = $(fightEl);

  const alignedDivs = fight
    .find('div[style*="text-align:left"], div[style*="text-align: left"], div[style*="text-align:right"], div[style*="text-align: right"]')
    .toArray();

  const leftEl = alignedDivs.find((el) => {
    const style = (el.attribs?.style || '').toLowerCase();
    return style.includes('text-align:left') || style.includes('text-align: left');
  });

  const rightEl = alignedDivs.find((el) => {
    const style = (el.attribs?.style || '').toLowerCase();
    return style.includes('text-align:right') || style.includes('text-align: right');
  });

  if (!leftEl || !rightEl) return null;

  return {
    left: $(leftEl),
    right: $(rightEl)
  };
}

async function parseFighterDetail(
  fighterId: string
): Promise<Pick<FighterOutput, 'nameEn' | 'nameKo' | 'record' | 'name'>> {
  const html = await fetchWithRetry(`/fighter/${fighterId}`);
  const $ = cheerio.load(html);

  const fighterInfo = $('.fighter_info').first();
  const recordSection = $('.data_record').first();

  const infoTextLines = fighterInfo
    .text()
    .split('\n')
    .map((line) => cleanText(line))
    .filter(Boolean) as string[];

  let nameEn: string | null = null;
  let nameKo: string | null = null;
  let name: string | null = null;

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

  name = nameEn || nameKo || cleanText(fighterInfo.find('h1,h2,h3,strong').first().text()) || null;

  const recordText = cleanText(recordSection.text());
  let record: string | null = null;

  if (recordText) {
    const winMatch = recordText.match(/win\s*(\d+)/i);
    const lossMatch = recordText.match(/loss\s*(\d+)/i);
    const drawMatch = recordText.match(/draw\s*(\d+)/i);

    if (winMatch || lossMatch || drawMatch) {
      const wins = winMatch?.[1] ?? '0';
      const losses = lossMatch?.[1] ?? '0';
      const draws = drawMatch?.[1];
      record = draws ? `${wins}-${losses}-${draws}` : `${wins}-${losses}`;
    }
  }

  return {nameEn, nameKo, record, name};
}

async function parseEventDetail(
  eventId: string,
  category: EventCategory,
  eventMeta: {name: string | null; date: string | null}
): Promise<EventOutput> {
  const html = await fetchWithRetry(`/eventDetail.php?eventSeq=${eventId}`);
  const $ = cheerio.load(html);

  const fightRoots = $('.fightcard')
    .find('[style*="margin-bottom:50px"], [style*="margin-bottom: 50px"]')
    .toArray();

  const fights: FightOutput[] = [];

  for (const fightEl of fightRoots) {
    const sides = splitFightSides($, fightEl);
    if (!sides) continue;

    const leftLink = sides.left.find('a[href*="/fighter/"]').first();
    const rightLink = sides.right.find('a[href*="/fighter/"]').first();

    const fighterAId = extractFighterIdFromHref(leftLink.attr('href'));
    const fighterBId = extractFighterIdFromHref(rightLink.attr('href'));

    if (!fighterAId || !fighterBId) continue;

    const leftParsed = parseNameBlocks(sides.left);
    const rightParsed = parseNameBlocks(sides.right);

    const division =
      cleanText($(fightEl).find('span.division-info').first().text()) ||
      cleanText($(fightEl).find('.division-info').first().text());

    const [fighterADetail, fighterBDetail] = await Promise.all([
      parseFighterDetail(fighterAId),
      parseFighterDetail(fighterBId)
    ]);

    fights.push({
      fighterA: {
        sourceId: fighterAId,
        name: leftParsed.name || fighterADetail.name,
        nameEn: fighterADetail.nameEn,
        nameKo: fighterADetail.nameKo,
        ringName: leftParsed.ringName,
        record: leftParsed.record || fighterADetail.record,
        nationality: leftParsed.nationality,
        weightClass: division,
        division
      },
      fighterB: {
        sourceId: fighterBId,
        name: rightParsed.name || fighterBDetail.name,
        nameEn: fighterBDetail.nameEn,
        nameKo: fighterBDetail.nameKo,
        ringName: rightParsed.ringName,
        record: rightParsed.record || fighterBDetail.record,
        nationality: rightParsed.nationality,
        weightClass: division,
        division
      },
      winner: detectWinnerFromFight($, fightEl)
    });
  }

  return {
    sourceId: eventId,
    name: eventMeta.name,
    date: eventMeta.date,
    category,
    fights
  };
}

function parseEventList(html: string, category: EventCategory): Array<{
  sourceId: string;
  name: string | null;
  date: string | null;
  category: EventCategory;
}> {
  const $ = cheerio.load(html);
  const events: Array<{
    sourceId: string;
    name: string | null;
    date: string | null;
    category: EventCategory;
  }> = [];

  $('.event_list li').each((_, el) => {
    const li = $(el);
    const button = li.find('button').first();
    const onclick = button.attr('onclick') || li.attr('onclick');
    const sourceId = extractEventSeq(onclick);

    if (!sourceId) return;

    const textLines = li
      .text()
      .split('\n')
      .map((line) => cleanText(line))
      .filter(Boolean) as string[];

    const name = textLines[0] ?? null;
    const date =
      textLines.find((line) => /\d{4}[.\-/]\d{1,2}[.\-/]\d{1,2}/.test(line)) ??
      textLines.find((line) => /\d{1,2}[.\-/]\d{1,2}[.\-/]\d{2,4}/.test(line)) ??
      null;

    events.push({
      sourceId,
      name,
      date,
      category
    });
  });

  return events;
}

async function crawlCategory(category: EventCategory): Promise<EventOutput[]> {
  console.log(`Fetching event list for category ${category}...`);
  const html = await fetchWithRetry(`/event.php?page=10&eventCategory=${category}`);
  const eventMetas = parseEventList(html, category);

  console.log(`Found ${eventMetas.length} events in category ${category}`);

  const events: EventOutput[] = [];
  for (const meta of eventMetas) {
    console.log(`Parsing event ${meta.sourceId} (${meta.name ?? 'Unnamed Event'})`);
    const event = await parseEventDetail(meta.sourceId, category, {
      name: meta.name,
      date: meta.date
    });
    events.push(event);
  }

  return events;
}

async function main() {
  const categories: EventCategory[] = ['BC', 'N', 'R', 'C'];
  const allEvents: EventOutput[] = [];

  for (const category of categories) {
    const events = await crawlCategory(category);
    allEvents.push(...events);
  }

  const output: CrawlOutput = {
    events: allEvents
  };

  console.log(JSON.stringify(output, null, 2));
}

main().catch((error) => {
  console.error('Crawler failed:', error);
  process.exit(1);
});
