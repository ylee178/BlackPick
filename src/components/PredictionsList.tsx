"use client";

import { useState, useMemo } from "react";
import { Link } from "@/i18n/navigation";
import { useI18n } from "@/lib/i18n-provider";
import { Search, Check, X, ChevronDown, Filter, ArrowUpDown } from "lucide-react";
import { RetroLabel } from "@/components/ui/retro";

type PredItem = {
  id: string; createdAt: string;
  winnerCorrect: boolean | null; methodCorrect: boolean | null; roundCorrect: boolean | null;
  score: number | null; predMethod: string | null; predRound: number | null;
  fightMethod: string | null; fightRound: number | null;
  winnerLabel: string; loserLabel: string;
  winnerFlag: string; loserFlag: string;
  avatarUrl: string | null; avatarInitial: string;
  fighterAName: string; fighterBName: string;
  fighterAFlag: string; fighterBFlag: string;
  fighterAAvatarUrl: string | null; fighterBAvatarUrl: string | null;
  fighterAInitial: string; fighterBInitial: string;
  myPickName: string;
  eventId: string; eventName: string; eventDate: string;
};

type SortKey = "newest" | "oldest" | "scoreHigh" | "scoreLow";
type StatusFilter = "all" | "correct" | "wrong";

function Dropdown({ label, open, onToggle, children }: { label: React.ReactNode; open: boolean; onToggle: () => void; children: React.ReactNode }) {
  return (
    <div className="relative">
      <button
        onClick={onToggle}
        className="flex h-10 cursor-pointer items-center gap-1.5 rounded-[10px] border border-[rgba(255,255,255,0.08)] bg-[#0a0a0a] px-3 text-sm text-[var(--bp-muted)] transition hover:border-[rgba(255,255,255,0.15)] hover:text-[var(--bp-ink)]"
      >
        {label}
        <ChevronDown className={`h-3.5 w-3.5 transition ${open ? "rotate-180" : ""}`} strokeWidth={2} />
      </button>
      {open && (
        <div className="absolute right-0 top-full z-10 mt-1 min-w-[180px] rounded-[10px] border border-[rgba(255,255,255,0.08)] bg-[#111] py-1 shadow-lg">
          {children}
        </div>
      )}
    </div>
  );
}

export default function PredictionsList({ items, perfectEventIds: perfectEventIdsArr = [] }: { items: PredItem[]; perfectEventIds?: string[] }) {
  const perfectEventIds = new Set(perfectEventIdsArr);
  const { t } = useI18n();
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<SortKey>("newest");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [selectedEvents, setSelectedEvents] = useState<Set<string>>(new Set());
  const [sortOpen, setSortOpen] = useState(false);
  const [eventOpen, setEventOpen] = useState(false);

  const sortLabels: Record<SortKey, string> = {
    newest: t("myRecord.sortNewest"),
    oldest: t("myRecord.sortOldest"),
    scoreHigh: t("myRecord.sortScoreHigh"),
    scoreLow: t("myRecord.sortScoreLow"),
  };

  const statusLabels: Record<StatusFilter, string> = {
    all: t("myRecord.rangeAll") || "전체",
    correct: t("event.win") || "맞춤",
    wrong: t("event.loss") || "틀림",
  };

  // Unique events for filter
  const allEvents = useMemo(() => {
    const map = new Map<string, string>();
    for (const p of items) {
      if (!map.has(p.eventId)) map.set(p.eventId, p.eventName);
    }
    return Array.from(map.entries());
  }, [items]);

  const toggleEvent = (id: string) => {
    setSelectedEvents((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };


  const filtered = useMemo(() => {
    let list = items;
    if (query.trim()) {
      const q = query.toLowerCase();
      list = list.filter((p) =>
        p.fighterAName.toLowerCase().includes(q) ||
        p.fighterBName.toLowerCase().includes(q) ||
        p.eventName.toLowerCase().includes(q)
      );
    }
    if (selectedEvents.size > 0) {
      list = list.filter((p) => selectedEvents.has(p.eventId));
    }
    if (statusFilter === "correct") list = list.filter((p) => p.winnerCorrect === true);
    else if (statusFilter === "wrong") list = list.filter((p) => p.winnerCorrect === false);

    switch (sort) {
      case "oldest": list = [...list].sort((a, b) => a.createdAt.localeCompare(b.createdAt)); break;
      case "scoreHigh": list = [...list].sort((a, b) => (b.score ?? 0) - (a.score ?? 0)); break;
      case "scoreLow": list = [...list].sort((a, b) => (a.score ?? 0) - (b.score ?? 0)); break;
      default: break;
    }
    return list;
  }, [items, query, sort, statusFilter, selectedEvents]);

  // Group by event
  const grouped = useMemo(() => {
    const map = new Map<string, { eventName: string; eventDate: string; eventId: string; items: PredItem[] }>();
    for (const item of filtered) {
      const key = item.eventId;
      if (!map.has(key)) {
        map.set(key, { eventName: item.eventName, eventDate: item.eventDate, eventId: item.eventId, items: [] });
      }
      map.get(key)!.items.push(item);
    }
    return Array.from(map.values());
  }, [filtered]);

  const eventFilterLabel = selectedEvents.size === 0
    ? (t("myRecord.rangeAll") || "전체")
    : `${selectedEvents.size}개 대회`;

  return (
    <div>
      {/* Status tabs + toolbar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        {/* Status tabs */}
        <div className="inline-flex rounded-[10px] border border-[rgba(255,255,255,0.08)] bg-[#0a0a0a] p-1">
          {(Object.keys(statusLabels) as StatusFilter[]).map((key) => (
            <button
              key={key}
              onClick={() => setStatusFilter(key)}
              className={`cursor-pointer rounded-[8px] px-3.5 py-1.5 text-sm font-semibold transition ${
                statusFilter === key
                  ? "bg-[var(--bp-accent)] text-[#050505]"
                  : "text-[var(--bp-muted)] hover:text-[var(--bp-ink)]"
              }`}
            >
              {statusLabels[key]}
            </button>
          ))}
        </div>

        {/* Search + filters + sort */}
        <div className="flex items-center gap-2">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--bp-muted)]" strokeWidth={1.8} />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={t("myRecord.searchPlaceholder")}
              className="h-10 w-48 rounded-[10px] border border-[rgba(255,255,255,0.08)] bg-[#0a0a0a] pl-9 pr-3 text-sm text-[var(--bp-ink)] placeholder:text-[var(--bp-muted)] focus:border-[var(--bp-accent)] focus:outline-none"
            />
          </div>

          {/* Event filter */}
          <Dropdown
            label={<><Filter className="h-3.5 w-3.5" strokeWidth={2} />{eventFilterLabel}</>}
            open={eventOpen}
            onToggle={() => { setEventOpen(!eventOpen); setSortOpen(false); }}
          >
            <button
              onClick={() => setSelectedEvents(new Set())}
              className={`flex w-full cursor-pointer items-center px-3 py-2 text-left text-sm transition hover:bg-[rgba(255,255,255,0.04)] ${
                selectedEvents.size === 0 ? "font-semibold text-[var(--bp-accent)]" : "text-[var(--bp-muted)]"
              }`}
            >
              {t("myRecord.rangeAll") || "전체"}
            </button>
            <div className="max-h-48 overflow-y-auto">
              {allEvents.map(([id, name]) => (
                <label key={id} className="flex cursor-pointer items-center gap-2 px-3 py-2 text-sm text-[var(--bp-muted)] transition hover:bg-[rgba(255,255,255,0.04)]">
                  <input
                    type="checkbox"
                    checked={selectedEvents.has(id)}
                    onChange={() => toggleEvent(id)}
                    className="h-3.5 w-3.5 accent-[var(--bp-accent)]"
                  />
                  <span className="truncate">{name}</span>
                </label>
              ))}
            </div>
          </Dropdown>

          {/* Sort */}
          <Dropdown
            label={<><ArrowUpDown className="h-3.5 w-3.5" strokeWidth={2} />{sortLabels[sort]}</>}
            open={sortOpen}
            onToggle={() => { setSortOpen(!sortOpen); setEventOpen(false); }}
          >
            {(Object.keys(sortLabels) as SortKey[]).map((key) => (
              <button
                key={key}
                onClick={() => { setSort(key); setSortOpen(false); }}
                className={`flex w-full cursor-pointer items-center px-3 py-2 text-left text-sm transition hover:bg-[rgba(255,255,255,0.04)] ${
                  sort === key ? "font-semibold text-[var(--bp-accent)]" : "text-[var(--bp-muted)]"
                }`}
              >
                {sortLabels[key]}
              </button>
            ))}
          </Dropdown>
        </div>
      </div>

      {/* Grouped predictions */}
      {grouped.length === 0 ? (
        <p className="mt-10 text-center text-sm text-[var(--bp-muted)]">{t("myRecord.noPredictions")}</p>
      ) : (
        <div className="mt-4 space-y-6">
          {grouped.map((group) => {
            const settled = group.items.filter((p) => p.winnerCorrect !== null);
            const wins = settled.filter((p) => p.winnerCorrect === true).length;
            const losses = settled.filter((p) => p.winnerCorrect === false).length;
            const totalScore = settled.reduce((s, p) => s + (p.score ?? 0), 0);
            const winRate = wins + losses > 0 ? Math.round((wins / (wins + losses)) * 100) : 0;
            const isUpcoming = settled.length === 0;

            return (
            <div key={group.eventId} className={isUpcoming ? "pt-6" : ""}>
              {/* Event header */}
              <div className="mb-4 flex items-center justify-between gap-2">
                <Link
                  href={`/my-record/${group.eventId}`}
                  className="flex min-w-0 items-center gap-2 text-sm font-semibold text-[var(--bp-ink)] transition hover:text-[var(--bp-accent)]"
                >
                  <span className="truncate">{group.eventName}</span>
                  <span className="shrink-0 text-xs font-normal text-[var(--bp-muted)]">{group.eventDate}</span>
                  {isUpcoming && <RetroLabel size="xs" tone="info">{t("status.upcoming")}</RetroLabel>}
                  {!isUpcoming && perfectEventIds.has(group.eventId) && <RetroLabel size="xs" tone="accent">Perfect Prediction</RetroLabel>}
                </Link>
                {!isUpcoming && (
                  <div className="flex shrink-0 items-center gap-1 rounded-[8px] border border-[rgba(255,255,255,0.06)] bg-[#0a0a0a] px-2.5 py-1 text-xs tabular-nums text-[var(--bp-muted)]">
                    <span className="text-[#4ade80]">{wins}W</span><span className="text-[#f87171]">{losses}L</span>
                    <span className="mx-1.5 text-[rgba(255,255,255,0.15)]">·</span>
                    <span>{winRate}%</span>
                    <span className="mx-1.5 text-[rgba(255,255,255,0.15)]">·</span>
                    <span className={totalScore >= 0 ? "font-semibold text-[#4ade80]" : "font-semibold text-[#f87171]"}>
                      {totalScore > 0 ? "+" : ""}{totalScore}pt
                    </span>
                  </div>
                )}
              </div>

              {/* Prediction cards — responsive grid */}
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
                {group.items.map((p) => {
                  const isPending = p.winnerCorrect === null;
                  const details: { text: string; ok: boolean }[] = [];
                  if (!isPending) {
                    if (p.winnerCorrect) {
                      details.push({ text: t("myRecord.winnerCorrect"), ok: true });
                    } else {
                      details.push({ text: t("myRecord.winnerWrong"), ok: false });
                    }
                  }
                  if (p.methodCorrect === true) details.push({ text: t("myRecord.methodCorrect"), ok: true });
                  else if (p.methodCorrect === false) details.push({ text: t("myRecord.methodWrong"), ok: false });
                  if (p.roundCorrect === true) details.push({ text: t("myRecord.roundCorrect"), ok: true });
                  else if (p.roundCorrect === false) details.push({ text: t("myRecord.roundWrong"), ok: false });

                  const isMyPickA = p.myPickName === p.fighterAName;
                  const myPickFlag = isMyPickA ? p.fighterAFlag : p.fighterBFlag;
                  const myPickAvatar = isMyPickA ? p.fighterAAvatarUrl : p.fighterBAvatarUrl;
                  const myPickInitial = isMyPickA ? p.fighterAInitial : p.fighterBInitial;
                  const opponentName = isMyPickA ? p.fighterBName : p.fighterAName;
                  const opponentFlag = isMyPickA ? p.fighterBFlag : p.fighterAFlag;

                  const displayName = isPending ? p.myPickName : p.winnerLabel;
                  const displayFlag = isPending ? myPickFlag : p.winnerFlag;
                  const displayAvatar = isPending ? myPickAvatar : p.avatarUrl;
                  const displayInitial = isPending ? myPickInitial : p.avatarInitial;
                  const vsName = isPending ? opponentName : p.loserLabel;
                  const vsFlag = isPending ? opponentFlag : p.loserFlag;

                  return (
                    <div
                      key={p.id}
                      className="flex flex-col rounded-[12px] border border-[rgba(255,255,255,0.04)] bg-[#0d0d0d] p-3"
                    >
                      {/* Top: avatar + matchup + score/hourglass */}
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full border border-[rgba(255,255,255,0.08)] bg-[#2a2a2a]">
                          {displayAvatar ? (
                            <img src={displayAvatar} alt={displayName} className="h-full w-full object-cover" />
                          ) : (
                            <span className="text-sm font-bold text-[var(--bp-muted)]">{displayInitial}</span>
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-semibold text-[var(--bp-ink)]">
                            {displayName} {displayFlag}
                          </p>
                          <p className="truncate text-xs text-[var(--bp-muted)]">
                            vs <span className="opacity-40">{vsName} {vsFlag}</span>
                          </p>
                        </div>
                        <div className="ml-auto shrink-0">
                          {isPending ? (
                            <span className="text-xs text-[var(--bp-muted)]">{t("common.pending")}</span>
                          ) : (
                            <p className={`text-lg font-bold tabular-nums ${p.winnerCorrect ? "text-[#4ade80]" : "text-[#f87171]"}`}>
                              {p.winnerCorrect && typeof p.score === "number" ? `+${p.score}` : p.score}
                            </p>
                          )}
                        </div>
                      </div>

                      {/* Bottom: pending = prediction details, settled = result details */}
                      <div className="mt-3 border-t border-[rgba(255,255,255,0.04)] pt-3">
                        <p className="text-xs leading-5 text-[var(--bp-muted)]">
                          {isPending
                            ? <><span className="text-[rgba(255,255,255,0.65)]">{t("prediction.yourPick")}</span>: {[p.myPickName, p.predMethod, p.predRound ? `R${p.predRound}` : null].filter(Boolean).join(" · ")}</>
                            : <>{p.fightMethod}{p.fightRound ? ` · R${p.fightRound}` : ""}</>
                          }
                        </p>
                        {!isPending && details.length > 0 && (
                          <div className="flex flex-wrap items-center gap-x-1.5 text-xs">
                            {details.map((d, i) => (
                              <span key={i} className="inline-flex items-center gap-0.5">
                                {i > 0 && <span className="mr-1 text-[var(--bp-muted)]">·</span>}
                                {d.ok
                                  ? <Check className="h-3 w-3 text-[#4ade80]" strokeWidth={2.5} />
                                  : <X className="h-3 w-3 text-[#f87171]" strokeWidth={2.5} />}
                                <span className="text-[var(--bp-muted)]">{d.text}</span>
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
