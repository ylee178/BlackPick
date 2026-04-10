"use client";

import NextImage from "next/image";
import { useState, useRef, useCallback } from "react";
import Cropper, { Area } from "react-easy-crop";
import LoadingButtonContent from "@/components/ui/LoadingButtonContent";
import {
  retroPanelClassName,
  retroButtonClassName,
} from "@/components/ui/retro";
import { Upload, ZoomIn, ZoomOut, Move, Check, X, Trash2, Search } from "lucide-react";

type FighterItem = {
  id: string;
  name: string;
  ringName: string;
  flag: string;
  hasImage: boolean;
  imageUrl?: string | null;
};

export default function FighterImageManager({
  items,
}: {
  items: FighterItem[];
}) {
  const [query, setQuery] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editSource, setEditSource] = useState<string | null>(null);
  const [sourceFile, setSourceFile] = useState<File | null>(null);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedArea, setCroppedArea] = useState<Area | null>(null);
  const [saving, setSaving] = useState(false);
  const [imageTimestamps, setImageTimestamps] = useState<Record<string, number>>({});
  const [deletedIds, setDeletedIds] = useState<Set<string>>(new Set());
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const pendingFighterId = useRef<string | null>(null);

  const filtered = query.trim()
    ? items.filter(
        (f) =>
          f.name.toLowerCase().includes(query.toLowerCase()) ||
          f.ringName.toLowerCase().includes(query.toLowerCase())
      )
    : items;

  const onCropComplete = useCallback((_: Area, croppedAreaPixels: Area) => {
    setCroppedArea(croppedAreaPixels);
  }, []);

  function startUpload(fighterId: string) {
    pendingFighterId.current = fighterId;
    fileInputRef.current?.click();
  }

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !pendingFighterId.current) return;

    const reader = new FileReader();
    reader.onload = () => {
      setEditSource(reader.result as string);
      setEditingId(pendingFighterId.current);
      setSourceFile(file);
      setCrop({ x: 0, y: 0 });
      setZoom(1);
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  }

  function startEditExisting(fighterId: string) {
    const ts = imageTimestamps[fighterId] || Date.now();
    const url = `/api/fighter-avatar/ref/${fighterId}?t=${ts}`;
    setEditSource(url);
    setEditingId(fighterId);
    setSourceFile(null);
    setCrop({ x: 0, y: 0 });
    setZoom(1);
  }

  function cancelEdit() {
    setEditingId(null);
    setEditSource(null);
    setSourceFile(null);
    setCrop({ x: 0, y: 0 });
    setZoom(1);
    setCroppedArea(null);
  }

  async function saveEdit() {
    if (!editingId || !editSource || !croppedArea) return;
    setSaving(true);

    try {
      const canvas = document.createElement("canvas");
      const size = 512;
      canvas.width = size;
      canvas.height = size;
      const ctx = canvas.getContext("2d")!;

      const img = new window.Image();
      img.crossOrigin = "anonymous";
      await new Promise<void>((resolve, reject) => {
        img.onload = () => resolve();
        img.onerror = reject;
        img.src = editSource;
      });

      ctx.drawImage(
        img,
        croppedArea.x,
        croppedArea.y,
        croppedArea.width,
        croppedArea.height,
        0,
        0,
        size,
        size
      );

      const blob = await new Promise<Blob>((resolve) =>
        canvas.toBlob((b) => resolve(b!), "image/png")
      );

      const formData = new FormData();
      formData.append("file", blob, `${editingId}.png`);
      formData.append("fighter_id", editingId);
      if (sourceFile) {
        formData.append("source_file", sourceFile, sourceFile.name);
      }

      const res = await fetch("/api/fighter-avatar/upload", {
        method: "POST",
        body: formData,
      });

      if (res.ok) {
        const now = Date.now();
        setImageTimestamps((prev) => ({ ...prev, [editingId]: now }));
        setDeletedIds((prev) => {
          const next = new Set(prev);
          next.delete(editingId);
          return next;
        });
        cancelEdit();
      }
    } catch (err) {
      console.error("Save failed:", err);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(fighterId: string, imageUrl: string) {
    const url = imageUrl.split("?")[0];
    try {
      const res = await fetch("/api/fighter-avatar/delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ urls: [url] }),
      });
      if (res.ok) {
        setDeletedIds((prev) => new Set(prev).add(fighterId));
      }
    } catch {}
  }

  function getImageUrl(f: FighterItem): string | null {
    if (deletedIds.has(f.id)) return null;
    const ts = imageTimestamps[f.id];
    if (ts) {
      return `/fighters/pixel/${f.id}.png?t=${ts}`;
    }
    return f.imageUrl ?? null;
  }

  return (
    <div>
      {/* Hidden file input */}
      <input
        type="file"
        accept="image/*"
        className="hidden"
        ref={fileInputRef}
        onChange={handleFileSelect}
      />

      {/* Crop Modal */}
      {editingId && editSource && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80">
          <div className={retroPanelClassName({ className: "w-[480px] p-0" })}>
            {/* Crop area */}
            <div className="relative h-[400px] w-full">
              <Cropper
                image={editSource}
                crop={crop}
                zoom={zoom}
                aspect={1}
                onCropChange={setCrop}
                onZoomChange={setZoom}
                onCropComplete={onCropComplete}
                cropShape="rect"
                showGrid={false}
                style={{
                  containerStyle: { borderRadius: "16px 16px 0 0" },
                }}
              />
            </div>

            {/* Controls */}
            <div className="flex items-center gap-3 px-4 py-3">
              <ZoomOut className="h-4 w-4 text-[var(--bp-muted)]" strokeWidth={2} />
              <input
                type="range"
                min={1}
                max={3}
                step={0.05}
                value={zoom}
                onChange={(e) => setZoom(Number(e.target.value))}
                className="flex-1 accent-[var(--bp-accent)]"
              />
              <ZoomIn className="h-4 w-4 text-[var(--bp-muted)]" strokeWidth={2} />
            </div>

            {/* Actions */}
            <div className="flex items-center justify-end gap-2 border-t border-[rgba(255,255,255,0.06)] px-4 py-3">
              <button
                onClick={cancelEdit}
                className={retroButtonClassName({ variant: "soft", size: "sm", className: "gap-1" })}
              >
                <X className="h-3.5 w-3.5" strokeWidth={2} />
                Cancel
              </button>
              <button
                onClick={saveEdit}
                disabled={saving}
                aria-busy={saving}
                className={retroButtonClassName({ variant: "primary", size: "sm", className: "gap-1" })}
              >
                <LoadingButtonContent
                  loading={saving}
                  loadingLabel="Saving..."
                  icon={<Check className="h-3.5 w-3.5" strokeWidth={2} />}
                  spinnerClassName="h-3.5 w-3.5"
                >
                  Save
                </LoadingButtonContent>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Search */}
      <div className="mb-4">
        <div className="relative w-64">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--bp-muted)]" strokeWidth={2} />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search fighter..."
            className="h-10 w-full rounded-[10px] border border-[rgba(255,255,255,0.08)] bg-[#0a0a0a] pl-9 pr-3 text-sm text-[var(--bp-ink)] placeholder:text-[var(--bp-muted)] focus:border-[var(--bp-accent)] focus:outline-none"
          />
        </div>
      </div>

      {/* Fighter grid */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
        {filtered.map((f) => {
          const imageUrl = getImageUrl(f);

          return (
            <div
              key={f.id}
              className={retroPanelClassName({ className: "p-3" })}
            >
              {/* Image */}
              <div className="relative mx-auto mb-2 h-28 w-28 overflow-hidden rounded-xl border border-[rgba(255,255,255,0.08)] bg-[#2a2a2a]">
                {imageUrl ? (
                  <NextImage
                    src={imageUrl}
                    alt={f.ringName || f.name}
                    fill
                    unoptimized
                    sizes="112px"
                    className="object-cover"
                  />
                ) : (
                  <NextImage
                    src="/fighters/default.png"
                    alt="Default"
                    fill
                    sizes="112px"
                    className="object-cover opacity-30"
                  />
                )}
              </div>

              {/* Name */}
              <div className="mb-2 text-center">
                <div className="truncate text-sm font-bold text-[var(--bp-ink)]">
                  {f.ringName || f.name} {f.flag}
                </div>
                {f.ringName && f.ringName !== f.name && (
                  <div className="truncate text-xs text-[var(--bp-muted)]">{f.name}</div>
                )}
              </div>

              {/* Actions */}
              <div className="flex items-center justify-center gap-1.5">
                <button
                  onClick={() => startUpload(f.id)}
                  className={retroButtonClassName({ variant: "soft", size: "sm", className: "gap-1 text-xs" })}
                  title="Upload new image"
                >
                  <Upload className="h-3 w-3" strokeWidth={2} />
                  Upload
                </button>
                {imageUrl && (
                  <>
                    <button
                      onClick={() => startEditExisting(f.id)}
                      className={retroButtonClassName({ variant: "soft", size: "sm", className: "gap-1 text-xs" })}
                      title="Edit crop & zoom"
                    >
                      <Move className="h-3 w-3" strokeWidth={2} />
                      Edit
                    </button>
                    <button
                      onClick={() => imageUrl && handleDelete(f.id, imageUrl)}
                      className="flex cursor-pointer items-center justify-center rounded-[10px] p-1.5 text-[var(--bp-muted)] transition hover:bg-[rgba(248,113,113,0.1)] hover:text-[var(--bp-danger)]"
                      title="Delete image"
                    >
                      <Trash2 className="h-3.5 w-3.5" strokeWidth={2} />
                    </button>
                  </>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
