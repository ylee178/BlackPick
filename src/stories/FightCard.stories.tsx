import type { Meta } from "@storybook/nextjs-vite";
import {
  RetroLabel,
  RetroStatusBadge,
  retroPanelClassName,
  retroChipClassName,
} from "@/components/ui/retro";
import { Check, Crown, MessageCircle, ChevronRight } from "lucide-react";

const meta: Meta = {
  title: "Components/FightCard",
  parameters: { layout: "centered" },
};
export default meta;

/*
 * FightCard is an async server component that cannot render in Storybook.
 * These stories recreate its visual structure with static mock data,
 * covering the key states: upcoming, live, completed (win/loss), and cancelled.
 */

/* ── Mock fighter data ── */
const fighterA = {
  name: "Dong-Hyun Kim",
  record: "18-5",
  nationality: "KR",
  initial: "K",
};
const fighterB = {
  name: "Yuta Watanabe",
  record: "12-3",
  nationality: "JP",
  initial: "W",
};

function FighterSide({
  fighter,
  isWinner,
  isLoser,
  isPicked,
  bcPct,
}: {
  fighter: typeof fighterA;
  isWinner?: boolean;
  isLoser?: boolean;
  isPicked?: boolean;
  bcPct?: number;
}) {
  const borderColor = isWinner
    ? "border-[rgba(34,197,94,0.25)] bg-[rgba(34,197,94,0.06)]"
    : isLoser
      ? "border-[var(--bp-line)] bg-[var(--bp-card-inset)] opacity-50"
      : isPicked
        ? "border-[rgba(229,169,68,0.3)] bg-[var(--bp-accent-dim)]"
        : "border-[var(--bp-line)] bg-[var(--bp-card-inset)]";

  const recordParts = fighter.record.split("-");

  return (
    <div className={`flex flex-1 flex-col items-center justify-center gap-2 rounded-[12px] border p-3 text-center ${borderColor}`}>
      <div className="flex h-14 w-14 items-center justify-center overflow-hidden rounded-full border-2 border-[var(--bp-line)] bg-[var(--bp-card)] sm:h-16 sm:w-16">
        <span className="text-base font-bold text-[var(--bp-muted)]">{fighter.initial}</span>
      </div>
      <div>
        <p className="text-sm font-bold text-[var(--bp-ink)]">
          {fighter.name} {fighter.nationality === "KR" ? "🇰🇷" : "🇯🇵"}
        </p>
        <p className="mt-0.5 text-xs text-[var(--bp-muted)]">
          {recordParts[0]}W {recordParts[1]}L
        </p>
      </div>
      {isPicked ? (
        <RetroLabel size="sm" tone="success" icon={<Check className="h-3 w-3" strokeWidth={2.5} />}>
          My Pick
        </RetroLabel>
      ) : isWinner ? (
        <RetroLabel size="sm" tone="gold">Win</RetroLabel>
      ) : null}
      {typeof bcPct === "number" ? (
        <div className="mt-1">
          <p className="text-lg font-extrabold tabular-nums text-[var(--bp-ink)]">
            {bcPct}<span className="text-xs font-semibold text-[var(--bp-muted)]">%</span>
          </p>
          <p className="text-xs text-[var(--bp-muted)]">Official Fan Poll</p>
        </div>
      ) : null}
    </div>
  );
}

function MockFightCard({
  index,
  status,
  statusTone,
  statusLabel,
  isMainEvent,
  isTitleFight,
  isMainCard,
  weightClass,
  seriesLabel,
  winnerId,
  pickedId,
  predictionResult,
  predictionScore,
  resultText,
  showPicker,
  bcPrediction,
}: {
  index: number;
  status: string;
  statusTone: "info" | "danger" | "success" | "neutral";
  statusLabel: string;
  isMainEvent?: boolean;
  isTitleFight?: boolean;
  isMainCard?: boolean;
  weightClass?: string;
  seriesLabel?: string;
  winnerId?: "a" | "b" | null;
  pickedId?: "a" | "b" | null;
  predictionResult?: "win" | "loss" | "pending" | null;
  predictionScore?: number | null;
  resultText?: string;
  showPicker?: boolean;
  bcPrediction?: { a: number; b: number } | null;
}) {
  return (
    <article className={retroPanelClassName({ className: "w-[420px] overflow-hidden p-3 sm:p-4" })}>
      {/* Header */}
      <div className="flex items-center justify-between gap-2">
        <span className="shrink-0 text-xs font-semibold text-[var(--bp-muted)]">
          Fight {String(index).padStart(2, "0")}
        </span>
        <div className="flex min-w-0 flex-1 flex-wrap items-center justify-end gap-1.5">
          {weightClass ? <span className={retroChipClassName({ tone: "neutral" })}>{weightClass}</span> : null}
          {seriesLabel ? <span className={retroChipClassName({ tone: "neutral" })}>{seriesLabel}</span> : null}
          {isMainEvent ? <RetroLabel size="md" tone="accent">MAIN EVENT</RetroLabel> : null}
          {isMainCard && !isMainEvent ? <RetroLabel size="md" tone="neutral">MAIN CARD</RetroLabel> : null}
          {isTitleFight ? (
            <RetroLabel
              size="md"
              tone="accent"
              icon={<Crown className="h-3.5 w-3.5" strokeWidth={2} />}
            >
              TITLE FIGHT
            </RetroLabel>
          ) : null}
          <RetroStatusBadge tone={statusTone}>{statusLabel}</RetroStatusBadge>
        </div>
      </div>

      {/* Fighter cards */}
      {showPicker ? (
        <div className="mt-3">
          <div className="flex flex-col items-stretch gap-2 sm:flex-row sm:gap-3">
            <div className="flex flex-1 cursor-pointer flex-col items-center justify-center gap-2 rounded-[12px] border border-[var(--bp-line)] bg-[var(--bp-card-inset)] p-3 text-center transition hover:border-[var(--bp-line-strong)]">
              <div className="flex h-14 w-14 items-center justify-center overflow-hidden rounded-full border-2 border-[var(--bp-line)] bg-[var(--bp-card)] sm:h-16 sm:w-16">
                <span className="text-base font-bold text-[var(--bp-muted)]">{fighterA.initial}</span>
              </div>
              <p className="text-sm font-bold text-[var(--bp-ink)]">{fighterA.name} 🇰🇷</p>
              <p className="text-xs text-[var(--bp-muted)]">18W 5L</p>
            </div>
            <div className="flex items-center justify-center px-1 py-1 sm:py-0">
              <span className="text-base font-black text-[var(--bp-accent)] sm:text-lg">VS</span>
            </div>
            <div className="flex flex-1 cursor-pointer flex-col items-center justify-center gap-2 rounded-[12px] border border-[var(--bp-line)] bg-[var(--bp-card-inset)] p-3 text-center transition hover:border-[var(--bp-line-strong)]">
              <div className="flex h-14 w-14 items-center justify-center overflow-hidden rounded-full border-2 border-[var(--bp-line)] bg-[var(--bp-card)] sm:h-16 sm:w-16">
                <span className="text-base font-bold text-[var(--bp-muted)]">{fighterB.initial}</span>
              </div>
              <p className="text-sm font-bold text-[var(--bp-ink)]">{fighterB.name} 🇯🇵</p>
              <p className="text-xs text-[var(--bp-muted)]">12W 3L</p>
            </div>
          </div>
          {/* Discussion link */}
          <div className="mt-3 flex cursor-pointer items-center justify-center gap-1.5 rounded-[8px] border border-[var(--bp-line)] bg-[var(--bp-card-inset)] px-3 py-2 text-xs font-medium text-[var(--bp-muted)] transition hover:border-[var(--bp-line-strong)] hover:bg-[var(--bp-card-hover)] hover:text-[var(--bp-ink)]">
            <MessageCircle className="h-3.5 w-3.5" strokeWidth={1.5} />
            Discussion
            <ChevronRight className="h-3 w-3" strokeWidth={2} />
          </div>
        </div>
      ) : (
        <>
          <div className="mt-3 flex flex-col items-stretch gap-2 sm:flex-row sm:gap-3">
            <FighterSide
              fighter={fighterA}
              isWinner={winnerId === "a"}
              isLoser={winnerId === "b"}
              isPicked={pickedId === "a"}
              bcPct={bcPrediction?.a}
            />
            <div className="flex items-center justify-center px-1 py-1 sm:py-0">
              <span className="text-base font-black text-[var(--bp-accent)] sm:text-lg">VS</span>
            </div>
            <FighterSide
              fighter={fighterB}
              isWinner={winnerId === "b"}
              isLoser={winnerId === "a"}
              isPicked={pickedId === "b"}
              bcPct={bcPrediction?.b}
            />
          </div>

          {/* Result bar */}
          <div className="mt-3 rounded-[10px] border border-[var(--bp-line)] bg-[var(--bp-card-inset)] px-3 py-2">
            <div className="flex items-center justify-between gap-2">
              <p className="text-xs text-[var(--bp-muted)]">{resultText}</p>
              {predictionResult ? (
                <RetroStatusBadge
                  tone={predictionResult === "win" ? "success" : predictionResult === "loss" ? "danger" : "neutral"}
                >
                  {predictionResult === "win" ? "Win" : predictionResult === "loss" ? "Loss" : "PENDING"}
                  {typeof predictionScore === "number" ? ` ${predictionScore}pt` : ""}
                </RetroStatusBadge>
              ) : null}
            </div>
            {pickedId ? (
              <p className="mt-1 text-xs text-[var(--bp-muted)]">
                Your pick: <span className="text-[var(--bp-ink)]">
                  {pickedId === "a" ? fighterA.name : fighterB.name} · KO/TKO · R2
                </span>
              </p>
            ) : null}
          </div>

          {/* Discussion link */}
          <div className="mt-3 flex cursor-pointer items-center justify-center gap-1.5 rounded-[8px] border border-[var(--bp-line)] bg-[var(--bp-card-inset)] px-3 py-2 text-xs font-medium text-[var(--bp-muted)] transition hover:border-[var(--bp-line-strong)] hover:bg-[var(--bp-card-hover)] hover:text-[var(--bp-ink)]">
            <MessageCircle className="h-3.5 w-3.5" strokeWidth={1.5} />
            Discussion
            <ChevronRight className="h-3 w-3" strokeWidth={2} />
          </div>
        </>
      )}
    </article>
  );
}

/* ── Upcoming (interactive picker) ── */
export const Upcoming = () => (
  <MockFightCard
    index={5}
    status="upcoming"
    statusTone="info"
    statusLabel="Upcoming"
    weightClass="Lightweight"
    seriesLabel="Numbering"
    isMainEvent
    showPicker
  />
);

/* ── Completed — Correct Pick ── */
export const CompletedCorrectPick = () => (
  <MockFightCard
    index={3}
    status="completed"
    statusTone="success"
    statusLabel="Completed"
    weightClass="Welterweight"
    winnerId="a"
    pickedId="a"
    predictionResult="win"
    predictionScore={8}
    resultText="Dong-Hyun Kim won · KO/TKO · R2"
    bcPrediction={{ a: 62, b: 38 }}
  />
);

/* ── Completed — Wrong Pick ── */
export const CompletedWrongPick = () => (
  <MockFightCard
    index={2}
    status="completed"
    statusTone="success"
    statusLabel="Completed"
    weightClass="Middleweight"
    winnerId="b"
    pickedId="a"
    predictionResult="loss"
    predictionScore={-2}
    resultText="Yuta Watanabe won · Decision · R3"
    bcPrediction={{ a: 45, b: 55 }}
  />
);

/* ── Live — Predictions Locked ── */
export const Live = () => (
  <MockFightCard
    index={1}
    status="live"
    statusTone="danger"
    statusLabel="Live"
    weightClass="Heavyweight"
    isMainEvent
    pickedId="a"
    predictionResult="pending"
    resultText="Predictions Locked"
    bcPrediction={{ a: 52, b: 48 }}
  />
);

/* ── Cancelled ── */
export const Cancelled = () => (
  <MockFightCard
    index={4}
    status="cancelled"
    statusTone="neutral"
    statusLabel="Cancelled"
    weightClass="Featherweight"
    resultText="Fight cancelled"
  />
);

/* ── Title Fight (main event) ── */
export const TitleFightMainEvent = () => (
  <MockFightCard
    index={1}
    status="upcoming"
    statusTone="info"
    statusLabel="Upcoming"
    weightClass="Lightweight"
    isMainEvent
    isTitleFight
    showPicker
  />
);

/* ── Main Card (not main event) + Title Fight ── */
export const MainCardTitleFight = () => (
  <MockFightCard
    index={3}
    status="upcoming"
    statusTone="info"
    statusLabel="Upcoming"
    weightClass="Welterweight"
    isMainCard
    isTitleFight
    showPicker
  />
);

/* ── Main Card only ── */
export const MainCardOnly = () => (
  <MockFightCard
    index={4}
    status="upcoming"
    statusTone="info"
    statusLabel="Upcoming"
    weightClass="Featherweight"
    isMainCard
    showPicker
  />
);
