export type AppLocale = "en" | "ko" | "ja" | "pt-BR";

type LocalizedNameFields = {
  name?: string | null;
  name_en?: string | null;
  name_ko?: string | null;
};

type LocalizedFighterFields = LocalizedNameFields & {
  ring_name?: string | null;
};

function normalize(value?: string | null): string | null {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

function hasHangul(value: string | null): boolean {
  return !!value && /[가-힣]/.test(value);
}

const LEADS = [
  "g",
  "kk",
  "n",
  "d",
  "tt",
  "r",
  "m",
  "b",
  "pp",
  "s",
  "ss",
  "",
  "j",
  "jj",
  "ch",
  "k",
  "t",
  "p",
  "h",
];

const VOWELS = [
  "a",
  "ae",
  "ya",
  "yae",
  "eo",
  "e",
  "yeo",
  "ye",
  "o",
  "wa",
  "wae",
  "oe",
  "yo",
  "u",
  "wo",
  "we",
  "wi",
  "yu",
  "eu",
  "ui",
  "i",
];

const TAILS = [
  "",
  "k",
  "k",
  "ks",
  "n",
  "nj",
  "nh",
  "t",
  "l",
  "lk",
  "lm",
  "lb",
  "ls",
  "lt",
  "lp",
  "lh",
  "m",
  "p",
  "ps",
  "t",
  "t",
  "ng",
  "t",
  "t",
  "k",
  "t",
  "p",
  "t",
];

const KOREAN_PHRASE_MAP: Array<[RegExp, string]> = [
  [/대한민국\(α\)/g, "Korea (Alpha)"],
  [/대한민국/g, "Korea"],
  [/블랙컴뱃/g, "Black Combat"],
  [/블랙컵/g, "Black Cup"],
  [/블랙 컵/g, "Black Cup"],
  [/챔피언스리그/g, "Champions League"],
  [/챔피언스 리그/g, "Champions League"],
  [/넘버링/g, "Numbering"],
  [/라이즈/g, "Rise"],
  [/정상결전/g, "Clash at the Summit"],
  [/부산상륙작전/g, "Landing in Busan"],
  [/서울의 밤/g, "Night of Seoul"],
  [/8강/g, "Quarterfinals"],
  [/4강/g, "Semifinals"],
  [/결승/g, "Final"],
  [/토너먼트/g, "Tournament"],
  [/스페셜 매치/g, "Special Match"],
  [/대항전/g, "Showdown"],
  [/몽골/g, "Mongolia"],
  [/중국/g, "China"],
  [/브라질/g, "Brazil"],
  [/일본/g, "Japan"],
  [/미국/g, "USA"],
  [/러시아/g, "Russia"],
  [/카자흐스탄/g, "Kazakhstan"],
  [/우즈베키스탄/g, "Uzbekistan"],
  [/태국/g, "Thailand"],
  [/프랑스/g, "France"],
  [/독일/g, "Germany"],
];

function romanizeHangulWord(word: string): string {
  let output = "";

  for (const char of word) {
    const code = char.charCodeAt(0);
    if (code < 0xac00 || code > 0xd7a3) {
      output += char;
      continue;
    }

    const syllableIndex = code - 0xac00;
    const leadIndex = Math.floor(syllableIndex / 588);
    const vowelIndex = Math.floor((syllableIndex % 588) / 28);
    const tailIndex = syllableIndex % 28;

    output += `${LEADS[leadIndex]}${VOWELS[vowelIndex]}${TAILS[tailIndex]}`;
  }

  return output;
}

function titleCase(value: string): string {
  return value
    .split(/(\s+|-)/)
    .map((part) => {
      if (!part || /^\s+$/.test(part) || part === "-") return part;
      return part.charAt(0).toUpperCase() + part.slice(1);
    })
    .join("");
}

function localizeNonKoreanText(value: string, locale: AppLocale): string {
  if (locale === "ko" || !hasHangul(value)) {
    return value;
  }

  let localized = value;

  for (const [pattern, replacement] of KOREAN_PHRASE_MAP) {
    localized = localized.replace(pattern, replacement);
  }

  localized = localized.replace(/[가-힣]+/g, (match) => titleCase(romanizeHangulWord(match)));

  return localized
    .replace(/\s{2,}/g, " ")
    .replace(/\s+:/g, ":")
    .trim();
}

export function getLocalizedName(
  value: LocalizedNameFields | null | undefined,
  locale: AppLocale
): string {
  if (!value) return "";

  if (locale === "ko") {
    return [value.name_ko, value.name, value.name_en].map(normalize).find(Boolean) ?? "";
  }

  const englishName = normalize(value.name_en);
  if (englishName) {
    return englishName;
  }

  const sourceName = normalize(value.name) ?? normalize(value.name_ko);
  return sourceName ? localizeNonKoreanText(sourceName, locale) : "";
}

export function getLocalizedFighterName(
  fighter: LocalizedFighterFields | null | undefined,
  locale: AppLocale,
  fallback = ""
): string {
  if (!fighter) return fallback;

  const rawRingName = normalize(fighter.ring_name);
  const ringName = rawRingName ? localizeNonKoreanText(rawRingName, locale) : null;
  const fullName = getLocalizedName(fighter, locale);

  if (!ringName) {
    return fullName || fallback;
  }

  if (locale !== "ko" && hasHangul(rawRingName) && fullName && ringName !== fullName) {
    return fullName;
  }

  return ringName || fullName || fallback;
}

export function getLocalizedFighterFullName(
  fighter: LocalizedFighterFields | null | undefined,
  locale: AppLocale
): string {
  return getLocalizedName(fighter, locale);
}

export function getLocalizedFighterSubLabel(
  fighter: LocalizedFighterFields | null | undefined,
  locale: AppLocale
): string | null {
  if (!fighter) return null;

  const rawRingName = normalize(fighter.ring_name);
  const ringName = rawRingName ? localizeNonKoreanText(rawRingName, locale) : null;
  const fullName = getLocalizedFighterFullName(fighter, locale);
  const primaryLabel = getLocalizedFighterName(fighter, locale);

  if (!ringName || !fullName || ringName === fullName) {
    return null;
  }

  return primaryLabel === ringName ? fullName : ringName;
}

export function getLocalizedEventName(
  event: LocalizedNameFields | null | undefined,
  locale: AppLocale,
  fallback = ""
): string {
  return getLocalizedName(event, locale) || fallback;
}
