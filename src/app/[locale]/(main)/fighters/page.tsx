import { createSupabaseServer } from "@/lib/supabase-server";
import { getTranslations } from "@/lib/i18n-server";
import { getLocalizedFighterName } from "@/lib/localized-name";
import { countryCodeToFlag } from "@/lib/flags";
import { translateWeightClass } from "@/lib/weight-class";
import FighterGrid from "@/components/FighterGrid";
import { getFighterPixelPublicUrl, getPixelFiles, hasFighterPixelFile } from "@/lib/pixel-files";

export const revalidate = 300; // ISR: 5 minutes

export default async function FightersPage() {
  const supabase = await createSupabaseServer();
  const { t, locale } = await getTranslations();

  const { data: fighters } = await supabase
    .from("fighters")
    .select("id, name, ring_name, name_en, name_ko, record, nationality, weight_class, image_url")
    .order("name", { ascending: true })
    .limit(500);

  const pixelFiles = getPixelFiles();

  const items = (fighters ?? []).map((f) => ({
    id: f.id,
    name: getLocalizedFighterName(f, locale, f.name),
    record: f.record || "0-0",
    flag: countryCodeToFlag(f.nationality),
    nationalityCode: f.nationality?.toUpperCase() ?? null,
    avatarUrl: getFighterPixelPublicUrl(f.id, pixelFiles) ?? "/fighters/default.png",
    weightClass: f.weight_class ? translateWeightClass(f.weight_class, locale) : null,
    hasPixelArt: hasFighterPixelFile(f.id, pixelFiles),
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
