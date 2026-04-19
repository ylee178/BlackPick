import { createSupabaseServer } from "@/lib/supabase-server";
import { getTranslations } from "@/lib/i18n-server";
import { getLocalizedFighterName } from "@/lib/localized-name";
import { countryCodeToFlag } from "@/lib/flags";
import { translateWeightClass } from "@/lib/weight-class";
import FighterGrid from "@/components/FighterGrid";
import { getFighterPixelPublicUrl, getPixelFiles, hasFighterPixelFile } from "@/lib/pixel-files";
import { resolveDivisionChip } from "@/lib/division-chip";

// Force dynamic while rank sync is still manual — ISR cache would
// hold stale null `is_champion` / `rank_position` after a
// `sync-bc-fighter-ranks --apply` run for up to 5 minutes. Revisit
// when the automation-cadence cron branch lands.
export const dynamic = "force-dynamic";

export default async function FightersPage() {
  const supabase = await createSupabaseServer();
  const { t, locale } = await getTranslations();

  const { data: fightersRaw } = await supabase
    .from("fighters")
    .select("*")
    .order("name", { ascending: true })
    .limit(500);
  const fighters = (fightersRaw ?? []) as unknown as Array<{
    id: string;
    name: string;
    ring_name: string | null;
    name_en: string | null;
    name_ko: string | null;
    record: string | null;
    nationality: string | null;
    weight_class: string | null;
    image_url: string | null;
    is_champion: boolean | null;
    rank_position: number | null;
  }>;

  const pixelFiles = getPixelFiles();
  const championLabel = t("division.champion");

  const items = fighters.map((f) => ({
    id: f.id,
    name: getLocalizedFighterName(f, locale, f.name),
    record: f.record || "0-0",
    flag: countryCodeToFlag(f.nationality),
    nationalityCode: f.nationality?.toUpperCase() ?? null,
    avatarUrl: getFighterPixelPublicUrl(f.id, pixelFiles) ?? "/fighters/default.png",
    weightClass: f.weight_class ? translateWeightClass(f.weight_class, locale) : null,
    hasPixelArt: hasFighterPixelFile(f.id, pixelFiles),
    // Precomputed server-side so FighterGrid (client component) doesn't
    // need the resolver or weight-class translation map. `null` when the
    // fighter has no rank/champion signal — grid hides the slot.
    divisionChip: resolveDivisionChip(null, f, locale, championLabel),
  }));


  // Default order matches FighterGrid's name_asc client sort:
  // pixel-art fighters first, then alphabetical by localized name.
  // Keeping SSR order in sync avoids a re-sort flash after hydration.
  items.sort((a, b) => {
    const aHasPhoto = a.hasPixelArt ? 1 : 0;
    const bHasPhoto = b.hasPixelArt ? 1 : 0;
    if (aHasPhoto !== bHasPhoto) return bHasPhoto - aHasPhoto;
    return a.name.localeCompare(b.name, locale, { sensitivity: "base" });
  });

  return (
    <div>
      <h1 className="mb-5 text-2xl font-bold text-[var(--bp-ink)]">
        {t("nav.fighters")} <span className="text-[var(--bp-muted)]">({items.length})</span>
      </h1>
      <FighterGrid items={items} />
    </div>
  );
}
