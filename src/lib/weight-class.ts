/**
 * Translate Korean weight class names to other languages.
 * DB stores Korean values from the crawler.
 */
const WEIGHT_MAP: Record<string, Record<string, string>> = {
  "플라이급": { en: "Flyweight", ja: "フライ級", "pt-BR": "Peso Mosca" },
  "밴텀급": { en: "Bantamweight", ja: "バンタム級", "pt-BR": "Peso Galo" },
  "페더급": { en: "Featherweight", ja: "フェザー級", "pt-BR": "Peso Pena" },
  "라이트급": { en: "Lightweight", ja: "ライト級", "pt-BR": "Peso Leve" },
  "웰터급": { en: "Welterweight", ja: "ウェルター級", "pt-BR": "Peso Meio-Médio" },
  "미들급": { en: "Middleweight", ja: "ミドル級", "pt-BR": "Peso Médio" },
  "라이트헤비급": { en: "Light Heavyweight", ja: "ライトヘビー級", "pt-BR": "Peso Meio-Pesado" },
  "헤비급": { en: "Heavyweight", ja: "ヘビー級", "pt-BR": "Peso Pesado" },
  "스트로급": { en: "Strawweight", ja: "ストロー級", "pt-BR": "Peso Palha" },
  "슈퍼라이트급": { en: "Super Lightweight", ja: "スーパーライト級", "pt-BR": "Peso Super-Leve" },
  "캐치웨이트": { en: "Catchweight", ja: "キャッチウェイト", "pt-BR": "Peso Casado" },
  "오픈웨이트": { en: "Openweight", ja: "無差別級", "pt-BR": "Peso Aberto" },
  "슈퍼웰터급": { en: "Super Welterweight", ja: "スーパーウェルター級", "pt-BR": "Peso Super Meio-Médio" },
  "슈퍼밴텀급": { en: "Super Bantamweight", ja: "スーパーバンタム級", "pt-BR": "Peso Super-Galo" },
  "슈퍼페더급": { en: "Super Featherweight", ja: "スーパーフェザー級", "pt-BR": "Peso Super-Pena" },
  "슈퍼미들급": { en: "Super Middleweight", ja: "スーパーミドル級", "pt-BR": "Peso Super-Médio" },
};

/** Weight classes ordered from lightest to heaviest */
const WEIGHT_ORDER: string[] = [
  "스트로급",
  "플라이급",
  "슈퍼밴텀급",
  "밴텀급",
  "슈퍼밴텀급",
  "페더급",
  "슈퍼페더급",
  "라이트급",
  "슈퍼라이트급",
  "웰터급",
  "슈퍼웰터급",
  "미들급",
  "슈퍼미들급",
  "라이트헤비급",
  "헤비급",
  "캐치웨이트",
  "오픈웨이트",
];

export function getWeightClassOrder(koreanWeight: string): number {
  const clean = koreanWeight.replace(/#C$/i, "").replace(/#\d+/, "").replace(/\d+(\.\d+)?\s*kg/i, "").trim();
  const idx = WEIGHT_ORDER.indexOf(clean);
  return idx >= 0 ? idx : WEIGHT_ORDER.length;
}

export function translateWeightClass(
  koreanWeight: string | null | undefined,
  locale: string
): string {
  if (!koreanWeight) return "";
  // Always strip #C (championship suffix) for display
  const displayWeight = koreanWeight.replace(/#C/i, "").trim();
  if (locale === "ko") return displayWeight;

  // Strip ranking info like "#16", championship "#C", and weight like "70kg"
  const rankMatch = koreanWeight.match(/#\d+/)?.[0] || "";
  const weightMatch = koreanWeight.match(/\d+(\.\d+)?\s*kg/i)?.[0] || "";
  const clean = koreanWeight.replace(/#C/i, "").replace(/#\d+/, "").replace(/\d+(\.\d+)?\s*kg/i, "").trim();

  const translations = WEIGHT_MAP[clean];
  if (translations && translations[locale]) {
    const suffix = [weightMatch, rankMatch].filter(Boolean).join(" ");
    return `${translations[locale]}${suffix ? ` ${suffix}` : ""}`;
  }

  return koreanWeight;
}
