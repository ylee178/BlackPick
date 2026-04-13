"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Settings, Loader2 } from "lucide-react";
import { Switch } from "@base-ui/react/switch";
import { createBrowserSupabaseClient } from "@/lib/supabase";

/**
 * DevPanel v2 — grouped switches + gold active state + one-shot action buttons.
 *
 * Visible only when `NODE_ENV === 'development'`. The server endpoint
 * (`/api/dev/seed`) has its own env guard that returns 403 in prod, so
 * even if the client bundle accidentally shipped with this component
 * included, none of the mutations would go through.
 *
 * Sections:
 *   - Event State: upcoming / live / completed (radio behavior, mutex)
 *   - User State: Has ring name / Has saved picks
 *   - Content State: Show 404
 *   - Actions: Seed / Empty / Reset "all predicted" toast lock
 *
 * The Phase 4 migration (MVP voting + result pending) will add two more
 * switches in the Event State section; skipped here because the underlying
 * columns don't exist yet.
 *
 * State is derived from the server on mount via a composite action
 * (`get-user-state`) so the switches reflect reality after any manual
 * change Sean makes in another tab.
 */

const isDev = process.env.NODE_ENV === "development";

type EventStatus = "upcoming" | "live" | "completed";

type UserState = {
  has_ring_name: boolean;
  ring_name: string | null;
  has_predictions: boolean;
  prediction_count: number;
  predicted_on_latest: number;
  predictable_on_latest: number;
  latest_event_id: string | null;
  latest_event_name: string | null;
  latest_event_status: string | null;
};

const DEFAULT_STATE: UserState = {
  has_ring_name: false,
  ring_name: null,
  has_predictions: false,
  prediction_count: 0,
  predicted_on_latest: 0,
  predictable_on_latest: 0,
  latest_event_id: null,
  latest_event_name: null,
  latest_event_status: null,
};

async function callSeed(action: string, body: Record<string, unknown> = {}) {
  const res = await fetch("/api/dev/seed", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action, ...body }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data?.error || "Failed");
  return data;
}

export default function DevPanel() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState<string | null>(null);
  const [overlay, setOverlay] = useState(false);
  const [message, setMessage] = useState("");
  const [userId, setUserId] = useState<string | null>(null);
  const [state, setState] = useState<UserState>(DEFAULT_STATE);

  const refreshState = useCallback(async (uid: string | null) => {
    if (!uid) {
      setState(DEFAULT_STATE);
      return;
    }
    try {
      const data = await callSeed("get-user-state", { userId: uid });
      setState(data as UserState);
    } catch {
      // swallow — dev panel should never block the page
    }
  }, []);

  // Resolve the current user id once on mount, then fetch composite state.
  useEffect(() => {
    if (!isDev) return;
    let cancelled = false;
    (async () => {
      try {
        const supabase = createBrowserSupabaseClient();
        const { data } = await supabase.auth.getUser();
        const uid = data.user?.id ?? null;
        if (cancelled) return;
        setUserId(uid);
        await refreshState(uid);
      } catch {
        // ignore
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [refreshState]);

  if (!isDev) return null;

  const run = async (
    label: string,
    action: string,
    body: Record<string, unknown> = {},
    options: { message?: (data: unknown) => string } = {},
  ) => {
    setLoading(label);
    setOverlay(true);
    setMessage("");
    try {
      const data = await callSeed(action, body);
      if (options.message) {
        setMessage(options.message(data));
      }
      await refreshState(userId);
      router.refresh();
      // Let the server layer re-render before removing the overlay.
      await new Promise((r) => setTimeout(r, 400));
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Error");
    } finally {
      setLoading(null);
      setOverlay(false);
    }
  };

  // ── Event State ────────────────────────────────────────────────────
  const currentEventStatus: EventStatus | null = (() => {
    const s = state.latest_event_status;
    if (s === "upcoming" || s === "live" || s === "completed") return s;
    return null;
  })();

  const handleEventStatus = async (next: EventStatus) => {
    if (next === currentEventStatus) return;
    await run(`event:${next}`, "set-event-status", { status: next }, {
      message: () => `event → ${next}`,
    });
  };

  // ── User State ─────────────────────────────────────────────────────
  const handleRingNameToggle = async (on: boolean) => {
    if (!userId) return;
    if (on === state.has_ring_name) return;
    await run(
      on ? "ringname:on" : "ringname:off",
      "set-ring-name",
      { userId, ringName: on ? "DevTester" : null },
      {
        message: () => (on ? "ring name set → DevTester" : "ring name cleared"),
      },
    );
  };

  const handlePredictionsToggle = async (on: boolean) => {
    if (!userId) return;
    if (on) {
      await run("picks:seed", "seed-me", { userId }, {
        message: (d) => `${(d as { seeded?: number }).seeded ?? 0} picks seeded`,
      });
    } else {
      await run("picks:clear", "clear-my-predictions", { userId }, {
        message: (d) => `${(d as { cleared?: number }).cleared ?? 0} picks cleared`,
      });
    }
  };

  // ── Content State ──────────────────────────────────────────────────
  const handleShow404 = () => {
    router.push(`/en/__dev_not_found_${Date.now()}`);
  };

  // ── Actions ────────────────────────────────────────────────────────
  const handleSeed = () => run("seed", "full", {}, {
    message: (d) => `${(d as { created_users?: number }).created_users ?? 0} users seeded`,
  });

  const handleEmpty = () => run("empty", "empty", {}, {
    message: (d) => `${(d as { deleted_users?: number }).deleted_users ?? 0} users removed`,
  });

  const handleResetToastLock = () => {
    if (!userId || !state.latest_event_id) {
      setMessage("need signed-in user + event");
      return;
    }
    const key = `allPredictedToast:v1:${userId}:${state.latest_event_id}`;
    try {
      window.localStorage.removeItem(key);
      setMessage("toast lock cleared");
    } catch {
      setMessage("localStorage unavailable");
    }
  };

  const handleResetOnboardingDismissals = () => {
    try {
      let cleared = 0;
      const prefixes = ["bp.onboarding."];
      for (let i = window.localStorage.length - 1; i >= 0; i--) {
        const key = window.localStorage.key(i);
        if (!key) continue;
        if (prefixes.some((p) => key.startsWith(p))) {
          window.localStorage.removeItem(key);
          cleared++;
        }
      }
      setMessage(`onboarding cleared (${cleared})`);
    } catch {
      setMessage("localStorage unavailable");
    }
  };

  // ── Content Flags (title_fight + main_card preview) ────────────────
  //
  // Title fight and main card are admin-managed flags that the crawler
  // cannot infer from source markup. In production an admin flips them
  // on `/admin/events/{id}` (or directly via DB). For dev/preview the
  // panel flips them on the latest event in two modes:
  //
  //   - `preview`: mark fight #1 as is_title_fight + is_main_card, mark
  //     half the remaining fights is_main_card (the rest stay as the
  //     undercard). Surfaces both chip + fighter-page gold tint at once.
  //   - `clear`: set is_title_fight=false AND is_main_card=false on
  //     every fight of the latest event. Resets to the crawler default.
  const handleContentFlagsPreview = () => run(
    "content-flags:preview",
    "set-content-flags-preview",
    {},
    {
      message: (d) => {
        const r = d as { title_fights?: number; main_card?: number };
        return `title=${r.title_fights ?? 0} · main=${r.main_card ?? 0}`;
      },
    },
  );

  const handleContentFlagsClear = () => run(
    "content-flags:clear",
    "clear-content-flags",
    {},
    {
      message: (d) => `cleared on ${(d as { fights?: number }).fights ?? 0} fights`,
    },
  );

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="fixed bottom-20 right-4 z-[9999] flex h-10 w-10 items-center justify-center rounded-full border border-[var(--bp-line)] bg-[var(--bp-card)] text-[var(--bp-muted)] shadow-lg transition hover:border-[rgba(255,255,255,0.15)] hover:text-[var(--bp-ink)] md:bottom-5"
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
            <p className="text-sm font-semibold text-white">Updating…</p>
          </div>
        </div>
      )}

      <div className="fixed bottom-20 right-4 z-[9999] w-72 overflow-hidden rounded-[14px] border border-[var(--bp-line)] bg-[var(--bp-card)] shadow-xl md:bottom-5">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[var(--bp-line)] bg-[var(--bp-card-inset)] px-3 py-2">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold uppercase tracking-[0.14em] text-[var(--bp-ink)]">Dev</span>
            {state.latest_event_name ? (
              <span className="truncate text-[10px] text-[var(--bp-muted)]">
                · {state.latest_event_name}
              </span>
            ) : null}
          </div>
          <button
            onClick={() => setOpen(false)}
            className="cursor-pointer rounded px-1 text-[11px] text-[var(--bp-muted)] hover:text-[var(--bp-ink)]"
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        <div className="flex flex-col divide-y divide-[var(--bp-line)]">
          {/* Event State */}
          <Section label="Event State">
            <SwitchRow
              label="Upcoming"
              checked={currentEventStatus === "upcoming"}
              disabled={loading !== null}
              onChange={(on) => on && handleEventStatus("upcoming")}
            />
            <SwitchRow
              label="Live"
              checked={currentEventStatus === "live"}
              disabled={loading !== null}
              onChange={(on) => on && handleEventStatus("live")}
            />
            <SwitchRow
              label="Completed"
              checked={currentEventStatus === "completed"}
              disabled={loading !== null}
              onChange={(on) => on && handleEventStatus("completed")}
            />
          </Section>

          {/* User State */}
          <Section label="User State">
            <SwitchRow
              label="Has ring name"
              description={state.ring_name ?? undefined}
              checked={state.has_ring_name}
              disabled={loading !== null || !userId}
              onChange={handleRingNameToggle}
            />
            <SwitchRow
              label="Has saved picks"
              description={
                state.predictable_on_latest > 0
                  ? `${state.predicted_on_latest}/${state.predictable_on_latest} on latest`
                  : undefined
              }
              checked={state.has_predictions}
              disabled={loading !== null || !userId}
              onChange={handlePredictionsToggle}
            />
          </Section>

          {/* Content State */}
          <Section label="Content State">
            <ActionRow label="Show 404" onClick={handleShow404} disabled={loading !== null} />
          </Section>

          {/* Content Flags */}
          <Section label="Content Flags">
            <ActionRow
              label="Preview title + main card"
              onClick={handleContentFlagsPreview}
              disabled={loading !== null || !state.latest_event_id}
            />
            <ActionRow
              label="Clear title + main card"
              onClick={handleContentFlagsClear}
              disabled={loading !== null || !state.latest_event_id}
            />
          </Section>

          {/* Actions */}
          <Section label="Actions">
            <ActionRow label="Seed data" onClick={handleSeed} disabled={loading !== null} />
            <ActionRow label="Empty data" onClick={handleEmpty} disabled={loading !== null} tone="danger" />
            <ActionRow
              label='Reset "all predicted" toast lock'
              onClick={handleResetToastLock}
              disabled={loading !== null || !userId || !state.latest_event_id}
            />
            <ActionRow
              label="Reset onboarding dismissals"
              onClick={handleResetOnboardingDismissals}
              disabled={loading !== null}
            />
          </Section>
        </div>

        {/* Message */}
        {message ? (
          <div className="border-t border-[var(--bp-line)] px-3 py-2">
            <p className="truncate text-[11px] text-[var(--bp-muted)]">{message}</p>
          </div>
        ) : null}
      </div>
    </>
  );
}

// ── primitives ────────────────────────────────────────────────────────

function Section({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1 px-3 py-2.5">
      <p className="mb-0.5 text-[9px] font-bold uppercase tracking-[0.14em] text-[var(--bp-muted)]">
        {label}
      </p>
      {children}
    </div>
  );
}

type SwitchRowProps = {
  label: string;
  description?: string;
  checked: boolean;
  disabled?: boolean;
  onChange: (checked: boolean) => void;
};

function SwitchRow({ label, description, checked, disabled, onChange }: SwitchRowProps) {
  return (
    <label className="flex items-center justify-between gap-3 py-1.5">
      <div className="min-w-0 flex-1">
        <p className="text-xs font-medium text-[var(--bp-ink)]">{label}</p>
        {description ? (
          <p className="mt-0.5 truncate text-[10px] text-[var(--bp-muted)]">{description}</p>
        ) : null}
      </div>
      <Switch.Root
        checked={checked}
        disabled={disabled}
        onCheckedChange={onChange}
        className="relative inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full border border-[var(--bp-line)] bg-[#0a0a0a] transition data-[checked]:border-[var(--bp-accent)] data-[checked]:bg-[var(--bp-accent)] data-[disabled]:cursor-not-allowed data-[disabled]:opacity-40"
      >
        <Switch.Thumb className="ml-0.5 inline-block h-3.5 w-3.5 rounded-full bg-[var(--bp-muted)] transition-transform data-[checked]:translate-x-4 data-[checked]:bg-[#0a0a0a]" />
      </Switch.Root>
    </label>
  );
}

type ActionRowProps = {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  tone?: "default" | "danger";
};

function ActionRow({ label, onClick, disabled, tone = "default" }: ActionRowProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`flex w-full items-center justify-between rounded-[6px] px-2 py-1.5 text-left text-xs font-medium transition ${
        tone === "danger"
          ? "text-[var(--bp-danger)] hover:bg-[rgba(248,113,113,0.08)]"
          : "text-[var(--bp-ink)] hover:bg-[var(--bp-card-inset)]"
      } disabled:cursor-not-allowed disabled:opacity-40`}
    >
      <span>{label}</span>
      <span className="text-[10px] text-[var(--bp-muted)]">→</span>
    </button>
  );
}
