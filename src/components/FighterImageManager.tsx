"use client";

import { useState, useRef } from "react";
import {
  retroPanelClassName,
  retroButtonClassName,
} from "@/components/ui/retro";
import { RefreshCw, Upload, Check, ArrowRight, Trash2 } from "lucide-react";

type FighterItem = {
  id: string;
  name: string;
  ringName: string;
  flag: string;
  images: string[];
};

type AllFighter = { id: string; label: string };

type ImageAction = {
  url: string;
  action: "keep" | "regen" | "remap";
  remapTo?: string;
};

export default function FighterImageManager({
  items,
  allFighters,
}: {
  items: FighterItem[];
  allFighters: AllFighter[];
}) {
  const [query, setQuery] = useState("");
  const [actions, setActions] = useState<Record<string, Record<string, ImageAction>>>({});
  const [flaggedForRegen, setFlaggedForRegen] = useState<Set<string>>(new Set());
  const [uploadedRefs, setUploadedRefs] = useState<Record<string, string>>({});
  const [generating, setGenerating] = useState(false);
  const [generatingId, setGeneratingId] = useState<string | null>(null);
  const [markedForDelete, setMarkedForDelete] = useState<Set<string>>(new Set());
  const [fighterImages, setFighterImages] = useState<Record<string, string[]>>(() => {
    const map: Record<string, string[]> = {};
    for (const item of items) map[item.id] = [...item.images];
    return map;
  });
  const [regenCount, setRegenCount] = useState(0);
  const [regenTotal, setRegenTotal] = useState(0);
  const fileInputRefs = useRef<Record<string, HTMLInputElement | null>>({});

  const filtered = query.trim()
    ? items.filter(f => f.name.toLowerCase().includes(query.toLowerCase()) || f.ringName.toLowerCase().includes(query.toLowerCase()))
    : items;

  function toggleRegen(fighterId: string) {
    setFlaggedForRegen(prev => {
      const next = new Set(prev);
      if (next.has(fighterId)) next.delete(fighterId);
      else next.add(fighterId);
      return next;
    });
  }

  function setImageAction(fighterId: string, imageUrl: string, action: "keep" | "regen" | "remap", remapTo?: string) {
    setActions(prev => ({
      ...prev,
      [fighterId]: {
        ...prev[fighterId],
        [imageUrl]: { url: imageUrl, action, remapTo },
      },
    }));
  }

  async function handleUpload(fighterId: string, file: File) {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("fighter_id", fighterId);

    try {
      const res = await fetch("/api/fighter-avatar/upload", {
        method: "POST",
        body: formData,
      });
      if (res.ok) {
        const data = await res.json();
        setUploadedRefs(prev => ({ ...prev, [fighterId]: data.path }));
      }
    } catch {}
  }

  async function handleRegenerate(fighterId: string) {
    setGeneratingId(fighterId);
    try {
      const res = await fetch("/api/fighter-avatar/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fighter_id: fighterId }),
      });
      if (res.ok) {
        const data = await res.json();
        // Add new image to this fighter's list without reloading
        setFighterImages(prev => {
          const existing = prev[fighterId] || [];
          const newUrl = data.path + "?t=" + Date.now();
          // Replace existing v3 or add new
          const filtered = existing.filter(u => !u.includes("_v3"));
          return { ...prev, [fighterId]: [...filtered, newUrl] };
        });
      }
    } catch {} finally {
      setGeneratingId(null);
    }
  }

  async function handleRemapAll() {
    // Collect all remap actions
    const remaps: { from_fighter: string; image_url: string; to_fighter: string }[] = [];
    for (const [fighterId, imageActions] of Object.entries(actions)) {
      for (const [url, action] of Object.entries(imageActions)) {
        if (action.action === "remap" && action.remapTo) {
          remaps.push({ from_fighter: fighterId, image_url: url, to_fighter: action.remapTo });
        }
      }
    }

    if (remaps.length === 0) return;

    try {
      const res = await fetch("/api/fighter-avatar/remap", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ remaps }),
      });
      if (res.ok) {
        setFighterImages(prev => {
          const next = { ...prev };
          for (const remap of remaps) {
            const filename = remap.image_url.split("/").pop() || "";
            const vMatch = filename.match(/_v\d+/);
            const version = vMatch ? vMatch[0] : "";
            const newUrl = `/fighters/pixel/${remap.to_fighter}${version}.png`;
            next[remap.from_fighter] = (next[remap.from_fighter] || []).filter(u => !u.includes(filename));
            next[remap.to_fighter] = [...(next[remap.to_fighter] || []), newUrl];
          }
          return next;
        });
        setActions({});
      }
    } catch {}
  }

  async function handleRegenerateAll() {
    setGenerating(true);
    const ids = Array.from(flaggedForRegen);
    setRegenTotal(ids.length);
    setRegenCount(0);
    for (let i = 0; i < ids.length; i++) {
      const id = ids[i];
      setGeneratingId(id);
      setRegenCount(i + 1);
      try {
        const res = await fetch("/api/fighter-avatar/generate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ fighter_id: id }),
        });
        if (res.ok) {
          const data = await res.json();
          setFighterImages(prev => {
            const existing = prev[id] || [];
            const filtered = existing.filter(u => !u.includes("_v3"));
            return { ...prev, [id]: [...filtered, data.path + "?t=" + Date.now()] };
          });
        }
      } catch {}
    }
    setFlaggedForRegen(new Set());
    setGenerating(false);
    setGeneratingId(null);
    setRegenCount(0);
    setRegenTotal(0);
  }

  function toggleDelete(imageUrl: string) {
    setMarkedForDelete(prev => {
      const next = new Set(prev);
      if (next.has(imageUrl)) next.delete(imageUrl);
      else next.add(imageUrl);
      return next;
    });
  }

  async function handleDeleteAll() {
    const urls = Array.from(markedForDelete);
    if (urls.length === 0) return;
    try {
      const res = await fetch("/api/fighter-avatar/delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ urls }),
      });
      if (res.ok) {
        // Remove deleted images from state
        setFighterImages(prev => {
          const next = { ...prev };
          for (const [fid, imgs] of Object.entries(next)) {
            next[fid] = imgs.filter(u => !markedForDelete.has(u.split("?")[0]));
          }
          return next;
        });
        setMarkedForDelete(new Set());
      }
    } catch {}
  }

  const remapCount = Object.values(actions).reduce((sum, ia) => sum + Object.values(ia).filter(a => a.action === "remap" && a.remapTo).length, 0);

  return (
    <div>
      {/* Toolbar */}
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <input
          type="text"
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="Search fighter..."
          className="h-10 w-64 rounded-[10px] border border-[rgba(255,255,255,0.08)] bg-[#0a0a0a] px-3 text-sm text-[var(--bp-ink)] placeholder:text-[var(--bp-muted)] focus:border-[var(--bp-accent)] focus:outline-none"
        />
        {flaggedForRegen.size > 0 && (
          <button
            onClick={handleRegenerateAll}
            disabled={generating}
            className={retroButtonClassName({ variant: "primary", size: "sm", className: "gap-1.5" })}
          >
            <RefreshCw className={`h-3.5 w-3.5 ${generating ? "animate-spin" : ""}`} strokeWidth={2} />
            {generating ? `Generating ${regenCount}/${regenTotal}...` : `Regenerate ${flaggedForRegen.size} flagged`}
          </button>
        )}
        {markedForDelete.size > 0 && (
          <button
            onClick={handleDeleteAll}
            className={retroButtonClassName({ variant: "soft", size: "sm", className: "gap-1.5 text-[var(--bp-danger)]" })}
          >
            <Trash2 className="h-3.5 w-3.5" strokeWidth={2} />
            Delete {markedForDelete.size} images
          </button>
        )}
        {remapCount > 0 && (
          <button
            onClick={handleRemapAll}
            className={retroButtonClassName({ variant: "soft", size: "sm", className: "gap-1.5" })}
          >
            <ArrowRight className="h-3.5 w-3.5" strokeWidth={2} />
            Apply {remapCount} remaps
          </button>
        )}
      </div>

      {/* Fighter cards */}
      <div className="space-y-3">
        {filtered.map(f => {
          const isFlagged = flaggedForRegen.has(f.id);
          const uploaded = uploadedRefs[f.id];
          const isGenerating = generatingId === f.id;

          return (
            <div
              key={f.id}
              className={retroPanelClassName({
                className: `p-4 ${isFlagged ? "border-[var(--bp-accent)]" : ""}`,
              })}
            >
              {/* Fighter header */}
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-sm font-bold text-[var(--bp-ink)]">
                    {f.name} {f.flag}
                  </span>
                  {f.ringName && f.ringName !== f.name && (
                    <span className="ml-2 text-xs text-[var(--bp-muted)]">{f.ringName}</span>
                  )}
                  <span className="ml-2 text-[10px] text-[var(--bp-muted)] opacity-50">{f.id.substring(0, 8)}</span>
                </div>
                <div className="flex items-center gap-2">
                  {/* Upload button */}
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    ref={el => { fileInputRefs.current[f.id] = el; }}
                    onChange={e => {
                      const file = e.target.files?.[0];
                      if (file) handleUpload(f.id, file);
                    }}
                  />
                  <button
                    onClick={() => fileInputRefs.current[f.id]?.click()}
                    className={retroButtonClassName({ variant: "soft", size: "sm", className: "gap-1" })}
                  >
                    <Upload className="h-3 w-3" strokeWidth={2} />
                    Photo
                  </button>
                  {/* Flag for regen */}
                  <button
                    onClick={() => toggleRegen(f.id)}
                    className={retroButtonClassName({
                      variant: isFlagged ? "primary" : "soft",
                      size: "sm",
                      className: "gap-1",
                    })}
                  >
                    <RefreshCw className={`h-3 w-3 ${isGenerating ? "animate-spin" : ""}`} strokeWidth={2} />
                    {isFlagged ? "Flagged" : "Regen"}
                  </button>
                </div>
              </div>

              {/* Images row */}
              <div className="mt-3 flex flex-wrap gap-3">
                {(fighterImages[f.id]?.length ?? 0) === 0 && !uploaded && (
                  <div className="flex h-24 w-24 items-center justify-center rounded-[10px] border border-dashed border-[rgba(255,255,255,0.1)] bg-[#111] text-xs text-[var(--bp-muted)]">
                    No image
                  </div>
                )}

                {(fighterImages[f.id] || []).map(url => {
                  const version = url.includes("_v3") ? "V3" : url.includes("_v2") ? "V2" : "V1";
                  const imageAction = actions[f.id]?.[url];

                  return (
                    <div key={url} className="flex flex-col items-center gap-1.5">
                      <div className="relative">
                        <img
                          src={url}
                          alt={f.name}
                          className="h-24 w-24 rounded-[10px] border border-[rgba(255,255,255,0.08)] bg-[#2a2a2a] object-cover"
                        />
                        <span className="absolute left-1 top-1 rounded bg-[rgba(0,0,0,0.7)] px-1 py-0.5 text-[9px] font-bold text-[var(--bp-muted)]">
                          {version}
                        </span>
                        {markedForDelete.has(url) && (
                          <div className="absolute inset-0 flex items-center justify-center rounded-[10px] bg-[rgba(0,0,0,0.6)]">
                            <Trash2 className="h-5 w-5 text-[var(--bp-danger)]" strokeWidth={2} />
                          </div>
                        )}
                      </div>
                      {/* Action buttons */}
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => toggleDelete(url)}
                          className={`flex cursor-pointer items-center justify-center rounded p-1 transition ${markedForDelete.has(url) ? "bg-[rgba(248,113,113,0.15)] text-[var(--bp-danger)]" : "text-[var(--bp-muted)] hover:text-[var(--bp-danger)]"}`}
                          title="Delete"
                        >
                          <Trash2 className="h-3 w-3" strokeWidth={2} />
                        </button>
                      </div>
                      {/* Remap dropdown */}
                      <select
                        value={imageAction?.action === "remap" ? imageAction.remapTo || "" : ""}
                        onChange={e => {
                          const val = e.target.value;
                          if (val) {
                            setImageAction(f.id, url, "remap", val);
                          } else {
                            setImageAction(f.id, url, "keep");
                          }
                        }}
                        className="w-24 truncate rounded border border-[rgba(255,255,255,0.08)] bg-[#0a0a0a] px-1 py-0.5 text-[10px] text-[var(--bp-muted)] focus:border-[var(--bp-accent)] focus:outline-none"
                      >
                        <option value="">This fighter</option>
                        {allFighters
                          .filter(af => af.id !== f.id)
                          .map(af => (
                            <option key={af.id} value={af.id}>
                              {af.label}
                            </option>
                          ))}
                      </select>
                    </div>
                  );
                })}

                {/* Uploaded ref preview */}
                {uploaded && (
                  <div className="flex flex-col items-center gap-1.5">
                    <div className="relative">
                      <img
                        src={uploaded}
                        alt="Uploaded ref"
                        className="h-24 w-24 rounded-[10px] border border-[var(--bp-accent)] bg-[#2a2a2a] object-cover"
                      />
                      <span className="absolute left-1 top-1 rounded bg-[rgba(0,0,0,0.7)] px-1 py-0.5 text-[9px] font-bold text-[var(--bp-accent)]">
                        REF
                      </span>
                    </div>
                    <span className="text-[10px] text-[var(--bp-accent)]">Uploaded</span>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
