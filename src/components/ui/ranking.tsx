import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { ChevronUp, ChevronDown, Trophy } from "lucide-react";
import { RetroLabel } from "@/components/ui/retro";

/* ── Rank color ── */

export function getRankColorClass(rank: number) {
  if (rank === 1) return "text-[var(--bp-accent)]";
  if (rank <= 3) return "text-white";
  return "text-[var(--bp-muted)]";
}

/* ── Rank display — always "#N" ── */

export function RankBadge({ rank }: { rank: number }) {
  return (
    <span className={cn("text-xs font-bold tabular-nums", getRankColorClass(rank))}>
      #{rank}
    </span>
  );
}

/* ── Score display — trophy icon + value ── */

export function ScoreValue({ value, className }: { value: string | number; className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-1 font-bold tabular-nums text-[var(--bp-accent)]", className)}>
      <Trophy className="h-3.5 w-3.5" strokeWidth={2} />
      {value}
    </span>
  );
}

/* ── Delta indicator ── */

export function RankDelta({ value }: { value: number | "new" | null }) {
  if (value === "new") {
    return (
      <RetroLabel size="sm" tone="accent">NEW</RetroLabel>
    );
  }
  if (value === null || value === 0) {
    return <span className="text-xs text-[var(--bp-muted)] opacity-40">{"\u2014"}</span>;
  }
  if (value > 0) {
    return (
      <span className="inline-flex items-center gap-0.5 text-xs font-semibold text-[var(--bp-success)]">
        <ChevronUp className="h-3 w-3" strokeWidth={2.5} />
        <span>{value}</span>
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-0.5 text-xs font-semibold text-[var(--bp-danger)]">
      <ChevronDown className="h-3 w-3" strokeWidth={2.5} />
      <span>{Math.abs(value)}</span>
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
  value: React.ReactNode;
  unknownLabel: string;
}) {
  return (
    <div className="flex items-center justify-between gap-2 rounded-[8px] px-2.5 py-1.5 odd:bg-[var(--bp-card-inset)]">
      <div className="flex items-center gap-2 min-w-0">
        <span className="w-6 text-center"><RankBadge rank={rank} /></span>
        {delta !== undefined ? <span className="flex w-8 shrink-0 justify-center"><RankDelta value={delta} /></span> : null}
        <p className="truncate text-sm text-[var(--bp-ink)]">{name || unknownLabel}</p>
      </div>
      <ScoreValue value={value as string | number} className="text-sm" />
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
        <RankBadge rank={rank} />
        {delta !== undefined ? <RankDelta value={delta ?? null} /> : null}
      </div>

      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-[var(--bp-ink)]">
          {name || unknownLabel}
        </p>
        <p className="mt-0.5 text-xs text-[var(--bp-muted)]">{record}</p>
      </div>

      {extra}

      <ScoreValue value={score} className="text-lg" />
    </div>
  );
}
