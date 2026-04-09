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
    avatarUrl: getFighterPixelPublicUrl(f.id, pixelFiles) ?? "/fighters/default.png",
    weightClass: f.weight_class ? translateWeightClass(f.weight_class, locale) : null,
    hasPixelArt: hasFighterPixelFile(f.id, pixelFiles),
  }));

  // Pixel art fighters first, then the rest
  items.sort((a, b) => {
    if (a.hasPixelArt && !b.hasPixelArt) return -1;
    if (!a.hasPixelArt && b.hasPixelArt) return 1;
    return 0;
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
