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
  const [seedLoading, setSeedLoading] = useState<"full" | "empty" | null>(null);
  const [seedMessage, setSeedMessage] = useState<string>("");

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
      console.error("Failed to load events", error);
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
      console.error("Failed to load fights", error);
      return;
    }

    setFights((data || []) as FightRow[]);
  }

  async function runSeed(action: "full" | "empty") {
    try {
      setSeedLoading(action);
      setSeedMessage("");

      const response = await fetch("/api/dev/seed", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ action }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result?.error || "Request failed");
      }

      if (action === "full") {
        setSeedMessage(
          `Full Data complete: ${result.created_users ?? 0} users, ${result.created_predictions ?? 0} predictions`
        );
      } else {
        setSeedMessage(`Empty Data complete: ${result.deleted_users ?? 0} users removed`);
      }

      router.refresh();
      await loadEvents();
      if (selectedEventId) {
        await loadFights(selectedEventId);
      }
    } catch (error) {
      setSeedMessage(error instanceof Error ? error.message : "Seed failed");
    } finally {
      setSeedLoading(null);
    }
  }

  if (!isDev) return null;

  return (
    <div
      style={{
        position: "fixed",
        left: position.x || 16,
        top: position.y || 16,
        zIndex: 9999,
        width: open ? 420 : 180,
        background: "#111",
        color: "#fff",
        border: "1px solid #333",
        borderRadius: 12,
        boxShadow: "0 10px 30px rgba(0,0,0,0.35)",
        overflow: "hidden",
      }}
    >
      <div
        style={{
          padding: "10px 12px",
          background: dragging ? "#1f1f1f" : "#181818",
          borderBottom: open ? "1px solid #2a2a2a" : "none",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          cursor: "move",
          userSelect: "none",
        }}
        onMouseDown={(e) => {
          const startX = e.clientX - (position.x || 16);
          const startY = e.clientY - (position.y || 16);
          setDragging(true);

          const onMove = (moveEvent: MouseEvent) => {
            setPosition({
              x: moveEvent.clientX - startX,
              y: moveEvent.clientY - startY,
            });
          };

          const onUp = () => {
            setDragging(false);
            window.removeEventListener("mousemove", onMove);
            window.removeEventListener("mouseup", onUp);
          };

          window.addEventListener("mousemove", onMove);
          window.addEventListener("mouseup", onUp);
        }}
      >
        <strong>Dev Panel</strong>
        <button
          onClick={() => setOpen((v) => !v)}
          style={{
            background: "#2a2a2a",
            color: "#fff",
            border: "1px solid #3a3a3a",
            borderRadius: 8,
            padding: "4px 8px",
            cursor: "pointer",
          }}
        >
          {open ? "Close" : "Open"}
        </button>
      </div>

      {open && (
        <div style={{ padding: 12, display: "grid", gap: 12 }}>
          <div style={{ display: "grid", gap: 8 }}>
            <div style={{ fontSize: 12, opacity: 0.8 }}>Presets</div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
              <button
                onClick={() => void runSeed("full")}
                disabled={seedLoading !== null}
                style={{
                  padding: "12px 10px",
                  fontSize: 16,
                  fontWeight: 700,
                  background: "#6d28d9",
                  color: "#fff",
                  border: "1px solid #7c3aed",
                  borderRadius: 10,
                  cursor: seedLoading ? "not-allowed" : "pointer",
                  opacity: seedLoading && seedLoading !== "full" ? 0.6 : 1,
                }}
              >
                {seedLoading === "full" ? "Seeding..." : "🎭 Full Data"}
              </button>

              <button
                onClick={() => void runSeed("empty")}
                disabled={seedLoading !== null}
                style={{
                  padding: "12px 10px",
                  fontSize: 16,
                  fontWeight: 700,
                  background: "#991b1b",
                  color: "#fff",
                  border: "1px solid #b91c1c",
                  borderRadius: 10,
                  cursor: seedLoading ? "not-allowed" : "pointer",
                  opacity: seedLoading && seedLoading !== "empty" ? 0.6 : 1,
                }}
              >
                {seedLoading === "empty" ? "Clearing..." : "🗑 Empty"}
              </button>
            </div>

            {seedMessage ? (
              <div
                style={{
                  fontSize: 12,
                  lineHeight: 1.4,
                  padding: "8px 10px",
                  borderRadius: 8,
                  background: "#1a1a1a",
                  border: "1px solid #2f2f2f",
                  color: "#d4d4d4",
                }}
              >
                {seedMessage}
              </div>
            ) : null}
          </div>

          <div style={{ height: 1, background: "#2a2a2a" }} />

          <div style={{ display: "grid", gap: 8 }}>
            <div style={{ fontSize: 12, opacity: 0.8 }}>Events</div>
            <select
              value={selectedEventId}
              onChange={(e) => setSelectedEventId(e.target.value)}
              style={{
                width: "100%",
                padding: "10px 12px",
                background: "#1a1a1a",
                color: "#fff",
                border: "1px solid #333",
                borderRadius: 8,
              }}
            >
              <option value="">Select event</option>
              {events.map((event) => (
                <option key={event.id} value={event.id}>
                  {event.name} ({event.status})
                </option>
              ))}
            </select>
          </div>

          <div style={{ display: "grid", gap: 8 }}>
            <div style={{ fontSize: 12, opacity: 0.8 }}>Fights</div>
            <div
              style={{
                display: "grid",
                gap: 8,
                maxHeight: 280,
                overflowY: "auto",
              }}
            >
              {fights.length === 0 ? (
                <div
                  style={{
                    padding: 12,
                    borderRadius: 8,
                    background: "#1a1a1a",
                    border: "1px solid #2a2a2a",
                    fontSize: 13,
                    opacity: 0.8,
                  }}
                >
                  No fights found.
                </div>
              ) : (
                fights.map((fight) => {
                  const fighterALabel = getFighterLabel(fight.fighter_a, "Fighter A");
                  const fighterBLabel = getFighterLabel(fight.fighter_b, "Fighter B");
                  const winnerLabel =
                    fight.winner_id === fight.fighter_a_id
                      ? fighterALabel
                      : fight.winner_id === fight.fighter_b_id
                      ? fighterBLabel
                      : "TBD";

                  return (
                    <div
                      key={fight.id}
                      style={{
                        padding: 10,
                        borderRadius: 8,
                        background: "#1a1a1a",
                        border: "1px solid #2a2a2a",
                        display: "grid",
                        gap: 4,
                      }}
                    >
                      <div style={{ fontWeight: 600 }}>
                        {fighterALabel} vs {fighterBLabel}
                      </div>
                      <div style={{ fontSize: 12, opacity: 0.8 }}>
                        Status: {fight.status}
                      </div>
                      <div style={{ fontSize: 12, opacity: 0.8 }}>
                        Winner: {winnerLabel}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
