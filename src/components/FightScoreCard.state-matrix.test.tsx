import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import FightScoreCard, { type FightScoreCardLabels } from "./FightScoreCard";
import type { BcRefereeScore, BcScoreCard } from "@/lib/bc-official";

const labels: FightScoreCardLabels = {
  title: "Scorecard",
  judge: "Judge",
  total: "Total",
  roundLabel: (round) => `R${round}`,
  overtime: "OT",
};

function makeRef(
  name: string,
  aScores: number[],
  bScores: number[],
  opts: { overtime?: boolean } = {},
): BcRefereeScore {
  const padded = (arr: number[]) => [arr[0] ?? 0, arr[1] ?? 0, arr[2] ?? 0, arr[3] ?? 0];
  const aRounds = padded(aScores);
  const bRounds = padded(bScores);
  const sum = (arr: number[]) => arr.reduce((acc, v) => acc + v, 0);
  return {
    name,
    fighterA: {
      roundScores: aRounds,
      roundPenalties: [0, 0, 0, 0],
      total: sum(aRounds),
      overtime: opts.overtime ?? false,
    },
    fighterB: {
      roundScores: bRounds,
      roundPenalties: [0, 0, 0, 0],
      total: sum(bRounds),
      overtime: opts.overtime ?? false,
    },
  };
}

describe("<FightScoreCard /> state matrix", () => {
  it("renders 3-referee full decision with winner accent on A", () => {
    const card: BcScoreCard = {
      referees: [
        makeRef("VEGETABLE", [10, 10, 10], [9, 9, 9]),
        makeRef("MASTER KIM", [10, 10, 10], [9, 8, 9]),
        makeRef("LOGAN", [10, 10, 10], [9, 9, 9]),
      ],
    };
    const { container } = render(
      <FightScoreCard
        scoreCard={card}
        fighterALabel="김명환"
        fighterBLabel="O'Shay"
        winnerSide="A"
        labels={labels}
      />,
    );

    // 3 referee rows rendered
    const refereeRows = container.querySelectorAll("tbody tr");
    expect(refereeRows).toHaveLength(3);
    expect(screen.getByText("VEGETABLE")).toBeInTheDocument();
    expect(screen.getByText("MASTER KIM")).toBeInTheDocument();
    expect(screen.getByText("LOGAN")).toBeInTheDocument();

    // Only R1/R2/R3 columns shown when no referee flagged overtime
    const headers = container.querySelectorAll("thead th");
    const headerText = Array.from(headers).map((h) => h.textContent);
    expect(headerText).toEqual(["Judge", "R1", "R2", "R3", "Total"]);
  });

  it("split decision — winnerSide from DB ('A') overrides numeric reading", () => {
    // Numerically this looks closer to B on one card, but the DB says A.
    // Component must NOT self-compute the winner; it just reflects DB.
    const card: BcScoreCard = {
      referees: [
        makeRef("J1", [10, 9, 10], [9, 10, 9]), // A 29 · B 28
        makeRef("J2", [9, 10, 9], [10, 9, 10]), // A 28 · B 29
        makeRef("J3", [10, 10, 9], [9, 9, 10]), // A 29 · B 28
      ],
    };
    const { container } = render(
      <FightScoreCard
        scoreCard={card}
        fighterALabel="Fighter A"
        fighterBLabel="Fighter B"
        winnerSide="A"
        labels={labels}
      />,
    );
    // Accent class `text-[var(--bp-accent)]` must appear somewhere.
    const accents = container.querySelectorAll('[class*="text-\\[var\\(--bp-accent\\)\\]"]');
    expect(accents.length).toBeGreaterThan(0);
    expect(container.textContent).toContain("Fighter A");
  });

  it("overtime — shows OT column when any referee overtime flag is set", () => {
    const card: BcScoreCard = {
      referees: [
        { ...makeRef("J1", [10, 10, 10, 10], [9, 9, 9, 9], { overtime: true }) },
        makeRef("J2", [10, 10, 10], [9, 9, 9]),
      ],
    };
    const { container } = render(
      <FightScoreCard
        scoreCard={card}
        fighterALabel="A"
        fighterBLabel="B"
        winnerSide="A"
        labels={labels}
      />,
    );
    const headers = Array.from(container.querySelectorAll("thead th")).map(
      (h) => h.textContent,
    );
    // R1 / R2 / R3 + OT column (overtime label) + Total
    expect(headers).toEqual(["Judge", "R1", "R2", "R3", "OT", "Total"]);
  });

  it("draw — renders both sides neutral (no accent)", () => {
    const card: BcScoreCard = {
      referees: [makeRef("J1", [10, 9, 10], [10, 9, 10])],
    };
    const { container } = render(
      <FightScoreCard
        scoreCard={card}
        fighterALabel="Fighter A"
        fighterBLabel="Fighter B"
        winnerSide="draw"
        labels={labels}
      />,
    );
    // No accent class should appear anywhere in the rendered tree.
    const accents = container.querySelectorAll('[class*="bp-accent"]');
    expect(accents.length).toBe(0);
  });

  it("all-zero referee row — renders without suppression (caller's job)", () => {
    const card: BcScoreCard = {
      referees: [makeRef("GHOST", [0, 0, 0], [0, 0, 0])],
    };
    const { container } = render(
      <FightScoreCard
        scoreCard={card}
        fighterALabel="A"
        fighterBLabel="B"
        winnerSide="A"
        labels={labels}
      />,
    );
    expect(screen.getByText("GHOST")).toBeInTheDocument();
    // Totals cell shows "0 · 0"
    const totalCell = within(container.querySelector("tbody tr")!)
      .getAllByRole("cell")
      .pop()!;
    expect(totalCell.textContent?.replace(/\s+/g, "")).toBe("0·0");
  });

  it("DB-BC disagreement — accents DB-winner even when BC totals favor the other side", () => {
    // Numeric majority favors B; DB says A won.
    const card: BcScoreCard = {
      referees: [
        makeRef("J1", [9, 9, 9], [10, 10, 10]), // A 27 · B 30
        makeRef("J2", [9, 9, 9], [10, 10, 10]), // A 27 · B 30
        makeRef("J3", [9, 9, 9], [10, 10, 10]), // A 27 · B 30
      ],
    };
    const { container } = render(
      <FightScoreCard
        scoreCard={card}
        fighterALabel="Fighter A"
        fighterBLabel="Fighter B"
        winnerSide="A"
        labels={labels}
      />,
    );
    // Fighter labels in the header carry the accent on A, not B.
    const aSpan = screen.getByText("Fighter A");
    const bSpan = screen.getByText("Fighter B");
    expect(aSpan.className).toContain("bp-accent");
    expect(bSpan.className).not.toContain("bp-accent");
  });
});
