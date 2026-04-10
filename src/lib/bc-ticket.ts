import * as cheerio from "cheerio";

export type BcTicketInfo = {
  url: string | null;
  title: string | null;
  soldOut: boolean;
};

const BC_HOME_URL = "https://www.blackcombat-official.com/";
const FETCH_OPTS: RequestInit = {
  headers: {
    "User-Agent":
      "Mozilla/5.0 (compatible; BlackPickCrawler/3.1; +https://blackpick.io)",
    Accept: "text/html,application/xhtml+xml",
  },
  next: { revalidate: 300 },
};

const TICKET_CACHE_TTL_MS = 10 * 60 * 1000;
let ticketCache: { data: BcTicketInfo; ts: number } | null = null;

function extractTicketUrl(html: string): string | null {
  const $ = cheerio.load(html);
  const ticketAnchor = $("a")
    .filter((_, el) => $(el).text().trim().toUpperCase() === "TICKET")
    .first();

  if (!ticketAnchor.length) return null;

  const href = ticketAnchor.attr("href")?.trim();
  if (href && href !== "#" && href.startsWith("http")) {
    return href;
  }

  const onclick = ticketAnchor.attr("onclick") || "";
  const onclickMatch = onclick.match(/location\.href\s*=\s*['"]([^'"]+)['"]/i);
  if (onclickMatch?.[1]) {
    return onclickMatch[1];
  }

  const commentMatch = html.match(
    /ticket_link[^>]*href=["'](https?:\/\/[^"']+)["']/i,
  );
  return commentMatch?.[1] ?? null;
}

function cleanText(value: string | null | undefined): string | null {
  if (!value) return null;
  const normalized = value.replace(/\u00a0/g, " ").replace(/\s+/g, " ").trim();
  return normalized || null;
}

function parseTicketProduct(html: string): Pick<BcTicketInfo, "title" | "soldOut"> {
  const $ = cheerio.load(html);
  const title =
    cleanText($('meta[property="og:title"]').attr("content")) ||
    cleanText($(".item_detail_tit h3").first().text()) ||
    cleanText($("title").first().text());

  const soldOut =
    $('button.btn_add_soldout').length > 0 ||
    /구매\s*불가/.test(html) ||
    /품절/.test(html) ||
    /_NB_PD_USE\s*=\s*['"]N['"]/.test(html) ||
    /setStockCnt'\s*:\s*'0'/.test(html) ||
    /name=["']set_goods_stock["'][^>]*value=["']0["']/.test(html);

  return { title, soldOut };
}

export async function fetchBcTicketInfo(): Promise<BcTicketInfo> {
  if (ticketCache && Date.now() - ticketCache.ts < TICKET_CACHE_TTL_MS) {
    return ticketCache.data;
  }

  try {
    const homeRes = await fetch(BC_HOME_URL, FETCH_OPTS);
    if (!homeRes.ok) {
      return { url: null, title: null, soldOut: false };
    }

    const homeHtml = await homeRes.text();
    const url = extractTicketUrl(homeHtml);
    if (!url) {
      return { url: null, title: null, soldOut: false };
    }

    const ticketRes = await fetch(url, FETCH_OPTS);
    if (!ticketRes.ok) {
      const data = { url, title: null, soldOut: false };
      ticketCache = { data, ts: Date.now() };
      return data;
    }

    const ticketHtml = await ticketRes.text();
    const parsed = parseTicketProduct(ticketHtml);
    const data = { url, ...parsed };
    ticketCache = { data, ts: Date.now() };
    return data;
  } catch {
    return { url: null, title: null, soldOut: false };
  }
}
