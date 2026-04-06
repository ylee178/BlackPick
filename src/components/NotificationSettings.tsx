"use client";

import { useState } from "react";
import { useI18n } from "@/lib/i18n-provider";

function NotifToggle({ label, defaultOn }: { label: string; defaultOn?: boolean }) {
  const [on, setOn] = useState(defaultOn ?? true);

  return (
    <div className="flex items-center justify-between">
      <span className="text-sm text-[var(--bp-ink)]">{label}</span>
      <button
        type="button"
        onClick={() => setOn(!on)}
        className={`relative h-6 w-11 cursor-pointer rounded-full transition-colors ${
          on ? "bg-[var(--bp-accent)]" : "bg-[rgba(255,255,255,0.12)]"
        }`}
        role="switch"
        aria-checked={on}
      >
        <span
          className={`absolute top-0.5 block h-5 w-5 rounded-full bg-white shadow transition-transform ${
            on ? "translate-x-[22px]" : "translate-x-0.5"
          }`}
        />
      </button>
    </div>
  );
}

export default function NotificationSettings() {
  const { t } = useI18n();

  return (
    <div className="space-y-4">
      <NotifToggle label={t("account.notifFightStart")} defaultOn />
      <NotifToggle label={t("account.notifResult")} defaultOn />
      <NotifToggle label={t("account.notifMvpVote")} defaultOn />
      <NotifToggle label={t("account.notifRankingChange")} defaultOn />
    </div>
  );
}
