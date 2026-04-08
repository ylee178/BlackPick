import { createSupabaseServer, getUser } from "@/lib/supabase-server";
import { getTranslations } from "@/lib/i18n-server";
import { RetroEmptyState, retroButtonClassName, retroPanelClassName } from "@/components/ui/retro";
import ProfileSettings from "@/components/ProfileSettings";
import { getUserBadges } from "@/lib/badge-service";
import { BadgeList } from "@/components/BadgeChip";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function ProfilePage() {
  const supabase = await createSupabaseServer();
  const authUser = await getUser();
  const { t } = await getTranslations();

  if (!authUser) {
    return (
      <RetroEmptyState
        title={t("profile.myAccount")}
        description={t("profile.signInToView")}
        action={
          <div className="flex gap-2">
            <Link href="/login" className={retroButtonClassName({ variant: "ghost" })}>
              {t("nav.login")}
            </Link>
            <Link href="/signup" className={retroButtonClassName({ variant: "primary" })}>
              {t("nav.signup")}
            </Link>
          </div>
        }
      />
    );
  }

  const { data: user } = await supabase.from("users").select("*").eq("id", authUser.id).single();
  const badges = await getUserBadges(supabase, authUser.id);

  return (
    <div>
      <h1 className="mb-5 text-2xl font-bold text-[var(--bp-ink)]">
        {t("account.editProfile")}
      </h1>
      {badges.length > 0 && (
        <div className="mb-4">
          <BadgeList badges={badges} size="md" />
        </div>
      )}
      <div className={retroPanelClassName({ className: "space-y-4 p-4 sm:p-5" })}>
        <ProfileSettings
          ringName={user?.ring_name ?? ""}
          email={authUser.email ?? ""}
        />
      </div>
    </div>
  );
}
