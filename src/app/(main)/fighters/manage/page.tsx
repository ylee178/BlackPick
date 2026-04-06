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
    .order("name", { ascending: true });

  // Scan pixel directory for all versions per fighter
  const pixelDir = path.join(process.cwd(), "public/fighters/pixel");
  const pixelFiles = fs.existsSync(pixelDir) ? fs.readdirSync(pixelDir).filter(f => f.endsWith(".png")) : [];

  // Group files by fighter ID
  const imageMap: Record<string, string[]> = {};
  for (const file of pixelFiles) {
    // Files: {uuid}.png, {uuid}_v2.png, {uuid}_v3.png, etc.
    const match = file.match(/^([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})(_v\d+)?\.png$/);
    if (!match) continue;
    const fighterId = match[1];
    const version = match[2] || "";
    if (!imageMap[fighterId]) imageMap[fighterId] = [];
    imageMap[fighterId].push(`/fighters/pixel/${file}`);
  }

  const items = (fighters ?? []).map((f) => ({
    id: f.id,
    name: getLocalizedFighterName(f, locale, f.name),
    ringName: f.ring_name || "",
    flag: countryCodeToFlag(f.nationality),
    images: imageMap[f.id] || [],
  }));

  // Sort: fighters with images first
  items.sort((a, b) => {
    if (a.images.length > 0 && b.images.length === 0) return -1;
    if (a.images.length === 0 && b.images.length > 0) return 1;
    return 0;
  });

  // All fighters for remapping dropdown
  const allFighters = (fighters ?? []).map(f => ({
    id: f.id,
    label: `${f.ring_name || f.name} (${f.name})`,
  }));

  return (
    <div>
      <h1 className="mb-5 text-2xl font-bold text-[var(--bp-ink)]">
        Fighter Image Manager
      </h1>
      <FighterImageManager items={items} allFighters={allFighters} />
    </div>
  );
}
