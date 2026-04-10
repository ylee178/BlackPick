import type { BcOfficialFight } from "@/lib/bc-official";

type FighterLike = {
  name: string | null;
  name_en?: string | null;
  name_ko?: string | null;
  ring_name?: string | null;
};

type FightLike = {
  start_time?: string | null;
  fighter_a: FighterLike;
  fighter_b: FighterLike;
};

function normalizeName(value: string | null | undefined) {
  return (value ?? "")
    .normalize("NFKC")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, "");
}

function normalizeLatinTokens(value: string | null | undefined) {
  return (value ?? "")
    .normalize("NFKC")
    .toLowerCase()
    .split(/[^\p{L}\p{N}]+/gu)
    .filter(Boolean)
    .sort()
    .join("__");
}

function fighterNames(fighter: FighterLike) {
  return [fighter.name, fighter.name_en, fighter.name_ko, fighter.ring_name].filter(Boolean) as string[];
}

function fighterMatchesOfficial(fighter: FighterLike, official: BcOfficialFight["fighterA"] | BcOfficialFight["fighterB"]) {
  const names = fighterNames(fighter);
  const normalizedOfficial = normalizeName(official.name);
  const normalizedOfficialTokens = normalizeLatinTokens(official.name);
  const normalizedOfficialRing = normalizeName(official.ringName);

  if (names.some((value) => normalizeName(value) === normalizedOfficial)) return true;
  if (
    normalizedOfficialTokens &&
    names.some((value) => normalizeLatinTokens(value) === normalizedOfficialTokens)
  ) {
    return true;
  }
  if (normalizedOfficialRing && normalizeName(fighter.ring_name) === normalizedOfficialRing) return true;
  return false;
}

function fightMatchesOfficial<T extends FightLike>(fight: T, official: BcOfficialFight) {
  return (
    (fighterMatchesOfficial(fight.fighter_a, official.fighterA) &&
      fighterMatchesOfficial(fight.fighter_b, official.fighterB)) ||
    (fighterMatchesOfficial(fight.fighter_a, official.fighterB) &&
      fighterMatchesOfficial(fight.fighter_b, official.fighterA))
  );
}

export function sortFightsByOfficialCardOrder<T extends FightLike>(
  fights: T[],
  officialFights: BcOfficialFight[],
) {
  if (fights.length === 0 || officialFights.length === 0) return fights;

  const remaining = [...fights];
  const sorted: T[] = [];

  for (const officialFight of officialFights) {
    const matchIndex = remaining.findIndex((fight) => fightMatchesOfficial(fight, officialFight));
    if (matchIndex === -1) continue;
    sorted.push(remaining.splice(matchIndex, 1)[0]);
  }

  return [...sorted, ...remaining];
}

export function getEarliestFightStart<T extends FightLike>(fights: T[]) {
  return fights.reduce<string | null>((earliest, fight) => {
    if (!fight.start_time) return earliest;
    if (!earliest) return fight.start_time;
    return new Date(fight.start_time).getTime() < new Date(earliest).getTime()
      ? fight.start_time
      : earliest;
  }, null);
}
