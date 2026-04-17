import type { BcScoreCard } from "@/lib/bc-official";
import { retroPanelClassName } from "@/components/ui/retro";
import { cn } from "@/lib/utils";

export type FightScoreCardLabels = {
  title: string;
  judge: string;
  total: string;
  roundLabel: (round: number) => string;
  overtime: string;
};

type Props = {
  scoreCard: BcScoreCard;
  fighterALabel: string;
  fighterBLabel: string;
  /**
   * DB-authoritative winner side. "draw" renders the card with both
   * columns neutral (valid state for split-decision draws). Never
   * `null` — the caller (`FightCard`) suppresses the component when
   * the scorecard or winner state is unavailable (spec v3 §L3).
   */
  winnerSide: "A" | "B" | "draw";
  labels: FightScoreCardLabels;
};

function formatTotal(score: number, penalty: number): string {
  if (penalty === 0) return String(score);
  return `${score} (-${penalty})`;
}

export default function FightScoreCard({
  scoreCard,
  fighterALabel,
  fighterBLabel,
  winnerSide,
  labels,
}: Props) {
  // Column R4 only renders if at least one referee flagged overtime
  // on either fighter side. Component-side guard — caller doesn't
  // need to pre-compute this.
  const showOvertime = scoreCard.referees.some(
    (ref) => ref.fighterA.overtime || ref.fighterB.overtime,
  );
  const roundCount = showOvertime ? 4 : 3;

  const aAccent = winnerSide === "A";
  const bAccent = winnerSide === "B";

  return (
    <section
      className={retroPanelClassName({
        tone: "flat",
        className: "mt-3 overflow-x-auto p-3 sm:p-4",
      })}
      aria-label={labels.title}
    >
      <div className="mb-2 flex items-center justify-between gap-2">
        <p className="text-xs font-bold uppercase tracking-[0.08em] text-[var(--bp-muted)]">
          {labels.title}
        </p>
        <p className="truncate text-right text-[11px] text-[var(--bp-muted)]">
          <span className={cn(aAccent && "font-semibold text-[var(--bp-accent)]")}>
            {fighterALabel}
          </span>
          <span className="mx-1">·</span>
          <span className={cn(bAccent && "font-semibold text-[var(--bp-accent)]")}>
            {fighterBLabel}
          </span>
        </p>
      </div>

      <table className="w-full border-collapse text-xs tabular-nums">
        <thead>
          <tr className="text-[var(--bp-muted)]">
            <th
              scope="col"
              className="border-b border-[var(--bp-line)] py-1.5 pr-2 text-left font-semibold uppercase tracking-[0.04em]"
            >
              {labels.judge}
            </th>
            {Array.from({ length: roundCount }, (_, i) => i + 1).map((round) => (
              <th
                key={round}
                scope="col"
                className="border-b border-[var(--bp-line)] px-1.5 py-1.5 text-center font-semibold uppercase tracking-[0.04em]"
              >
                {round === 4 ? labels.overtime : labels.roundLabel(round)}
              </th>
            ))}
            <th
              scope="col"
              className="border-b border-[var(--bp-line)] py-1.5 pl-2 text-right font-semibold uppercase tracking-[0.04em]"
            >
              {labels.total}
            </th>
          </tr>
        </thead>
        <tbody>
          {scoreCard.referees.map((ref, refIdx) => {
            // Per-row totals — each judge's total for A vs B is what
            // determines the visual weight on that row. The DB-
            // authoritative winner accent (aAccent/bAccent) sits in the
            // TOTAL column below the per-round breakdown.
            return (
              <tr
                key={`${ref.name}-${refIdx}`}
                className="border-b border-[var(--bp-line)]/60 last:border-b-0"
              >
                <th
                  scope="row"
                  className="py-1.5 pr-2 text-left font-semibold uppercase tracking-[0.04em] text-[var(--bp-ink)]"
                >
                  {ref.name}
                </th>
                {Array.from({ length: roundCount }, (_, i) => i).map((i) => {
                  const aScore = ref.fighterA.roundScores[i] ?? 0;
                  const aPenalty = ref.fighterA.roundPenalties[i] ?? 0;
                  const bScore = ref.fighterB.roundScores[i] ?? 0;
                  const bPenalty = ref.fighterB.roundPenalties[i] ?? 0;
                  return (
                    <td
                      key={i}
                      className="px-1.5 py-1.5 text-center text-[var(--bp-ink)]"
                    >
                      <span className={cn(aAccent && "text-[var(--bp-accent)] font-semibold")}>
                        {formatTotal(aScore, aPenalty)}
                      </span>
                      <span className="mx-0.5 text-[var(--bp-muted)]">·</span>
                      <span className={cn(bAccent && "text-[var(--bp-accent)] font-semibold")}>
                        {formatTotal(bScore, bPenalty)}
                      </span>
                    </td>
                  );
                })}
                <td className="py-1.5 pl-2 text-right font-bold text-[var(--bp-ink)]">
                  <span className={cn(aAccent && "text-[var(--bp-accent)]")}>
                    {ref.fighterA.total}
                  </span>
                  <span className="mx-1 text-[var(--bp-muted)]">·</span>
                  <span className={cn(bAccent && "text-[var(--bp-accent)]")}>
                    {ref.fighterB.total}
                  </span>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </section>
  );
}
