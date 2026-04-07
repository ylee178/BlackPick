import { createSupabaseServer } from "@/lib/supabase-server";
import { getTranslations } from "@/lib/i18n-server";
import { getLocalizedFighterName } from "@/lib/localized-name";
import { countryCodeToFlag } from "@/lib/flags";
import FighterImageManager from "@/components/FighterImageManager";
import fs from "fs";
import path from "path";

export const dynamic = "force-dynamic";

export default async function FighterManagePage() {
  const supabase = await createSupabaseServer();
  const { locale } = await getTranslations();

  const { data: fighters } = await supabase
    .from("fighters")
    .select("id, name, ring_name, name_en, name_ko, nationality")
    .order("ring_name", { ascending: true });

  const pixelDir = path.join(process.cwd(), "public/fighters/pixel");
  const pixelFiles = new Set(
    fs.existsSync(pixelDir)
      ? fs.readdirSync(pixelDir).filter((f) => /^[0-9a-f-]+\.png$/.test(f))
      : []
  );

  const items = (fighters ?? []).map((f) => ({
    id: f.id,
    name: getLocalizedFighterName(f, locale, f.name),
    ringName: f.ring_name || "",
    flag: countryCodeToFlag(f.nationality),
    hasImage: pixelFiles.has(`${f.id}.png`),
  }));

  // Sort: fighters with images first
  items.sort((a, b) => {
    if (a.hasImage && !b.hasImage) return -1;
    if (!a.hasImage && b.hasImage) return 1;
    return 0;
  });

  return (
    <div>
      <h1 className="mb-5 text-2xl font-bold text-[var(--bp-ink)]">
        Fighter Images
      </h1>
      <FighterImageManager items={items} />
    </div>
  );
}
