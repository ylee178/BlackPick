import { getUser } from "@/lib/supabase-server";
import { getTranslations } from "@/lib/i18n-server";
import { RetroEmptyState, retroButtonClassName, retroPanelClassName } from "@/components/ui/retro";
import NotificationSettings from "@/components/NotificationSettings";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function NotificationSettingsPage() {
  const authUser = await getUser();
  const { t } = await getTranslations();

  if (!authUser) {
    return (
      <RetroEmptyState
        title={t("account.notificationSettings")}
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

  return (
    <div>
      <h1 className="mb-5 text-2xl font-bold text-[var(--bp-ink)]">
        {t("account.notificationSettings")}
      </h1>
      <div className={retroPanelClassName({ className: "p-4 sm:p-5" })}>
        <NotificationSettings />
      </div>
    </div>
  );
}
