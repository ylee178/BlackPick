const PLACEHOLDER_ASSETS = [
  "/fighters/placeholders/red_hawk.png",
  "/fighters/placeholders/ko_gang.png",
  "/fighters/placeholders/rookie.png",
  "/fighters/placeholders/paraoh.png",
  "/fighters/placeholders/iron_horse.png",
] as const;

type FighterAvatarFields = {
  id?: string | null;
  name?: string | null;
  ring_name?: string | null;
  name_en?: string | null;
  name_ko?: string | null;
  image_url?: string | null;
};

type ExplicitAvatarMapping = {
  asset: (typeof PLACEHOLDER_ASSETS)[number];
  aliases: string[];
};

const EXPLICIT_MAPPINGS: ExplicitAvatarMapping[] = [
  {
    asset: "/fighters/placeholders/red_hawk.png",
    aliases: ["red hawk", "redhawk", "레드호크", "레드 호크"],
  },
  {
    asset: "/fighters/placeholders/ko_gang.png",
    aliases: ["ko gang", "kogang", "k.o gang", "k.o. gang", "코리안 갱스터", "korean gangster"],
  },
  {
    asset: "/fighters/placeholders/rookie.png",
    aliases: ["rookie"],
  },
  {
    asset: "/fighters/placeholders/paraoh.png",
    aliases: ["paraoh", "pharaoh", "파라오"],
  },
  {
    asset: "/fighters/placeholders/iron_horse.png",
    aliases: ["iron horse", "아이언 호스"],
  },
];

function normalizeKey(value?: string | null): string {
  return (value ?? "")
    .toLowerCase()
    .replace(/[^a-z0-9가-힣]+/g, " ")
    .trim()
    .replace(/\s+/g, " ");
}

function getStableHash(value: string): number {
  let hash = 0;

  for (let index = 0; index < value.length; index += 1) {
    hash = (hash * 31 + value.charCodeAt(index)) >>> 0;
  }

  return hash;
}

export function getFighterAvatarUrl(fighter: FighterAvatarFields | null | undefined): string | null {
  if (!fighter) return null;
  if (fighter.image_url) return fighter.image_url;

  const candidates = [
    fighter.ring_name,
    fighter.name_en,
    fighter.name_ko,
    fighter.name,
  ].map(normalizeKey).filter(Boolean);

  for (const candidate of candidates) {
    const matched = EXPLICIT_MAPPINGS.find((mapping) =>
      mapping.aliases.some((alias) => normalizeKey(alias) === candidate)
    );

    if (matched) {
      return matched.asset;
    }
  }

  const stableSeed =
    fighter.id?.trim() ||
    candidates[0] ||
    `${fighter.name ?? ""}-${fighter.ring_name ?? ""}-${fighter.name_en ?? ""}-${fighter.name_ko ?? ""}`;

  const index = getStableHash(stableSeed) % PLACEHOLDER_ASSETS.length;
  return PLACEHOLDER_ASSETS[index];
}
