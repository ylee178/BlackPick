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

function hasNonLatin(value: string | null): boolean {
  return !!value && /[가-힣\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FFF]/.test(value);
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

/* ── Ring name translations (Korean loanwords → original English) ── */
const RING_NAME_MAP: Record<string, string> = {
  // Animals & creatures
  "불독": "Bulldog", "타이거": "Tiger", "바이퍼": "Viper", "팔콘": "Falcon",
  "피트불": "Pitbull", "핏불": "Pitbull", "매드독": "Mad Dog", "매드카우": "Mad Cow",
  "코브라": "Cobra", "판다": "Panda", "레오파드": "Leopard", "레오파파": "Leopapa",
  "울프": "Wolf", "울프갱": "Wolfgang", "울프킹": "Wolf King", "웨어울프": "Werewolf",
  "이글": "Eagle", "호크": "Hawk", "베어": "Bear", "라이온": "Lion",
  "샤크": "Shark", "스콜피온": "Scorpion", "드래곤": "Dragon", "피닉스": "Phoenix",
  "맘바": "Mamba", "재규어": "Jaguar", "고릴라": "Gorilla", "아기고릴라": "Baby Gorilla",
  "맘모스": "Mammoth", "코뿔소": "Rhino", "피라냐": "Piranha", "크로커다일": "Crocodile",
  "호넷": "Hornet", "맨티스": "Mantis", "스패로우": "Sparrow", "스파이더": "Spider",
  "파이톤": "Python", "베놈": "Venom", "포이즌": "Poison", "슬로스": "Sloth",
  "슬라임": "Slime", "라텔": "Ratel", "예티": "Yeti", "펜리르": "Fenrir",
  "다이노": "Dino", "그루트": "Groot", "타우르스": "Taurus", "티그로": "Tigro",
  "킹콩": "King Kong", "킹 베어": "King Bear", "동키콩": "Donkey Kong",
  "흑수리": "Black Eagle", "금사자": "Golden Lion", "흑랑": "Black Wolf",
  "흑곰": "Black Bear", "흑사자": "Black Lion", "흑호": "Black Tiger",
  "북경사자": "Beijing Lion", "화이트 베어": "White Bear", "화이트 타이거": "White Tiger",
  "레이징불": "Raging Bull", "블랙맘바": "Black Mamba", "블랙샤크": "Black Shark",
  "블랙옥스": "Black Ox", "황제펭귄": "Emperor Penguin",
  "쿠르드 이글": "Kurdish Eagle", "코리안리노": "Korean Rhino",
  // Fighter archetypes & roles
  "세비지": "Savage", "너드": "Nerd", "스나이퍼": "Sniper", "헤머": "Hammer",
  "쉐도우": "Shadow", "아이언피스트": "Iron Fist", "아이언 호스": "Iron Horse",
  "아이언": "Iron", "아이언 스파이더": "Iron Spider", "아이언 힙": "Iron Hip",
  "팬텀": "Phantom", "프레데터": "Predator", "버서커": "Berserker",
  "디스트로이어": "Destroyer", "터미네이터": "Terminator", "글래디에이터": "Gladiator",
  "워리어": "Warrior", "헌터": "Hunter", "헌츠맨": "Huntsman", "킬러": "Killer",
  "도살자": "Butcher", "파이터": "Fighter", "챔프": "Champ", "킹": "King",
  "보스": "Boss", "캡틴": "Captain", "솔저": "Soldier", "나이트": "Knight",
  "스파르탄": "Spartan", "히어로": "Hero", "히트맨": "Hitman", "빌런차": "Villain",
  "프린스": "Prince", "조커": "Joker", "사이보그": "Cyborg", "몬스터": "Monster",
  "몬스터 블랙": "Monster Black", "피니셔": "Finisher", "프리즌": "Prison",
  "원펀맨": "One Punch Man", "탱크": "Tank", "스컬": "Skull",
  "스펙터": "Specter", "그리드": "Greed", "아레스": "Ares", "아머": "Armor",
  "포세이돈": "Poseidon", "타노스": "Thanos", "데드풀": "Deadpool",
  "앤트맨": "Ant-Man", "울버린": "Wolverine", "팩맨": "Pac-Man",
  "마인부우": "Majin Buu", "리바이": "Levi", "피에로": "Pierrot",
  "페이퍼": "Paper", "킹스터": "Kingster",
  // Descriptors & modifiers
  "플래시": "Flash", "스톰": "Storm", "블레이즈": "Blaze", "블리자드": "Blizzard",
  "썬더": "Thunder", "라이트닝": "Lightning", "파이어": "Fire",
  "아이스": "Ice", "아이스맨": "Iceman", "다크": "Dark", "레드": "Red",
  "블랙": "Black", "골드": "Gold", "레이저": "Laser", "로만틱": "Romantic",
  "노블레스": "Noblesse", "글로리": "Glory", "체크메이트": "Checkmate",
  "블레스드": "Blessed", "블루데빌": "Blue Devil", "블루마린": "Blue Marine",
  "블랙리스트": "Blacklist", "블랙콩": "Black Kong",
  "블랙 다이아몬드": "Black Diamond", "더 다이아몬드": "The Diamond",
  "더 마스터": "The Master", "더 스페이스": "The Space",
  "더 예거": "The Jäger", "더 퍼니셔": "The Punisher", "더 퍼지": "The Purge",
  "더 하운드": "The Hound", "다이 하드 스피릿": "Die Hard Spirit",
  "골든보이": "Golden Boy", "프레셔맨": "Pressure Man",
  // Misc – Korean-origin or proper names (keep transliterated)
  "루키": "Rookie", "파라오": "Pharaoh", "사무라이": "Samurai", "무사시": "Musashi",
  "닌자": "Ninja", "사쿠라": "Sakura", "니카": "Nika", "닉스": "Nyx",
  "오공": "Goku", "젤메": "Jelme", "제베": "Jebe", "보오르추": "Bo'orchu",
  "보로클": "Borokul", "칠라운": "Chilaun", "무칼리": "Mukhali",
  "수부타이": "Subutai", "쿠빌라이": "Kublai", "몽고 장군": "Mongol General",
  "금도장군": "Gold General", "살만칸": "Salmankhan",
  "가린샤": "Garrincha", "구아라": "Guará", "고스트": "Ghost",
  "락스톤": "Rockstone", "머큐리": "Mercury", "몽크": "Monk", "모카": "Mocha",
  "러시안 레슬러": "Russian Wrestler", "마린복서": "Marine Boxer",
  "드러머": "Drummer", "부기맨": "Boogeyman", "위스키": "Whiskey",
  "카우보이": "Cowboy", "컴뱃산타": "Combat Santa", "마우이": "Maui",
  "타잔": "Tarzan", "심슨": "Simpson", "로꼬": "Loco", "류크": "Ryuk",
  "사일러스": "Silas", "샤프": "Sharp",
  // Compound Korean ring names
  "코리안 갱스터": "Korean Gangster", "코리안 불도저": "Korean Bulldozer",
  "캡틴 코리아": "Captain Korea", "캡틴 히어로": "Captain Hero",
  "캡틴 중랑": "Captain Jungnang", "캡틴 하남": "Captain Hanam",
  "리틀 자이언트": "Little Giant", "아마존 키드": "Amazon Kid",
  "도메스틱 프린스": "Domestic Prince", "옐로우 몽키": "Yellow Monkey",
  "선더버드": "Thunderbird", "홀리 비스트": "Holy Beast",
  "드래곤 보이": "Dragon Boy", "청드래곤": "Blue Dragon",
  "바람의 파이터": "Wind Fighter", "탈북파이터": "Defector Fighter",
  "해적왕": "Pirate King", "인디언킹": "Indian King",
  "앵클브레이커": "Anklebreaker", "아이실드": "Eyeshield",
  "위버맨쉬": "Übermensch", "딜리버리맨": "Delivery Man",
  "한마 바키": "Hanma Baki", "진격의거인": "Attack on Titan",
  "미스터사탄": "Mr. Satan", "잔 다르크": "Joan of Arc",
  "킹덤 준수": "Kingdom Junsu",
  // Korean-native ring names (transliterate properly)
  "각시탈": "Gaksital", "까마귀": "Crow", "독사": "Viper",
  "불도저": "Bulldozer", "사신": "Reaper", "투견": "Fighting Dog",
  "투사": "Fighter", "투신": "Fighting God", "투혼": "Fighting Spirit", "투우": "Bullfight",
  "무사": "Musa", "야인": "Wildman", "야차": "Yaksha",
  "시라소니": "Lynx", "개미지옥": "Antlion", "붉은매": "Red Hawk",
  "백구": "Baekgu", "레드호크": "Red Hawk", "포텐": "Potential",
  "격노사": "Rage", "광견": "Mad Dog", "그레네이드": "Grenade",
  "방탄": "Bulletproof", "배드가이": "Bad Guy", "빅마우스": "Big Mouth",
  "불괴": "Indestructible", "브루스": "Bruce", "스톤골렘": "Stone Golem",
  "언더독": "Underdog", "참수": "Executioner",
  "노빠꾸": "No Ppakku", "빡세": "Ppak Se",
  // Korean compound words — translate meaning (verified on Tapology/Sherdog/BC broadcast)
  "곰주먹": "Bear Fist", "독주먹": "Poison Fist", "돌주먹": "Stone Fist",
  "쌍칼": "Dual Blades", "엄지장군": "General Thumb", "대갈장군": "General Headbutt",
  "선봉장": "Vanguard", "주먹대장": "Fist Captain", "우마왕": "Bull Demon King",
  "난릉왕": "King of Nanling", "도깨비발": "Goblin Kick",
  "낮도깨비": "Day Goblin", "뇌진자": "Brain Shaker", "비밀병희": "Secret Weapon",
  "영어쌔신": "English Assassin", "영타이거": "Young Tiger", "영보스": "Young Boss",
  "흑자": "Black Panther",
  // Korean-native names — romanized as-is (proper names, slang, unique coinages)
  "가라데": "Karate", "갓균": "Gat Gyun", "광남": "Gwangnam",
  "극기": "Geukgi", "김관장": "Kim Gwanjang", "김첨지": "Kim Cheomji",
  "동백": "Dongbaek", "돌멩이": "Dolmengi", "땅꾼": "Ttangkkun",
  "뚝배기사범": "Ttukbaegi Sabeom", "라온": "Raon", "마카최프": "Maka Choif",
  "박조교": "Park Jogyo", "박프로": "Park Pro", "빡상": "Ppak Sang",
  "사도": "Sado", "손오찬": "Son Ochan", "알밤": "Albam",
  "오뚝이": "Ottuki", "윤방관": "Yun Banggwan", "장산": "Jangsan",
  "진랑": "Jinnang", "짱구": "Jjanggu", "짱돌": "Jjangdol",
  "찐홍이": "Jjin Hongi", "최선생": "Choi Seonsaeng", "최암바": "Choi Armbar",
  "태산아빠": "Taesan Appa", "퉁순이": "Tungsuni", "하나": "Hana",
  "하모": "Hamo", "호이리에": "Hoirie", "황빠따": "Hwang Ppatta",
  // Loanwords & established terms
  "버드와이저": "Budweiser", "앤쵸비": "Anchovy", "아수라": "Asura",
  "오리진": "Origin", "오프로": "O-Pro", "유도가": "Judoka",
  "유짓수": "Jiu-Jitsu", "임베일": "Impale", "잇뽕": "Ippon",
  "잉카": "Inca", "직쏘": "Jigsaw", "찬스": "Chance", "창스": "Chang's",
  "키라": "Kira", "트윈스": "Twins", "허니허니": "Honey Honey",
  "조선알도": "Joseon Aldo", "중학생": "Middle Schooler",
  // Japanese ring names
  "サムライ": "Samurai", "雷神": "Raijin", "忍者": "Ninja",
};

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

function translateKoreanRingName(value: string): string | null {
  return RING_NAME_MAP[value] ?? null;
}

function localizeNonKoreanText(value: string, locale: AppLocale): string {
  if (locale === "ko" || !hasNonLatin(value)) {
    return value;
  }

  // Check exact ring name match first (covers Korean + Japanese ring names)
  const exactMatch = translateKoreanRingName(value);
  if (exactMatch) return exactMatch;

  let localized = value;

  for (const [pattern, replacement] of KOREAN_PHRASE_MAP) {
    localized = localized.replace(pattern, replacement);
  }

  // Replace remaining Hangul words using ring name map, then romanize as fallback
  localized = localized.replace(/[가-힣]+/g, (match) => {
    return translateKoreanRingName(match) ?? titleCase(romanizeHangulWord(match));
  });

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

  // Ring name is always primary when available
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
