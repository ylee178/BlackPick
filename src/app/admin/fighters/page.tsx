import dynamicImport from "next/dynamic";
import { requireAdminPage } from "@/lib/admin-auth";
import { countryCodeToFlag } from "@/lib/flags";
import { getLocalizedFighterName } from "@/lib/localized-name";
import {
  getFighterPixelPublicUrl,
  getPixelFiles,
  hasFighterPixelFile,
} from "@/lib/pixel-files";
import { createSupabaseAdmin } from "@/lib/supabase-admin";

const FighterImageManager = dynamicImport(
  () => import("@/components/FighterImageManager"),
);

export const dynamic = "force-dynamic";

export default async function AdminFightersPage() {
  await requireAdminPage();
  const supabase = createSupabaseAdmin();

  const { data: fighters, error } = await supabase
    .from("fighters")
    .select("id, name, ring_name, name_en, name_ko, nationality")
    .order("ring_name", { ascending: true });

  if (error) {
    return (
      <div className="text-sm text-[var(--bp-danger)]">{error.message}</div>
    );
  }

  const pixelFiles = getPixelFiles();

  const items = (fighters ?? []).map((f) => ({
    id: f.id,
    name: getLocalizedFighterName(f, "en", f.name ?? ""),
    ringName: f.ring_name ?? "",
    flag: countryCodeToFlag(f.nationality),
    hasImage: hasFighterPixelFile(f.id, pixelFiles),
    imageUrl: getFighterPixelPublicUrl(f.id, pixelFiles),
  }));

  items.sort((a, b) => {
    if (a.hasImage && !b.hasImage) return -1;
    if (!a.hasImage && b.hasImage) return 1;
    return 0;
  });

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-[var(--bp-ink)] sm:text-3xl">
          Fighters
        </h1>
        <p className="mt-2 text-sm text-[var(--bp-muted)]">
          Pixel avatar roster — upload, crop, replace, or remove.
        </p>
      </div>
      <FighterImageManager items={items} />
    </div>
  );
}
