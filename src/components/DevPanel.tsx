"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Settings, Loader2 } from "lucide-react";

const isDev = process.env.NODE_ENV === "development";

type Mode = "upcoming" | "completed";

export default function DevPanel() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState<string | null>(null);
  const [overlay, setOverlay] = useState(false);
  const [message, setMessage] = useState("");
  const [mode, setMode] = useState<Mode | null>(null);

  // Fetch actual featured event status on mount
  useEffect(() => {
    fetch("/api/dev/seed", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "status" }),
    })
      .then((r) => r.json())
      .then((d) => setMode(d.featured_status === "upcoming" || d.featured_status === "live" ? "upcoming" : "completed"))
      .catch(() => setMode("completed"));
  }, []);

  if (!isDev) return null;

  async function runAction(action: string) {
    setLoading(action);
    setOverlay(true);
    setMessage("");
    try {
      const res = await fetch("/api/dev/seed", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Failed");

      if (action === "full") {
        setMessage(`${data.created_users} users · ${data.created_comments ?? 0} comments`);
      } else if (action === "complete-fights") {
        setMode("completed");
        setMessage(`${data.event_name ?? ""}: ${data.completed_fights ?? 0} fights`);
      } else if (action === "reset-fights") {
        setMode("upcoming");
        setMessage(`${data.event_name ?? ""}: ${data.reset_fights ?? 0} fights reset`);
      } else if (action === "empty") {
        setMessage(`${data.deleted_users ?? 0} users removed`);
      }
      router.refresh();
      // Small delay to let the page re-render before removing overlay
      await new Promise((r) => setTimeout(r, 500));
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Error");
    } finally {
      setLoading(null);
      setOverlay(false);
    }
  }

  async function toggleMode(target: Mode) {
    if (target === mode || loading) return;
    if (target === "completed") {
      await runAction("complete-fights");
    } else {
      await runAction("reset-fights");
    }
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="fixed bottom-20 right-4 z-[9999] flex h-10 w-10 items-center justify-center rounded-full border border-[#333] bg-[#1a1a1a] text-[var(--bp-muted)] shadow-lg transition hover:border-[#555] hover:text-white md:bottom-5"
        aria-label="Dev Panel"
        suppressHydrationWarning
      >
        <Settings className="h-5 w-5" strokeWidth={1.5} />
      </button>
    );
  }

  return (
    <>
      {/* Full-screen loading overlay */}
      {overlay && (
        <div className="fixed inset-0 z-[9998] flex items-center justify-center bg-black/70 backdrop-blur-sm">
          <div className="flex flex-col items-center gap-3">
            <Loader2 className="h-8 w-8 animate-spin text-[var(--bp-accent)]" strokeWidth={2} />
            <p className="text-sm font-semibold text-white">Updating...</p>
          </div>
        </div>
      )}

      <div className="fixed bottom-20 right-4 z-[9999] w-64 overflow-hidden rounded-[12px] border border-[#333] bg-[#111] shadow-xl md:bottom-5">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#2a2a2a] bg-[#181818] px-3 py-2">
          <span className="text-xs font-bold text-white">Dev</span>
          <button
            onClick={() => setOpen(false)}
            className="cursor-pointer text-[11px] text-[#888] hover:text-white"
          >
            ✕
          </button>
        </div>

        <div className="flex flex-col gap-3 p-3">
          {/* Event Mode Toggle */}
          <div>
            <p className="mb-1.5 text-[10px] font-bold uppercase tracking-wider text-[#666]">Event Mode</p>
            <div className="flex overflow-hidden rounded-[8px] border border-[#333]">
              <button
                onClick={() => void toggleMode("upcoming")}
                disabled={loading !== null}
                className={`flex-1 cursor-pointer px-3 py-2 text-xs font-bold transition ${
                  mode === "upcoming"
                    ? "bg-[#0e7490] text-white"
                    : "bg-[#1a1a1a] text-[#666] hover:text-white"
                } disabled:opacity-50`}
              >
                {loading === "reset-fights" ? "..." : "Upcoming"}
              </button>
              <button
                onClick={() => void toggleMode("completed")}
                disabled={loading !== null}
                className={`flex-1 cursor-pointer px-3 py-2 text-xs font-bold transition ${
                  mode === "completed"
                    ? "bg-[#0e7490] text-white"
                    : "bg-[#1a1a1a] text-[#666] hover:text-white"
                } disabled:opacity-50`}
              >
                {loading === "complete-fights" ? "..." : "Completed"}
              </button>
            </div>
          </div>

          {/* Data Actions */}
          <div>
            <p className="mb-1.5 text-[10px] font-bold uppercase tracking-wider text-[#666]">Data</p>
            <div className="flex gap-2">
              <button
                onClick={() => void runAction("full")}
                disabled={loading !== null}
                className="flex-1 cursor-pointer rounded-[8px] bg-[#6d28d9] px-2 py-2 text-xs font-bold text-white transition hover:bg-[#7c3aed] disabled:opacity-50"
              >
                {loading === "full" ? "..." : "Seed"}
              </button>
              <button
                onClick={() => void runAction("empty")}
                disabled={loading !== null}
                className="flex-1 cursor-pointer rounded-[8px] bg-[#991b1b] px-2 py-2 text-xs font-bold text-white transition hover:bg-[#b91c1c] disabled:opacity-50"
              >
                {loading === "empty" ? "..." : "Empty"}
              </button>
            </div>
          </div>
        </div>

        {/* Message */}
        {message ? (
          <div className="border-t border-[#2a2a2a] px-3 py-2">
            <p className="text-[11px] text-[#999]">{message}</p>
          </div>
        ) : null}
      </div>
    </>
  );
}
