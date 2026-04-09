/**
 * Translate Korean weight class names to other languages.
 * DB stores Korean values from the crawler.
 */
const WEIGHT_MAP: Record<string, Record<string, string>> = {
  "플라이급": { en: "Flyweight", ja: "フライ級", es: "Peso Mosca", "zh-CN": "蝇量级", mn: "Ялт жин" },
  "밴텀급": { en: "Bantamweight", ja: "バンタム級", es: "Peso Gallo", "zh-CN": "雏量级", mn: "Бантам жин" },
  "페더급": { en: "Featherweight", ja: "フェザー級", es: "Peso Pluma", "zh-CN": "羽量级", mn: "Өд жин" },
  "라이트급": { en: "Lightweight", ja: "ライト級", es: "Peso Ligero", "zh-CN": "轻量级", mn: "Хөнгөн жин" },
  "웰터급": { en: "Welterweight", ja: "ウェルター級", es: "Peso Wélter", "zh-CN": "次中量级", mn: "Велтер жин" },
  "미들급": { en: "Middleweight", ja: "ミドル級", es: "Peso Medio", "zh-CN": "中量级", mn: "Дунд жин" },
  "라이트헤비급": { en: "Light Heavyweight", ja: "ライトヘビー級", es: "Peso Semipesado", "zh-CN": "轻重量级", mn: "Хөнгөн хүнд жин" },
  "헤비급": { en: "Heavyweight", ja: "ヘビー級", es: "Peso Pesado", "zh-CN": "重量级", mn: "Хүнд жин" },
  "스트로급": { en: "Strawweight", ja: "ストロー級", es: "Peso Paja", "zh-CN": "草量级", mn: "Сүрэл жин" },
  "슈퍼라이트급": { en: "Super Lightweight", ja: "スーパーライト級", es: "Peso Superligero", "zh-CN": "超轻量级", mn: "Супер хөнгөн жин" },
  "캐치웨이트": { en: "Catchweight", ja: "キャッチウェイト", es: "Peso Pactado", "zh-CN": "协议体重", mn: "Тохирсон жин" },
  "오픈웨이트": { en: "Openweight", ja: "無差別級", es: "Peso Abierto", "zh-CN": "无差别级", mn: "Нээлттэй жин" },
  "슈퍼웰터급": { en: "Super Welterweight", ja: "スーパーウェルター級", es: "Peso Superwélter", "zh-CN": "超次中量级", mn: "Супер велтер жин" },
  "슈퍼밴텀급": { en: "Super Bantamweight", ja: "スーパーバンタム級", es: "Peso Supergallo", "zh-CN": "超雏量级", mn: "Супер бантам жин" },
  "슈퍼페더급": { en: "Super Featherweight", ja: "スーパーフェザー級", es: "Peso Superpluma", "zh-CN": "超羽量级", mn: "Супер өд жин" },
  "슈퍼미들급": { en: "Super Middleweight", ja: "スーパーミドル級", es: "Peso Supermedio", "zh-CN": "超中量级", mn: "Супер дунд жин" },
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
