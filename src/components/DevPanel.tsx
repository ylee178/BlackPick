"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Settings } from "lucide-react";

const isDev = process.env.NODE_ENV === "development";

export default function DevPanel() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState<"full" | "empty" | null>(null);
  const [message, setMessage] = useState("");

  if (!isDev) return null;

  async function runSeed(action: "full" | "empty") {
    setLoading(action);
    setMessage("");
    try {
      const res = await fetch("/api/dev/seed", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Failed");

      setMessage(
        action === "full"
          ? `${data.created_users} users · ${data.created_comments ?? 0} comments · ${data.created_likes ?? 0} likes`
          : `${data.deleted_users ?? 0} users removed`
      );
      router.refresh();
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Error");
    } finally {
      setLoading(null);
    }
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="fixed bottom-20 right-4 z-[9999] flex h-10 w-10 items-center justify-center rounded-full border border-[#333] bg-[#1a1a1a] text-[var(--bp-muted)] shadow-lg transition hover:border-[#555] hover:text-white md:bottom-5"
        aria-label="Dev Panel"
      >
        <Settings className="h-5 w-5" strokeWidth={1.5} />
      </button>
    );
  }

  return (
    <div className="fixed bottom-20 right-4 z-[9999] w-64 overflow-hidden rounded-[12px] border border-[#333] bg-[#111] shadow-xl md:bottom-5">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-[#2a2a2a] bg-[#181818] px-3 py-2">
        <span className="text-xs font-bold text-white">Dev</span>
        <button
          onClick={() => setOpen(false)}
          className="text-[11px] text-[#888] hover:text-white"
        >
          ✕
        </button>
      </div>

      {/* Actions */}
      <div className="grid grid-cols-2 gap-2 p-3">
        <button
          onClick={() => void runSeed("full")}
          disabled={loading !== null}
          className="rounded-[8px] bg-[#6d28d9] px-3 py-2.5 text-xs font-bold text-white transition hover:bg-[#7c3aed] disabled:opacity-50"
        >
          {loading === "full" ? "..." : "Full Data"}
        </button>
        <button
          onClick={() => void runSeed("empty")}
          disabled={loading !== null}
          className="rounded-[8px] bg-[#991b1b] px-3 py-2.5 text-xs font-bold text-white transition hover:bg-[#b91c1c] disabled:opacity-50"
        >
          {loading === "empty" ? "..." : "Empty"}
        </button>
      </div>

      {/* Message */}
      {message ? (
        <div className="border-t border-[#2a2a2a] px-3 py-2">
          <p className="text-[11px] text-[#999]">{message}</p>
        </div>
      ) : null}
    </div>
  );
}
