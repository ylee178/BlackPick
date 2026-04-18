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
 */
export type DivisionChipData = {
  label: string;
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
};

export function resolveDivisionChip(
  liveDiv: DivisionChipLive | null | undefined,
  fighter: DivisionChipFighter,
  locale: AppLocale,
  championLabel: string,
): DivisionChipData | null {
  if (liveDiv?.rank) {
    const weightLabel = translateWeightClass(liveDiv.weightClass, locale);
    return {
      label: `${weightLabel} · #${liveDiv.rank}`,
      tone: "ranked",
    };
  }
  const weight = liveDiv?.weightClass ?? fighter.weight_class ?? null;
  const weightLabel = weight ? translateWeightClass(weight, locale) : null;
  if (fighter.is_champion) {
    return {
      label: weightLabel ? `${weightLabel} · ${championLabel}` : championLabel,
      tone: "champion",
    };
  }
  if (fighter.rank_position) {
    return {
      label: weightLabel
        ? `${weightLabel} · #${fighter.rank_position}`
        : `#${fighter.rank_position}`,
      tone: "ranked",
    };
  }
  return null;
}
