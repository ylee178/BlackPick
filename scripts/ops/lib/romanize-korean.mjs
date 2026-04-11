// Korean → English romanization tailored for BlackPick fighter names.
//
// Strategy:
//   1. Detect the surname by trying 2-syllable surnames first, then
//      falling back to a 1-syllable surname.
//   2. Romanize the surname with a hand-curated dictionary that uses
//      conventional English spellings ("Kim", "Lee", "Park") instead of
//      strict Revised Romanization ("Gim", "I", "Bak"), since the
//      conventional forms are how Korean people actually spell their
//      surnames in passports / English bios.
//   3. Romanize the given name by decomposing each Hangul syllable into
//      its 초성/중성/종성 jamo via Unicode arithmetic, mapping each jamo
//      to RR letters, and joining the result. Result is Title Case.
//   4. Return "Given Surname" — English convention, not the Korean
//      "Surname Given" order.
//
// All inputs and outputs are plain strings; no DB or environment access.
// Exposed via named exports so the apply script and unit tests can use it.

const HANGUL_BASE = 0xac00;
const HANGUL_END = 0xd7a3;
const INITIAL_COUNT = 19;
const VOWEL_COUNT = 21;
const FINAL_COUNT = 28;

const INITIALS = [
  "g", "kk", "n", "d", "tt", "r", "m", "b", "pp", "s",
  "ss", "", "j", "jj", "ch", "k", "t", "p", "h",
];

const VOWELS = [
  "a", "ae", "ya", "yae", "eo", "e", "yeo", "ye", "o", "wa",
  "wae", "oe", "yo", "u", "wo", "we", "wi", "yu", "eu", "ui", "i",
];

const FINALS = [
  "", "k", "k", "ks", "n", "nj", "nh", "t", "l", "lk",
  "lm", "lp", "ls", "lt", "lp", "lh", "m", "p", "ps", "t",
  "ss", "ng", "j", "ch", "k", "t", "p", "h",
];

// Conventional English spellings of common Korean surnames. Using these
// instead of strict Revised Romanization keeps results readable to
// English-speaking fans (everyone knows "Kim", almost nobody recognizes
// the RR-correct "Gim").
const SURNAME_OVERRIDES = {
  // 1-syllable surnames
  "김": "Kim",
  "이": "Lee",
  "박": "Park",
  "최": "Choi",
  "정": "Jung",
  "강": "Kang",
  "조": "Cho",
  "윤": "Yoon",
  "장": "Jang",
  "임": "Lim",
  "한": "Han",
  "신": "Shin",
  "오": "Oh",
  "서": "Seo",
  "권": "Kwon",
  "황": "Hwang",
  "안": "Ahn",
  "송": "Song",
  "류": "Ryu",
  "유": "Yoo",
  "홍": "Hong",
  "전": "Jeon",
  "고": "Ko",
  "문": "Moon",
  "손": "Son",
  "양": "Yang",
  "배": "Bae",
  "백": "Baek",
  "허": "Heo",
  "노": "Noh",
  "남": "Nam",
  "심": "Shim",
  "구": "Koo",
  "곽": "Kwak",
  "성": "Seong",
  "차": "Cha",
  "주": "Joo",
  "우": "Woo",
  "민": "Min",
  "나": "Na",
  "라": "Ra",
  "변": "Byun",
  "지": "Ji",
  "엄": "Eom",
  "원": "Won",
  "방": "Bang",
  "천": "Cheon",
  "공": "Kong",
  "현": "Hyun",
  "함": "Ham",
  "여": "Yeo",
  "염": "Yeom",
  "추": "Choo",
  "도": "Do",
  "소": "So",
  "석": "Seok",
  "선": "Seon",
  "설": "Seol",
  "마": "Ma",
  "길": "Gil",
  "위": "Wi",
  "표": "Pyo",
  "명": "Myung",
  "기": "Ki",
  "반": "Ban",
  "왕": "Wang",
  "금": "Geum",
  "옥": "Ok",
  "육": "Yook",
  "인": "In",
  "맹": "Maeng",
  "제": "Je",
  "탁": "Tak",
  "국": "Kook",
  "어": "Eo",
  "은": "Eun",
  "편": "Pyeon",
  "용": "Yong",
  "예": "Ye",
  "경": "Kyung",
  "봉": "Bong",
  "사": "Sa",
  "부": "Boo",
  "가": "Ka",
  "복": "Bok",
  "태": "Tae",
  "목": "Mok",
  "을": "Eul",
  "묵": "Muk",
  "화": "Hwa",
  "범": "Beom",
  "골": "Gol",
};

// Two-syllable Korean surnames. Order matters — checked before single
// syllable so "남궁" never gets parsed as 남 + 궁이름.
const TWO_SYLLABLE_SURNAMES = {
  "남궁": "Namgung",
  "황보": "Hwangbo",
  "제갈": "Jegal",
  "사공": "Sagong",
  "선우": "Sunwoo",
  "독고": "Dokko",
  "동방": "Dongbang",
  "서문": "Seomun",
  "어금": "Eogeum",
  "장곡": "Janggok",
  "강전": "Gangjeon",
  "소봉": "Sobong",
};

function isHangulSyllable(ch) {
  const code = ch.codePointAt(0);
  return code !== undefined && code >= HANGUL_BASE && code <= HANGUL_END;
}

/** Decompose a single Hangul syllable into [initial, vowel, final] indices. */
function decompose(syllable) {
  const code = syllable.codePointAt(0) - HANGUL_BASE;
  const initial = Math.floor(code / (VOWEL_COUNT * FINAL_COUNT));
  const vowel = Math.floor((code % (VOWEL_COUNT * FINAL_COUNT)) / FINAL_COUNT);
  const final = code % FINAL_COUNT;
  return { initial, vowel, final };
}

/** Romanize a single syllable using Revised Romanization tables. */
export function romanizeSyllable(syllable) {
  if (!isHangulSyllable(syllable)) return syllable;
  const { initial, vowel, final } = decompose(syllable);
  return INITIALS[initial] + VOWELS[vowel] + FINALS[final];
}

/** Romanize a multi-syllable string by joining each syllable's RR form. */
export function romanizeBlock(block) {
  let out = "";
  for (const ch of block) {
    out += romanizeSyllable(ch);
  }
  return out;
}

function titleCase(token) {
  if (!token) return "";
  return token.charAt(0).toUpperCase() + token.slice(1).toLowerCase();
}

/**
 * Romanize a Korean fighter's full name into "Given Surname" form.
 *
 * Returns null if the name does not look like a Korean Hangul name.
 */
export function romanizeKoreanName(rawName) {
  if (!rawName) return null;
  const name = rawName.trim();
  if (!name) return null;

  // Strip whitespace inside the name; some records have "강 현욱" or
  // "강 현 욱" — we treat it as a single block.
  const compact = name.replace(/\s+/g, "");
  if (compact.length === 0) return null;

  // Reject anything that contains non-Hangul characters — we don't want
  // to mangle names that are already Latin (e.g. "Sander Silva").
  for (const ch of compact) {
    if (!isHangulSyllable(ch)) return null;
  }

  if (compact.length < 2) {
    // Single-syllable "name" — most likely an alias, not a real name.
    // Romanize it as one token rather than guessing surname/given.
    return titleCase(romanizeBlock(compact));
  }

  // Try a 2-syllable surname first.
  const twoSyl = compact.slice(0, 2);
  if (TWO_SYLLABLE_SURNAMES[twoSyl]) {
    const surname = TWO_SYLLABLE_SURNAMES[twoSyl];
    const given = compact.slice(2);
    if (given.length === 0) return surname;
    const givenRoman = titleCase(romanizeBlock(given));
    return `${givenRoman} ${surname}`;
  }

  // Single-syllable surname.
  const surnameSyl = compact.slice(0, 1);
  const surname = SURNAME_OVERRIDES[surnameSyl] ?? titleCase(romanizeSyllable(surnameSyl));
  const given = compact.slice(1);
  if (given.length === 0) return surname;
  const givenRoman = titleCase(romanizeBlock(given));
  return `${givenRoman} ${surname}`;
}

/**
 * Normalize the Korean form of a fighter name to the "성이름" (no spaces)
 * convention requested for `name_ko`. Latin names are returned as-is.
 */
export function normalizeKoreanName(rawName) {
  if (!rawName) return null;
  const name = rawName.trim();
  if (!name) return null;
  // If the name has any non-Hangul char, leave it untouched.
  for (const ch of name.replace(/\s+/g, "")) {
    if (!isHangulSyllable(ch)) return name;
  }
  return name.replace(/\s+/g, "");
}
