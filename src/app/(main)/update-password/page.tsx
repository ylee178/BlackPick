"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useI18n } from "@/lib/i18n-provider";
import { createBrowserSupabaseClient } from "@/lib/supabase";
import {
  retroButtonClassName,
  retroFieldClassName,
  retroPanelClassName,
} from "@/components/ui/retro";

export default function UpdatePasswordPage() {
  const router = useRouter();
  const supabase = createBrowserSupabaseClient();
  const { t } = useI18n();

  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleUpdate = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    if (password.length < 6) {
      setError(t("auth.passwordTooShort"));
      setLoading(false);
      return;
    }

    const { error: updateError } = await supabase.auth.updateUser({
      password,
    });

    setLoading(false);

    if (updateError) {
      setError(t("auth.passwordUpdateFailed"));
      return;
    }

    setSuccess(true);
    setTimeout(() => {
      router.push("/login");
    }, 2000);
  };

  return (
    <div className="mx-auto max-w-md">
      <section className={retroPanelClassName({ className: "p-5 sm:p-6" })}>
        <h1 className="text-xl font-bold text-[var(--bp-ink)]">{t("auth.resetPassword")}</h1>

        {success ? (
          <div className="mt-5 rounded-[10px] border border-[rgba(34,197,94,0.2)] bg-[rgba(34,197,94,0.08)] px-3.5 py-3 text-sm text-[var(--bp-success)]">
            {t("auth.passwordUpdated")}
          </div>
        ) : (
          <form onSubmit={handleUpdate} className="mt-5 space-y-4">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-[var(--bp-ink)]">
                {t("auth.newPassword")}
              </label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className={retroFieldClassName("px-3.5 py-2.5")}
                placeholder={t("auth.passwordPlaceholder")}
              />
              <p className="mt-1 text-xs text-[var(--bp-muted)]">{t("auth.passwordHint")}</p>
            </div>

            {error ? (
              <div className="rounded-[10px] border border-[rgba(239,68,68,0.2)] bg-[rgba(239,68,68,0.08)] px-3.5 py-2.5 text-sm text-[var(--bp-danger)]">
                {error}
              </div>
            ) : null}

            <button
              type="submit"
              disabled={loading}
              className={retroButtonClassName({ variant: "primary", size: "lg", block: true })}
            >
              {loading ? t("auth.updating") : t("auth.updatePassword")}
            </button>
          </form>
        )}
      </section>
    </div>
  );
}
