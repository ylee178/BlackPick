"use client";

import { useState, useMemo } from "react";
import { Link } from "@/i18n/navigation";
import { useI18n } from "@/lib/i18n-provider";
import { WLRecord } from "@/components/ui/ranking";
import { Search } from "lucide-react";
import { retroPanelClassName } from "@/components/ui/retro";
import { parseRecord } from "@/lib/parse-record";
import FighterAvatar from "@/components/FighterAvatar";

type FighterItem = {
  id: string;
  name: string;
  record: string;
  flag: string;
  avatarUrl: string | null;
  weightClass: string | null;
  hasPixelArt?: boolean;
};

export default function FighterGrid({ items }: { items: FighterItem[] }) {
  const { t } = useI18n();
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    if (!query.trim()) return items;
    const q = query.toLowerCase();
    return items.filter((f) => f.name.toLowerCase().includes(q));
  }, [items, query]);

  return (
    <div>
      {/* Search */}
      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--bp-muted)]" strokeWidth={1.8} />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={t("myRecord.searchFighter")}
          className="h-10 w-full rounded-[10px] border border-[rgba(255,255,255,0.08)] bg-[#0a0a0a] pl-9 pr-3 text-sm text-[var(--bp-ink)] placeholder:text-[var(--bp-muted)] focus:border-[var(--bp-accent)] focus:outline-none sm:w-64"
        />
      </div>

      {/* Grid */}
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
        {filtered.map((f) => {
          const { wins, losses, draws } = parseRecord(f.record);

          return (
            <Link
              key={f.id}
              href={`/fighters/${f.id}`}
              className={retroPanelClassName({ interactive: true, className: "flex flex-col items-center p-3 text-center" })}
            >
              <div className="flex h-20 w-20 items-center justify-center overflow-hidden rounded-full border-2 border-[var(--bp-line)] bg-[#2a2a2a]">
                <FighterAvatar
                  src={f.avatarUrl || "/fighters/default.png"}
                  alt={f.name}
                  className="h-full w-full object-cover"
                />
              </div>
              <p className="mt-2 truncate text-sm font-semibold text-[var(--bp-ink)]">
                {f.name} {f.flag}
              </p>
              <p className="mt-0.5 flex items-center gap-1 text-xs">
                <WLRecord wins={Number(wins)} losses={Number(losses)} size="xs" />
                {draws && <span className="text-[var(--bp-muted)]">{draws}D</span>}
              </p>
              {f.weightClass && (
                <p className="mt-0.5 truncate text-[11px] text-[var(--bp-muted)]">{f.weightClass}</p>
              )}
            </Link>
          );
        })}
      </div>

      {filtered.length === 0 && (
        <p className="mt-10 text-center text-sm text-[var(--bp-muted)]">{t("myRecord.noPredictions")}</p>
      )}
    </div>
  );
}
