import { createSupabaseServer } from "@/lib/supabase-server";
import { requireAdminPage } from "@/lib/admin-auth";
import { getTranslations } from "@/lib/i18n-server";
import { getLocalizedFighterName } from "@/lib/localized-name";
import { countryCodeToFlag } from "@/lib/flags";
import { getFighterPixelPublicUrl, getPixelFiles, hasFighterPixelFile } from "@/lib/pixel-files";
import dynamicImport from "next/dynamic";
const FighterImageManager = dynamicImport(
  () => import("@/components/FighterImageManager"),
);

export const dynamic = "force-dynamic";

export default async function FighterManagePage() {
  const { locale } = await getTranslations();
  await requireAdminPage({ loginPath: `/${locale}/login` });
  const supabase = await createSupabaseServer();

  const { data: fighters } = await supabase
    .from("fighters")
    .select("id, name, ring_name, name_en, name_ko, nationality")
    .order("ring_name", { ascending: true });

  const pixelFiles = getPixelFiles();

  const items = (fighters ?? []).map((f) => ({
    id: f.id,
    name: getLocalizedFighterName(f, locale, f.name),
    ringName: f.ring_name || "",
    flag: countryCodeToFlag(f.nationality),
    hasImage: hasFighterPixelFile(f.id, pixelFiles),
    imageUrl: getFighterPixelPublicUrl(f.id, pixelFiles),
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
