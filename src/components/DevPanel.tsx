"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createBrowserSupabaseClient } from "@/lib/supabase";

type EventRow = {
  id: string;
  name: string;
  status: "upcoming" | "live" | "completed" | string;
};

type FightRow = {
  id: string;
  event_id: string;
  fighter_a_id: string | null;
  fighter_b_id: string | null;
  winner_id: string | null;
  status: "upcoming" | "completed" | string;
  start_time: string;
  fighter_a?: {
    id: string;
    ring_name: string | null;
    name?: string | null;
  } | null;
  fighter_b?: {
    id: string;
    ring_name: string | null;
    name?: string | null;
  } | null;
};

const isDev = process.env.NODE_ENV === "development";

function getFighterLabel(
  fighter:
    | {
        id: string;
        ring_name: string | null;
        name?: string | null;
      }
    | null
    | undefined,
  fallback: string
) {
  if (!fighter) return fallback;
  return fighter.ring_name || fighter.name || fallback;
}

export default function DevPanel() {
  const router = useRouter();
  const supabase = useMemo(() => createBrowserSupabaseClient(), []);

  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const [events, setEvents] = useState<EventRow[]>([]);
  const [selectedEventId, setSelectedEventId] = useState<string>("");
  const [fights, setFights] = useState<FightRow[]>([]);

  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [dragging, setDragging] = useState(false);

  useEffect(() => {
    if (!isDev) return;
    void loadEvents();
  }, []);

  useEffect(() => {
    if (!isDev) return;
    if (!selectedEventId) {
      setFights([]);
      return;
    }
    void loadFights(selectedEventId);
  }, [selectedEventId]);

  async function loadEvents() {
    const { data, error } = await supabase
      .from("events")
      .select("id, name, status")
      .order("name", { ascending: true });

    if (error) {
      console.error("Failed to load events:", error);
      return;
    }

    const rows = (data || []) as EventRow[];
    setEvents(rows);

    if (!selectedEventId && rows.length > 0) {
      setSelectedEventId(rows[0].id);
    }
  }

  async function loadFights(eventId: string) {
    const { data, error } = await supabase
      .from("fights")
      .select(
        `
        id,
        event_id,
        fighter_a_id,
        fighter_b_id,
        winner_id,
        status,
        start_time,
        fighter_a:fighters!fighter_a_id ( id, ring_name, name ),
        fighter_b:fighters!fighter_b_id ( id, ring_name, name )
      `
      )
      .eq("event_id", eventId)
      .order("start_time", { ascending: true });

    if (error) {
      console.error("Failed to load fights:", error);
      return;
    }

    setFights((data || []) as FightRow[]);
  }

  async function runAction(action: () => Promise<void>) {
    try {
      setLoading(true);
      await action();
      await loadEvents();
      if (selectedEventId) {
        await loadFights(selectedEventId);
      }
      router.refresh();
    } catch (error) {
      console.error(error);
      alert("Dev action failed. Check console.");
    } finally {
      setLoading(false);
    }
  }

  async function updateEventStatus(status: "upcoming" | "live" | "completed") {
    if (!selectedEventId) return;

    await runAction(async () => {
      const { error } = await supabase
        .from("events")
        .update({ status })
        .eq("id", selectedEventId);

      if (error) throw error;
    });
  }

  async function toggleFightStatus(fight: FightRow) {
    const nextStatus = fight.status === "completed" ? "upcoming" : "completed";

    await runAction(async () => {
      const payload: Record<string, unknown> = { status: nextStatus };

      if (nextStatus === "upcoming") {
        payload.winner_id = null;
      }

      const { error } = await supabase
        .from("fights")
        .update(payload)
        .eq("id", fight.id);

      if (error) throw error;
    });
  }

  async function setFightWinner(fight: FightRow, winnerId: string | null) {
    await runAction(async () => {
      const payload: Record<string, unknown> = {
        winner_id: winnerId,
        status: winnerId ? "completed" : "upcoming",
      };

      const { error } = await supabase
        .from("fights")
        .update(payload)
        .eq("id", fight.id);

      if (error) throw error;
    });
  }

  // Test user functions disabled — users table requires auth.users FK
  // Will be enabled when auth flow is complete

  async function resetAllEventsToUpcoming() {
    await runAction(async () => {
      const { error: eventError } = await supabase
        .from("events")
        .update({ status: "upcoming" })
        .neq("id", "00000000-0000-0000-0000-000000000000");

      if (eventError) throw eventError;

      const { error: fightError } = await supabase
        .from("fights")
        .update({ status: "upcoming", winner_id: null })
        .neq("id", "00000000-0000-0000-0000-000000000000");

      if (fightError) throw fightError;
    });
  }

  async function setMongoliaVsChinaToLive() {
    await runAction(async () => {
      const targetEvent = events.find((event) =>
        event.name.toLowerCase().includes("mongolia vs china")
      );

      if (!targetEvent) {
        throw new Error('Event "Mongolia vs China" not found');
      }

      const { error } = await supabase
        .from("events")
        .update({ status: "live" })
        .eq("id", targetEvent.id);

      if (error) throw error;

      setSelectedEventId(targetEvent.id);
    });
  }

  function onDragStart(e: React.MouseEvent<HTMLDivElement>) {
    const panel = e.currentTarget.parentElement;
    if (!panel) return;

    const rect = panel.getBoundingClientRect();
    setDragging(true);
    setPosition({
      x: window.innerWidth - rect.right,
      y: window.innerHeight - rect.bottom,
    });
  }

  useEffect(() => {
    if (!dragging) return;

    function onMouseMove(e: MouseEvent) {
      const panelWidth = 380;
      const panelHeight = 560;

      const right = Math.max(8, window.innerWidth - e.clientX - panelWidth / 2);
      const bottom = Math.max(8, window.innerHeight - e.clientY - 20);

      setPosition({
        x: right,
        y: bottom,
      });
    }

    function onMouseUp() {
      setDragging(false);
    }

    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);

    return () => {
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
    };
  }, [dragging]);

  if (!isDev) return null;

  return (
    <div
      className="fixed z-[9999]"
      style={{
        right: position.x || 16,
        bottom: position.y || 16,
      }}
    >
      {!open ? (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="rounded-full border border-white/10 bg-black/70 px-3 py-2 text-xs text-white/80 shadow-lg backdrop-blur transition hover:bg-black/90 hover:text-white"
        >
          🛠 Dev
        </button>
      ) : (
        <div className="w-[380px] max-w-[calc(100vw-24px)] overflow-hidden rounded-2xl border border-white/10 bg-zinc-950/95 text-white shadow-2xl backdrop-blur">
          <div
            onMouseDown={onDragStart}
            className="flex cursor-move items-center justify-between border-b border-white/10 bg-white/5 px-4 py-3"
          >
            <div>
              <p className="text-sm font-semibold">Dev Panel</p>
              <p className="text-[11px] text-white/50">Black Pick testing controls</p>
            </div>

            <button
              type="button"
              onClick={() => setOpen(false)}
              className="rounded-md px-2 py-1 text-xs text-white/60 hover:bg-white/10 hover:text-white"
            >
              Close
            </button>
          </div>

          <div className="max-h-[70vh] space-y-5 overflow-y-auto p-4">
            <section className="space-y-3">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-white/50">
                Event Controls
              </h3>

              <select
                value={selectedEventId}
                onChange={(e) => setSelectedEventId(e.target.value)}
                className="w-full rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-sm text-white outline-none"
              >
                <option value="">Select event</option>
                {events.map((event) => (
                  <option key={event.id} value={event.id}>
                    {event.name} ({event.status})
                  </option>
                ))}
              </select>

              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  disabled={!selectedEventId || loading}
                  onClick={() => updateEventStatus("upcoming")}
                  className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-xs hover:bg-white/10 disabled:opacity-40"
                >
                  Upcoming
                </button>
                <button
                  type="button"
                  disabled={!selectedEventId || loading}
                  onClick={() => updateEventStatus("live")}
                  className="rounded-lg border border-emerald-500/20 bg-emerald-500/10 px-3 py-2 text-xs text-emerald-300 hover:bg-emerald-500/20 disabled:opacity-40"
                >
                  Live
                </button>
                <button
                  type="button"
                  disabled={!selectedEventId || loading}
                  onClick={() => updateEventStatus("completed")}
                  className="rounded-lg border border-blue-500/20 bg-blue-500/10 px-3 py-2 text-xs text-blue-300 hover:bg-blue-500/20 disabled:opacity-40"
                >
                  Completed
                </button>
              </div>
            </section>

            <section className="space-y-3">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-white/50">
                Fight Controls
              </h3>

              {!selectedEventId ? (
                <p className="text-sm text-white/50">Select an event to manage fights.</p>
              ) : fights.length === 0 ? (
                <p className="text-sm text-white/50">No fights found for this event.</p>
              ) : (
                <div className="space-y-3">
                  {fights.map((fight, index) => {
                    const fighterAName = getFighterLabel(fight.fighter_a, "Fighter A");
                    const fighterBName = getFighterLabel(fight.fighter_b, "Fighter B");

                    return (
                      <div
                        key={fight.id}
                        className="rounded-xl border border-white/10 bg-white/[0.03] p-3"
                      >
                        <div className="mb-2 flex items-center justify-between gap-3">
                          <p className="text-sm font-medium">
                            Fight {index + 1}: {fighterAName} vs {fighterBName}
                          </p>
                          <span className="rounded-full bg-white/10 px-2 py-1 text-[10px] uppercase tracking-wide text-white/60">
                            {fight.status}
                          </span>
                        </div>

                        <div className="flex flex-wrap gap-2">
                          <button
                            type="button"
                            disabled={loading}
                            onClick={() => toggleFightStatus(fight)}
                            className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-xs hover:bg-white/10 disabled:opacity-40"
                          >
                            Toggle Status
                          </button>

                          <button
                            type="button"
                            disabled={!fight.fighter_a_id || loading}
                            onClick={() => setFightWinner(fight, fight.fighter_a_id)}
                            className={`rounded-lg px-3 py-2 text-xs ${
                              fight.winner_id === fight.fighter_a_id
                                ? "border border-emerald-500/30 bg-emerald-500/20 text-emerald-300"
                                : "border border-white/10 bg-white/5 hover:bg-white/10"
                            } disabled:opacity-40`}
                          >
                            Winner: A
                          </button>

                          <button
                            type="button"
                            disabled={!fight.fighter_b_id || loading}
                            onClick={() => setFightWinner(fight, fight.fighter_b_id)}
                            className={`rounded-lg px-3 py-2 text-xs ${
                              fight.winner_id === fight.fighter_b_id
                                ? "border border-emerald-500/30 bg-emerald-500/20 text-emerald-300"
                                : "border border-white/10 bg-white/5 hover:bg-white/10"
                            } disabled:opacity-40`}
                          >
                            Winner: B
                          </button>

                          <button
                            type="button"
                            disabled={loading}
                            onClick={() => setFightWinner(fight, null)}
                            className="rounded-lg border border-red-500/20 bg-red-500/10 px-3 py-2 text-xs text-red-300 hover:bg-red-500/20 disabled:opacity-40"
                          >
                            Clear Winner
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </section>

            <section className="space-y-3">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-white/50">
                Quick Actions
              </h3>
            </section>

            <section className="space-y-3">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-white/50">
                Quick Actions
              </h3>

              <div className="grid grid-cols-1 gap-2">
                <button
                  type="button"
                  disabled={loading}
                  onClick={resetAllEventsToUpcoming}
                  className="rounded-lg border border-yellow-500/20 bg-yellow-500/10 px-3 py-2 text-left text-sm text-yellow-200 hover:bg-yellow-500/20 disabled:opacity-40"
                >
                  Reset All Events to Upcoming
                </button>

                <button
                  type="button"
                  disabled={loading}
                  onClick={setMongoliaVsChinaToLive}
                  className="rounded-lg border border-emerald-500/20 bg-emerald-500/10 px-3 py-2 text-left text-sm text-emerald-300 hover:bg-emerald-500/20 disabled:opacity-40"
                >
                  Set Mongolia vs China to Live
                </button>
              </div>
            </section>

            {loading && (
              <div className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-xs text-white/60">
                Running dev action...
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
