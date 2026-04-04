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
};

export function translateWeightClass(
  koreanWeight: string | null | undefined,
  locale: string
): string {
  if (!koreanWeight) return "";
  if (locale === "ko") return koreanWeight;

  // Strip ranking info like "#16" from "라이트급 #16"
  const clean = koreanWeight.replace(/#\d+/, "").trim();

  const translations = WEIGHT_MAP[clean];
  if (translations && translations[locale]) {
    // Preserve rank if present
    const rank = koreanWeight.match(/#\d+/)?.[0] || "";
    return `${translations[locale]}${rank ? ` ${rank}` : ""}`;
  }

  return koreanWeight;
}
