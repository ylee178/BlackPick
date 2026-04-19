import { describe, expect, it } from "vitest";
import { parseBcFighterProfileHtml, parseBcRankingsHtml } from "./bc-rankings";

/**
 * Fixture matches the exact markup shape observed on
 * `https://blackcombat-official.com/ranking.php` on 2026-04-19. Indent /
 * whitespace preserved because the BC template renders that way and the
 * parser's text-extraction pipeline trims it — keeping it literal in
 * tests catches regressions where someone switches to a brittle
 * selector.
 */
const FIXTURE_RANKING_HTML = `
<html>
<body>
<div class="ranking_list">

  <!-- Flyweight: champion with fighter + 2 ranked -->
  <div class="ranking_list_part fly">
    <div class="ranking_list_part_champ" onclick="location.href='https://blackcombat-official.com/fighter/71657127';">
      <h3>
        <span class="weight">플라이급</span>
        <span class="champ">CHAMPION</span>
      </h3>
      <div class="ranking_champ_name">
        <span class="fi fi-jp"></span>
        <span class="fighter_name">탱크</span>
      </div>
    </div>
    <div class="ranking_list_part_item " onclick="location.href='https://blackcombat-official.com/fighter/86478580';">
      <div class="ranking_list_num">1</div>
      <div class="ranking_list_name">
        <div>
          <span class="fi fi-br"></span>
          <span class="fighter_name">인디언킹</span>
        </div>
      </div>
    </div>
    <div class="ranking_list_part_item " onclick="location.href='https://blackcombat-official.com/fighter/73873103';">
      <div class="ranking_list_num">2</div>
      <div class="ranking_list_name">
        <div>
          <span class="fi fi-kr"></span>
          <span class="fighter_name">우마왕</span>
        </div>
      </div>
    </div>
  </div>

  <!-- Welterweight: vacant title (empty champ, no onclick) + 1 ranked -->
  <div class="ranking_list_part welter">
    <div class="ranking_list_part_champ">
      <h3>
        <span class="weight">웰터급</span>
        <span class="champ"></span>
      </h3>
      <div class="ranking_champ_name"></div>
    </div>
    <div class="ranking_list_part_item " onclick="location.href='https://blackcombat-official.com/fighter/99999999';">
      <div class="ranking_list_num">1</div>
      <div class="ranking_list_name">
        <div>
          <span class="fi fi-kr"></span>
          <span class="fighter_name">웰터후보</span>
        </div>
      </div>
    </div>
  </div>

  <!-- Defensive: item with unparseable rank_num falls through, not throws -->
  <div class="ranking_list_part bantam">
    <div class="ranking_list_part_champ" onclick="location.href='https://blackcombat-official.com/fighter/98660587';">
      <h3>
        <span class="weight">밴텀급</span>
        <span class="champ">CHAMPION</span>
      </h3>
      <div class="ranking_champ_name">
        <span class="fighter_name">투신</span>
      </div>
    </div>
    <div class="ranking_list_part_item " onclick="location.href='https://blackcombat-official.com/fighter/11111111';">
      <div class="ranking_list_num">999</div>
      <div class="ranking_list_name">
        <div><span class="fighter_name">범위초과</span></div>
      </div>
    </div>
    <div class="ranking_list_part_item " onclick="">
      <div class="ranking_list_num">3</div>
      <div class="ranking_list_name">
        <div><span class="fighter_name">onclick없음</span></div>
      </div>
    </div>
  </div>

  <!-- Defensive: champion block with a non-fighter href (e.g. event link
       mistakenly placed on the champ card). extractFighterSeq regex
       /\/fighter\/(\d+)/ must miss, resulting in no emitted entry. -->
  <div class="ranking_list_part feather">
    <div class="ranking_list_part_champ" onclick="location.href='https://blackcombat-official.com/event/123';">
      <h3>
        <span class="weight">페더급</span>
        <span class="champ">CHAMPION</span>
      </h3>
      <div class="ranking_champ_name">
        <span class="fighter_name">비정규href</span>
      </div>
    </div>
  </div>

</div>
</body>
</html>
`;

describe("parseBcRankingsHtml", () => {
  it("extracts champion with fighter seq", () => {
    const result = parseBcRankingsHtml(FIXTURE_RANKING_HTML);
    const flyChamp = result.entries.find(
      (e) => e.weightClass === "플라이급" && e.kind === "champion",
    );
    expect(flyChamp).toBeDefined();
    expect(flyChamp?.sourceFighterId).toBe("71657127");
    expect(flyChamp?.position).toBeNull();
    expect(flyChamp?.displayName).toBe("탱크");
  });

  it("extracts ranked positions with seq + rank number", () => {
    const result = parseBcRankingsHtml(FIXTURE_RANKING_HTML);
    const flyRanked = result.entries.filter(
      (e) => e.weightClass === "플라이급" && e.kind === "ranked",
    );
    expect(flyRanked).toHaveLength(2);
    expect(flyRanked[0]).toMatchObject({
      sourceFighterId: "86478580",
      position: 1,
      displayName: "인디언킹",
    });
    expect(flyRanked[1]).toMatchObject({
      sourceFighterId: "73873103",
      position: 2,
    });
  });

  it("drops vacant champion blocks (empty champ text AND no onclick)", () => {
    const result = parseBcRankingsHtml(FIXTURE_RANKING_HTML);
    const welterChamp = result.entries.find(
      (e) => e.weightClass === "웰터급" && e.kind === "champion",
    );
    expect(welterChamp).toBeUndefined();
    // But the division IS still listed as seen, so ranks in that
    // division can be reset by the sync script.
    expect(result.divisionsSeen).toContain("웰터급");
    // And ranked items in that division still parse.
    const welterRanked = result.entries.find(
      (e) => e.weightClass === "웰터급" && e.kind === "ranked",
    );
    expect(welterRanked?.sourceFighterId).toBe("99999999");
  });

  it("drops ranked items with out-of-range rank_num", () => {
    const result = parseBcRankingsHtml(FIXTURE_RANKING_HTML);
    const outOfRange = result.entries.find((e) => e.displayName === "범위초과");
    expect(outOfRange).toBeUndefined();
  });

  it("drops ranked items with missing onclick href", () => {
    const result = parseBcRankingsHtml(FIXTURE_RANKING_HTML);
    const missingHref = result.entries.find((e) => e.displayName === "onclick없음");
    expect(missingHref).toBeUndefined();
  });

  it("reports every division seen, in DOM order", () => {
    const result = parseBcRankingsHtml(FIXTURE_RANKING_HTML);
    expect(result.divisionsSeen).toEqual(["플라이급", "웰터급", "밴텀급", "페더급"]);
  });

  it("drops champion blocks whose onclick points to a non-fighter URL", () => {
    const result = parseBcRankingsHtml(FIXTURE_RANKING_HTML);
    const irregularHref = result.entries.find(
      (e) => e.displayName === "비정규href",
    );
    expect(irregularHref).toBeUndefined();
    // But the 페더급 division is still listed as seen, so its other
    // entries (had any parsed) would still be processed normally.
    expect(result.divisionsSeen).toContain("페더급");
  });

  it("returns empty result without throwing on malformed HTML", () => {
    const result = parseBcRankingsHtml("<html><body><div>nothing ranked</div></body></html>");
    expect(result.entries).toEqual([]);
    expect(result.divisionsSeen).toEqual([]);
  });

  it("returns empty result on empty input", () => {
    const result = parseBcRankingsHtml("");
    expect(result.entries).toEqual([]);
    expect(result.divisionsSeen).toEqual([]);
  });
});

describe("parseBcFighterProfileHtml", () => {
  it("extracts real name + ring name from canonical markup", () => {
    // Shape from /fighter/98660587 (투신) observed 2026-04-19.
    const html = `
      <div class="data_name">
        <span class="fi fi-kr"></span> 김재웅<br />
        <span class="data_ringname">"투신"</span>
        <span class="data_age">AGE : 33</span>
      </div>`;
    const result = parseBcFighterProfileHtml(html);
    expect(result.displayName).toBe("김재웅");
    expect(result.ringName).toBe("투신");
  });

  it("strips curly/typographic quotes from ring name", () => {
    const html = `
      <div class="data_name">
        <span class="fi fi-br"></span> Gabriel Rodrigues<br />
        <span class="data_ringname">“인디언킹”</span>
      </div>`;
    const result = parseBcFighterProfileHtml(html);
    expect(result.displayName).toBe("Gabriel Rodrigues");
    expect(result.ringName).toBe("인디언킹");
  });

  it("returns nulls when data_name is absent (defensive)", () => {
    const result = parseBcFighterProfileHtml("<html><body>empty</body></html>");
    expect(result).toEqual({ displayName: null, ringName: null });
  });

  it("handles missing ring name (rookie profile) without error", () => {
    const html = `
      <div class="data_name">
        <span class="fi fi-kr"></span> 이유하
      </div>`;
    const result = parseBcFighterProfileHtml(html);
    expect(result.displayName).toBe("이유하");
    expect(result.ringName).toBeNull();
  });
});
