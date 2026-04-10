"use client";

import { useState } from "react";
import { useRouter } from "@/i18n/navigation";
import { useI18n } from "@/lib/i18n-provider";
import { createBrowserSupabaseClient } from "@/lib/supabase";
import { Save, Trash2 } from "lucide-react";
import LoadingButtonContent from "@/components/ui/LoadingButtonContent";
import {
  retroButtonClassName,
  retroFieldClassName,
} from "@/components/ui/retro";
import ConfirmModal from "@/components/ConfirmModal";

type Props = {
  ringName: string;
  email: string;
};

export default function ProfileSettings({ ringName: initialRingName, email }: Props) {
  const { t } = useI18n();
  const router = useRouter();

  const [ringName, setRingName] = useState(initialRingName);
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState<{ type: "ok" | "err"; text: string } | null>(null);

  const [deleteModal, setDeleteModal] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteMsg, setDeleteMsg] = useState<string | null>(null);

  async function handleSaveRingName(e: React.FormEvent) {
    e.preventDefault();
    if (!ringName.trim() || ringName === initialRingName) return;
    setSaving(true);
    setSaveMsg(null);
    try {
      const res = await fetch("/api/profile/ring-name", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ringName: ringName.trim() }),
      });
      const data = await res.json();
      if (res.ok) {
        setSaveMsg({ type: "ok", text: t("account.saved") });
        router.refresh();
      } else if (data.code === "ring_name_taken") {
        setSaveMsg({ type: "err", text: t("account.ringNameTaken") });
      } else {
        setSaveMsg({ type: "err", text: data.code ?? "Error" });
      }
    } catch {
      setSaveMsg({ type: "err", text: "Error" });
    } finally {
      setSaving(false);
    }
  }

  async function handleDeleteAccount() {
    setDeleting(true);
    setDeleteMsg(null);
    try {
      const res = await fetch("/api/profile/delete-account", { method: "POST" });
      if (!res.ok) {
        setDeleteMsg(t("account.deleteAccountFailed"));
        return;
      }

      const supabase = createBrowserSupabaseClient();
      await supabase.auth.signOut();
      router.replace("/");
      router.refresh();
    } catch {
      setDeleteMsg(t("account.deleteAccountFailed"));
    } finally {
      setDeleting(false);
      setDeleteModal(false);
    }
  }

  return (
    <>
      {/* Email (read-only) */}
      <div>
        <label className="mb-1.5 block text-xs font-medium text-[var(--bp-muted)]">
          {t("auth.email")}
        </label>
        <p className="rounded-[8px] border border-[var(--bp-line)] bg-[var(--bp-card-inset)] px-3 py-2 text-sm text-[var(--bp-muted)]">
          {email}
        </p>
      </div>

      {/* Ring name */}
      <form onSubmit={handleSaveRingName}>
        <label className="mb-1.5 block text-xs font-medium text-[var(--bp-muted)]">
          {t("auth.ringName")}
        </label>
        <div className="flex gap-2">
          <input
            type="text"
            value={ringName}
            onChange={(e) => { setRingName(e.target.value); setSaveMsg(null); }}
            maxLength={20}
            className={retroFieldClassName("min-w-0 flex-1")}
          />
          <button
            type="submit"
            disabled={saving || !ringName.trim() || ringName === initialRingName}
            aria-busy={saving}
            className={retroButtonClassName({ variant: "soft", size: "sm", className: "gap-1.5" })}
          >
            <LoadingButtonContent loading={saving} icon={<Save className="h-3.5 w-3.5" strokeWidth={2} />}>
              {t("account.save")}
            </LoadingButtonContent>
          </button>
        </div>
        {saveMsg && (
          <p className={`mt-1.5 text-xs ${saveMsg.type === "ok" ? "text-[var(--bp-success)]" : "text-[var(--bp-danger)]"}`}>
            {saveMsg.text}
          </p>
        )}
      </form>

      {/* Delete account */}
      <div className="border-t border-[var(--bp-line)] pt-4">
        <button
          type="button"
          onClick={() => {
            setDeleteMsg(null);
            setDeleteModal(true);
          }}
          className="flex cursor-pointer items-center gap-2 text-sm text-[var(--bp-danger)] transition hover:opacity-80"
        >
          <Trash2 className="h-4 w-4" strokeWidth={1.8} />
          {t("account.deleteAccount")}
        </button>
        {deleteMsg ? (
          <p className="mt-1.5 text-xs text-[var(--bp-danger)]">{deleteMsg}</p>
        ) : null}
      </div>

      <ConfirmModal
        open={deleteModal}
        onClose={() => setDeleteModal(false)}
        onConfirm={handleDeleteAccount}
        title={t("account.deleteAccount")}
        description={t("account.deleteAccountConfirm")}
        confirmLabel={t("account.deleteAccount")}
        cancelLabel={t("discussion.cancel")}
        danger
        loading={deleting}
      />
    </>
  );
}
