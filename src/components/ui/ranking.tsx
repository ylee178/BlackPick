import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

/* ── Rank color ── */

export function getRankColorClass(rank: number) {
  if (rank === 1) return "text-[var(--bp-accent)]";
  if (rank <= 3) return "text-white";
  return "text-[var(--bp-muted)]";
}

/* ── Delta indicator ── */

export function RankDelta({ value }: { value: number | "new" | null }) {
  if (value === "new") {
    return (
      <span className="rounded-[4px] bg-[var(--bp-accent-dim)] px-1.5 py-0.5 text-[9px] font-bold text-[var(--bp-accent)]">
        NEW
      </span>
    );
  }
  if (value === null || value === 0) {
    return <span className="text-[10px] text-[var(--bp-muted)] opacity-40">{"\u2014"}</span>;
  }
  if (value > 0) {
    return (
      <span className="flex items-center gap-0.5 text-[10px] font-semibold text-[var(--bp-success)]">
        <svg viewBox="0 0 8 8" className="h-2 w-2" fill="currentColor"><path d="M4 0l3 5H1z" /></svg>
        {value}
      </span>
    );
  }
  return (
    <span className="flex items-center gap-0.5 text-[10px] font-semibold text-[var(--bp-danger)]">
      <svg viewBox="0 0 8 8" className="h-2 w-2" fill="currentColor"><path d="M4 8L1 3h6z" /></svg>
      {Math.abs(value)}
    </span>
  );
}

/* ── Compact ranking row (sidebar / mini cards) ── */

export function RankingRowCompact({
  rank,
  delta,
  name,
  value,
  unknownLabel,
}: {
  rank: number;
  delta?: number | null;
  name: string | null;
  value: string | number;
  unknownLabel: string;
}) {
  return (
    <div className="flex items-center justify-between gap-2 rounded-[8px] px-2.5 py-1.5 odd:bg-[var(--bp-card-inset)]">
      <div className="flex items-center gap-2 min-w-0">
        <span className={cn("w-5 text-center text-[11px] font-bold", getRankColorClass(rank))}>
          {rank}
        </span>
        {delta !== undefined ? <RankDelta value={delta} /> : null}
        <p className="truncate text-sm text-[var(--bp-ink)]">{name || unknownLabel}</p>
      </div>
      <span className="text-sm font-bold tabular-nums text-[var(--bp-accent)]">{value}</span>
    </div>
  );
}

/* ── Full ranking row (ranking page) ── */

export function RankingRowFull({
  rank,
  delta,
  name,
  record,
  score,
  unknownLabel,
  extra,
}: {
  rank: number;
  delta?: number | "new" | null;
  name: string | null;
  record: string;
  score: string | number;
  unknownLabel: string;
  extra?: ReactNode;
}) {
  return (
    <div className="flex items-center gap-3 rounded-[10px] border border-[var(--bp-line)] bg-[var(--bp-card-inset)] p-3 sm:p-4">
      <div className="flex w-12 flex-col items-center gap-0.5">
        <span className={cn("text-xs font-bold", getRankColorClass(rank))}>
          #{rank}
        </span>
        {delta !== undefined ? <RankDelta value={delta ?? null} /> : null}
      </div>

      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-[var(--bp-ink)]">
          {name || unknownLabel}
        </p>
        <p className="mt-0.5 text-xs text-[var(--bp-muted)]">{record}</p>
      </div>

      {extra}

      <p className="text-lg font-bold text-[var(--bp-accent)]">{score}</p>
    </div>
  );
}
