import { translateWeightClass } from "./weight-class";
import type { AppLocale } from "./localized-name";

/**
 * Ranking-badge resolver for fight-card portraits.
 *
 * Priority: live BC `division-info` parse (per-render fetch) >
 * persisted DB `is_champion` / `rank_position`. The live path stays
 * primary because rank sync is currently manual
 * (`src/scripts/sync-bc-fighter-ranks.ts`); DB state can lag BC by up
 * to a full release cycle until `feature/crawler-automation-cadence`
 * wires the sync into cron.
 *
 * Returns `null` when no ranking signal is available — callers hide
 * the chip entirely rather than rendering a bare weight class (the
 * fight-card header already displays the weight class).
 *
 * Shape: `weightLabel` + `rankLabel` emitted as separate fields so the
 * renderer can color each span independently (weight class muted, rank
 * number / CHAMPION label accent-colored — Sean 2026-04-19 redesign).
 */
export type DivisionChipData = {
  weightLabel: string | null;
  rankLabel: string;
  tone: "champion" | "ranked";
};

export type DivisionChipFighter = {
  weight_class?: string | null;
  is_champion?: boolean | null;
  rank_position?: number | null;
};

export type DivisionChipLive = {
  weightClass: string;
  rank: number | null;
  /** BC event-detail `division-info` marks champions with `#C`
   *  (captured by `bc-predictions.ts`). When true, the live source is
   *  authoritative for champion status AT EVENT TIME — preferred over
   *  DB `is_champion` which reflects CURRENT state. Letting the live
   *  path carry champion state fixes the "Fighting God was champion
   *  at Exodus but lost the title since" display gap. */
  isChampion?: boolean;
};

export function resolveDivisionChip(
  liveDiv: DivisionChipLive | null | undefined,
  fighter: DivisionChipFighter,
  locale: AppLocale,
  championLabel: string,
): DivisionChipData | null {
  // Live champion signal wins — snapshots "was champion at event
  // time" for completed events even after the fighter lost the title.
  if (liveDiv?.isChampion) {
    return {
      weightLabel: translateWeightClass(liveDiv.weightClass, locale),
      rankLabel: championLabel,
      tone: "champion",
    };
  }
  if (liveDiv?.rank) {
    return {
      weightLabel: translateWeightClass(liveDiv.weightClass, locale),
      rankLabel: `#${liveDiv.rank}`,
      tone: "ranked",
    };
  }
  const weight = liveDiv?.weightClass ?? fighter.weight_class ?? null;
  const weightLabel = weight ? translateWeightClass(weight, locale) : null;
  if (fighter.is_champion) {
    return {
      weightLabel,
      rankLabel: championLabel,
      tone: "champion",
    };
  }
  if (fighter.rank_position) {
    return {
      weightLabel,
      rankLabel: `#${fighter.rank_position}`,
      tone: "ranked",
    };
  }
  return null;
}
