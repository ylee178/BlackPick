"use client";

import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { cn } from "@/lib/utils";
import { AlertTriangle } from "lucide-react";
import { retroButtonClassName, retroPanelClassName } from "@/components/ui/retro";

type Props = {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  description: string;
  confirmLabel: string;
  cancelLabel: string;
  danger?: boolean;
  loading?: boolean;
};

export default function ConfirmModal({
  open,
  onClose,
  onConfirm,
  title,
  description,
  confirmLabel,
  cancelLabel,
  danger = false,
  loading = false,
}: Props) {
  const overlayRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function handleEsc(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", handleEsc);
    return () => document.removeEventListener("keydown", handleEsc);
  }, [open, onClose]);

  if (!open) return null;

  return createPortal(
    <div
      ref={overlayRef}
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-4"
      onClick={(e) => {
        if (e.target === overlayRef.current) onClose();
      }}
    >
      <div
        className={retroPanelClassName({
          className: "w-full max-w-sm p-5",
        })}
      >
        <div className="flex items-start gap-3">
          {danger && (
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[rgba(239,68,68,0.1)]">
              <AlertTriangle className="h-5 w-5 text-[var(--bp-danger)]" strokeWidth={2} />
            </div>
          )}
          <div className="min-w-0 flex-1">
            <p className="text-base font-semibold text-[var(--bp-ink)]">{title}</p>
            <p className="mt-1.5 text-sm leading-relaxed text-[var(--bp-muted)]">{description}</p>
          </div>
        </div>

        <div className="mt-5 flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className={retroButtonClassName({ variant: "secondary", size: "sm" })}
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={loading}
            className={retroButtonClassName({
              variant: danger ? "primary" : "primary",
              size: "sm",
              className: danger ? "!bg-[var(--bp-danger)] !border-[var(--bp-danger)] !text-white hover:!bg-[#dc2626]" : undefined,
            })}
          >
            {loading ? "..." : confirmLabel}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
