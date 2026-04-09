import { describe, expect, it } from "vitest";
import {
  findFighterPixelFilename,
  getFighterPixelPublicUrl,
  hasFighterPixelFile,
  listFighterPixelFilenames,
} from "./pixel-files";

describe("pixel avatar resolution", () => {
  const fighterId = "11111111-1111-1111-1111-111111111111";
  const otherFighterId = "22222222-2222-2222-2222-222222222222";
  const pixelFiles = new Set([
    `${fighterId}_v4.png`,
    `${fighterId}_v2.png`,
    `${fighterId}.png`,
    `${otherFighterId}_v3.png`,
  ]);

  it("prefers the manually curated base png over generated versions", () => {
    expect(findFighterPixelFilename(fighterId, pixelFiles)).toBe(`${fighterId}.png`);
    expect(getFighterPixelPublicUrl(fighterId, pixelFiles)).toBe(`/fighters/pixel/${fighterId}.png`);
  });

  it("falls back to the highest generated version when no base png exists", () => {
    expect(findFighterPixelFilename(otherFighterId, pixelFiles)).toBe(`${otherFighterId}_v3.png`);
  });

  it("returns all known variants in priority order", () => {
    expect(listFighterPixelFilenames(fighterId, pixelFiles)).toEqual([
      `${fighterId}.png`,
      `${fighterId}_v4.png`,
      `${fighterId}_v2.png`,
    ]);
  });

  it("reports when no fighter pixel art exists", () => {
    expect(hasFighterPixelFile("33333333-3333-3333-3333-333333333333", pixelFiles)).toBe(false);
    expect(getFighterPixelPublicUrl("33333333-3333-3333-3333-333333333333", pixelFiles)).toBeNull();
  });
});
