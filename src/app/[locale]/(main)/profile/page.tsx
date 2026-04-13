import { Flame } from "lucide-react";
import { createSupabaseServer, getUser } from "@/lib/supabase-server";
import { getTranslations } from "@/lib/i18n-server";
import {
  RetroEmptyState,
  RetroStatTile,
  retroButtonClassName,
  retroPanelClassName,
} from "@/components/ui/retro";
import ProfileSettings from "@/components/ProfileSettings";
import { getUserBadges } from "@/lib/badge-service";
import { BadgeList } from "@/components/BadgeChip";
import { Link } from "@/i18n/navigation";

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
          <Link href="/login" className={retroButtonClassName({ variant: "ghost" })}>
            {t("nav.login")}
          </Link>
        }
      />
    );
  }

  const { data: user } = await supabase.from("users").select("*").eq("id", authUser.id).single();
  const badges = await getUserBadges(supabase, authUser.id);

  const currentStreak = user?.current_streak ?? 0;
  const bestStreak = user?.best_streak ?? 0;
  const showStreakTiles = currentStreak > 0 || bestStreak > 0;

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
      {showStreakTiles && (
        <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
          <RetroStatTile
            label={t("profile.currentStreak")}
            value={currentStreak}
            meta={t("profile.streakInARow")}
            icon={
              <Flame
                className="h-3.5 w-3.5 text-[var(--bp-muted)]"
                strokeWidth={2}
                aria-hidden="true"
              />
            }
          />
          <RetroStatTile
            label={t("profile.bestStreak")}
            value={bestStreak}
            meta={t("profile.streakPersonalBest")}
            icon={
              <Flame
                className="h-3.5 w-3.5 text-[var(--bp-accent)]"
                strokeWidth={2}
                aria-hidden="true"
              />
            }
          />
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
