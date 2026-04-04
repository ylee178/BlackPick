import Link from "next/link";
import { createSupabaseServer } from "@/lib/supabase-server";
import { getSeriesLabel } from "@/lib/constants";
import { getTranslations } from "@/lib/i18n-server";
import TerminalClock from "./TerminalClock";

export const dynamic = "force-dynamic";

export default async function TerminalPage() {
  const supabase = await createSupabaseServer();
  const { t } = await getTranslations();

  const [{ data: events }, { count: fighterCount }, { data: topUsers }, { data: recentFights }] =
    await Promise.all([
      supabase.from("events").select("id, name, date, status, series_type").order("date", { ascending: false }).limit(10),
      supabase.from("fighters").select("*", { count: "exact", head: true }),
      supabase.from("users").select("ring_name, score, wins, losses, current_streak, best_streak, hall_of_fame_count").order("score", { ascending: false }).limit(5),
      supabase.from("fights").select("id, status, winner_id, fighter_a:fighters!fighter_a_id(name, ring_name), fighter_b:fighters!fighter_b_id(name, ring_name)").eq("status", "completed").not("winner_id", "is", null).order("created_at", { ascending: false }).limit(8),
    ]);

  const upcoming = (events ?? []).filter((e) => e.status === "upcoming" || e.status === "live");
  const completed = (events ?? []).filter((e) => e.status === "completed");
  const featured = upcoming[0] ?? null;

  const dday = featured
    ? Math.ceil((new Date(featured.date).getTime() - Date.now()) / 86400000)
    : 0;

  return (
    <div
      className="min-h-screen font-mono text-[#ffba3c]"
      style={{ background: "#0c0800", fontFamily: "'Courier New', 'Consolas', monospace" }}
    >
      <div className="mx-auto max-w-6xl p-4 md:p-8">

        {/* ── Header bar ── */}
        <div className="flex items-start justify-between border border-[#ffba3c]/30 p-4">
          <div>
            <p className="text-xs text-[#ffba3c]/60">Node: BLACK_PICK_MAIN</p>
            <p className="text-xs text-[#ffba3c]/60">Status: <span className="text-[#ffba3c]">ONLINE</span></p>
          </div>
          <p className="text-center text-sm font-bold tracking-wider">Fight Telemetry Utility</p>
          <TerminalClock />
        </div>

        {/* ── Title ── */}
        <div className="mt-4 flex justify-center">
          <span className="border border-[#ffba3c] px-4 py-1 text-sm font-bold tracking-[0.3em]">
            BLACK PICK DASHBOARD
          </span>
        </div>

        {/* ── Row 1: Next Event + System States ── */}
        <div className="mt-8 grid gap-8 md:grid-cols-2">
          {/* Next Event */}
          <div>
            <p className="text-xs text-[#ffba3c]/60">Active Mission</p>
            <div className="mt-2 border border-[#ffba3c]/30 p-4">
              {featured ? (
                <>
                  <div className="flex items-center justify-between">
                    <p className="text-lg font-bold">{featured.name}</p>
                    <span className="text-xs text-[#ffba3c]/60">{getSeriesLabel(featured.series_type, t)}</span>
                  </div>
                  <div className="mt-3 flex items-center gap-4">
                    <span className="text-sm">{featured.date}</span>
                    <span className="font-bold">T-{dday > 0 ? dday : 0} DAYS</span>
                  </div>

                  {/* Progress bar */}
                  <div className="mt-4">
                    <div className="flex justify-between text-[10px] text-[#ffba3c]/60">
                      <span>Countdown</span>
                      <span>Target: {featured.date}</span>
                    </div>
                    <div className="mt-1 h-4 border border-[#ffba3c]/40">
                      <div
                        className="h-full"
                        style={{
                          width: `${Math.max(5, Math.min(95, 100 - (dday / 30) * 100))}%`,
                          background: `repeating-linear-gradient(90deg, #ffba3c 0px, #ffba3c 4px, transparent 4px, transparent 6px)`,
                        }}
                      />
                    </div>
                    <p className="mt-1 text-[10px] text-[#ffba3c]/60">
                      Status: {featured.status === "live" ? "LIVE_ENGAGEMENT" : "AWAITING_START"}
                    </p>
                  </div>

                  <Link
                    href={`/events/${featured.id}`}
                    className="mt-4 inline-block border border-[#ffba3c] px-4 py-1.5 text-xs font-bold tracking-wider transition hover:bg-[#ffba3c] hover:text-black"
                  >
                    ENGAGE &gt;&gt;
                  </Link>
                </>
              ) : (
                <p className="text-sm text-[#ffba3c]/50">NO_ACTIVE_MISSION</p>
              )}
            </div>
          </div>

          {/* System States */}
          <div>
            <p className="text-xs text-[#ffba3c]/60">System States</p>
            <div className="mt-2 border border-[#ffba3c]/30 p-4">
              <table className="w-full text-sm">
                <tbody>
                  <tr>
                    <td className="py-1 pr-4 text-[#ffba3c]/60">EVT:</td>
                    <td className="py-1 font-bold">{(events ?? []).length}</td>
                    <td className="py-1 px-4 text-[#ffba3c]/60">FTR:</td>
                    <td className="py-1 font-bold">{fighterCount ?? 0}</td>
                  </tr>
                  <tr>
                    <td className="py-1 pr-4 text-[#ffba3c]/60">UPC:</td>
                    <td className="py-1 font-bold">{upcoming.length}</td>
                    <td className="py-1 px-4 text-[#ffba3c]/60">CMP:</td>
                    <td className="py-1 font-bold">{completed.length}</td>
                  </tr>
                  <tr>
                    <td className="py-1 pr-4 text-[#ffba3c]/60">USR:</td>
                    <td className="py-1 font-bold">{(topUsers ?? []).length > 0 ? "ACTIVE" : "IDLE"}</td>
                    <td className="py-1 px-4 text-[#ffba3c]/60">SYS:</td>
                    <td className="py-1 font-bold">NOMINAL</td>
                  </tr>
                </tbody>
              </table>

              <div className="mt-4 border-t border-dashed border-[#ffba3c]/20 pt-3 text-center">
                <p className="text-sm">Overall Integrity: <span className="font-bold">100%</span></p>
              </div>
            </div>
          </div>
        </div>

        {/* ── Row 2: Ranking Telemetry + Event Log ── */}
        <div className="mt-8 grid gap-8 md:grid-cols-2">
          {/* Ranking */}
          <div>
            <p className="text-xs text-[#ffba3c]/60">Combatant Rankings (Top 5)</p>
            <div className="mt-2 border border-[#ffba3c]/30 p-4">
              {(topUsers ?? []).length === 0 ? (
                <p className="text-sm text-[#ffba3c]/50">NO_COMBATANT_DATA</p>
              ) : (
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-[#ffba3c]/20 text-[#ffba3c]/60">
                      <th className="pb-2 text-left">#</th>
                      <th className="pb-2 text-left">CALLSIGN</th>
                      <th className="pb-2 text-right">W/L</th>
                      <th className="pb-2 text-right">STK</th>
                      <th className="pb-2 text-right">PTS</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(topUsers ?? []).map((u: any, i: number) => (
                      <tr key={i} className="border-b border-[#ffba3c]/10">
                        <td className="py-1.5 font-bold">{i + 1}</td>
                        <td className="py-1.5 font-bold">{u.ring_name}</td>
                        <td className="py-1.5 text-right">{u.wins}/{u.losses}</td>
                        <td className="py-1.5 text-right">{u.current_streak}</td>
                        <td className="py-1.5 text-right font-bold">{u.score}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}

              <Link
                href="/ranking"
                className="mt-3 inline-block text-[10px] tracking-wider text-[#ffba3c]/60 underline underline-offset-2 hover:text-[#ffba3c]"
              >
                FULL_RANKINGS &gt;&gt;
              </Link>
            </div>
          </div>

          {/* Event Log */}
          <div>
            <p className="text-xs text-[#ffba3c]/60">System Event Log</p>
            <div className="mt-2 border border-[#ffba3c]/30 p-4">
              {(recentFights ?? []).map((fight: any, i: number) => {
                const fa = fight.fighter_a?.ring_name || fight.fighter_a?.name || "???";
                const fb = fight.fighter_b?.ring_name || fight.fighter_b?.name || "???";
                const winner = fight.winner_id === fight.fighter_a?.id ? fa : fb;
                return (
                  <p key={fight.id} className={`py-0.5 text-xs ${i === 0 ? "text-[#ffba3c]" : "text-[#ffba3c]/70"}`}>
                    {String(i).padStart(2, "0")}:{String(i * 7 + 15).padStart(2, "0")} - RESULT: {winner} DEF. {winner === fa ? fb : fa}
                  </p>
                );
              })}
            </div>
          </div>
        </div>

        {/* ── Row 3: Upcoming missions ── */}
        {upcoming.length > 0 && (
          <div className="mt-8">
            <p className="text-xs text-[#ffba3c]/60">Queued Missions ({upcoming.length})</p>
            <div className="mt-2 border border-[#ffba3c]/30 p-4">
              {upcoming.map((ev) => (
                <Link
                  key={ev.id}
                  href={`/events/${ev.id}`}
                  className="flex items-center justify-between border-b border-[#ffba3c]/10 py-2 text-sm transition hover:text-[#ffd06b] last:border-0"
                >
                  <span>{ev.name}</span>
                  <span className="text-xs text-[#ffba3c]/60">{ev.date}</span>
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* ── Footer ── */}
        <div className="mt-8 flex items-center gap-2 text-xs text-[#ffba3c]/50">
          <span className="animate-pulse">_</span>
          <span>AWAITING INPUT...</span>
        </div>

        {/* Back to normal view */}
        <div className="mt-4">
          <Link href="/" className="text-[10px] tracking-wider text-[#ffba3c]/40 underline underline-offset-2 hover:text-[#ffba3c]">
            EXIT_TERMINAL &gt;&gt; STANDARD_VIEW
          </Link>
        </div>
      </div>
    </div>
  );
}
