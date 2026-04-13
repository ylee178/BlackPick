"use client";

import { useEffect, useState, useCallback, createContext, useContext, type ReactNode } from "react";
import { Check, AlertCircle, Flame } from "lucide-react";

type ToastType = "success" | "error" | "info" | "streak";

type ToastItem = {
  id: number;
  message: string;
  type: ToastType;
};

type ToastContextValue = {
  toast: (message: string, type?: ToastType) => void;
};

const ToastContext = createContext<ToastContextValue>({ toast: () => {} });

export function useToast() {
  return useContext(ToastContext);
}

let nextId = 0;

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const toast = useCallback((message: string, type: ToastType = "success") => {
    const id = nextId++;
    setToasts((prev) => [...prev, { id, message, type }]);
  }, []);

  const remove = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  return (
    <ToastContext value={{ toast }}>
      {children}
      {/* Toast container — only render when toasts exist to avoid hydration mismatch */}
      {toasts.length > 0 && (
        <div className="fixed left-1/2 top-20 z-[9999] flex -translate-x-1/2 flex-col items-center gap-2">
          {toasts.map((t) => (
            <ToastItem key={t.id} item={t} onDone={() => remove(t.id)} />
          ))}
        </div>
      )}
    </ToastContext>
  );
}

function ToastItem({ item, onDone }: { item: ToastItem; onDone: () => void }) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    requestAnimationFrame(() => setVisible(true));
    const timer = setTimeout(() => {
      setVisible(false);
      setTimeout(onDone, 200);
    }, 2500);
    return () => clearTimeout(timer);
  }, [onDone]);

  const Icon =
    item.type === "success"
      ? Check
      : item.type === "error"
        ? AlertCircle
        : item.type === "streak"
          ? Flame
          : AlertCircle;
  const iconColor =
    item.type === "success"
      ? "text-[#4ade80]"
      : item.type === "error"
        ? "text-[#f87171]"
        : item.type === "streak"
          ? "text-[var(--bp-accent)]"
          : "text-[var(--bp-accent)]";

  return (
    <div
      className={`flex items-center gap-2 rounded-[12px] border border-[rgba(255,255,255,0.1)] bg-[#1a1a1a] px-4 py-3 shadow-lg transition-all duration-200 ${
        visible ? "translate-y-0 opacity-100" : "-translate-y-2 opacity-0"
      }`}
    >
      <Icon className={`h-4 w-4 shrink-0 ${iconColor}`} strokeWidth={2} />
      <p className="text-sm text-[var(--bp-ink)]">{item.message}</p>
    </div>
  );
}
