import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

type RetroPanelTone = "default" | "accent" | "muted" | "flat";
type RetroButtonVariant = "primary" | "secondary" | "ghost" | "soft";
type RetroButtonSize = "sm" | "md" | "lg";
type RetroBadgeTone = "neutral" | "accent" | "success" | "danger" | "info";
export function retroPanelClassName({
  tone = "default",
  interactive = false,
  className,
}: {
  tone?: RetroPanelTone;
  interactive?: boolean;
  className?: string;
} = {}) {
  return cn(
    "retro-panel",
    tone === "accent" && "retro-panel-accent",
    tone === "muted" && "retro-panel-muted",
    tone === "flat" && "retro-panel-flat",
    interactive && "retro-panel-interactive",
    className
  );
}

export function retroButtonClassName({
  variant = "primary",
  size = "md",
  block = false,
  className,
}: {
  variant?: RetroButtonVariant;
  size?: RetroButtonSize;
  block?: boolean;
  className?: string;
} = {}) {
  return cn(
    "retro-button",
    variant === "primary" && "retro-button-primary",
    variant === "secondary" && "retro-button-secondary",
    variant === "ghost" && "retro-button-ghost",
    variant === "soft" && "retro-button-soft",
    size === "sm" && "retro-button-sm",
    size === "lg" && "retro-button-lg",
    block && "w-full justify-center",
    className
  );
}

export function retroFieldClassName(className?: string) {
  return cn("retro-field", className);
}

export function retroInsetClassName(className?: string) {
  return cn("retro-inset", className);
}

export function retroNavLinkClassName({
  active,
  mobile = false,
  className,
}: {
  active: boolean;
  mobile?: boolean;
  className?: string;
}) {
  return cn(
    "retro-nav-link",
    active && "retro-nav-link-active",
    mobile && "retro-nav-link-mobile",
    className
  );
}

export function retroSegmentClassName({
  active,
  className,
}: {
  active: boolean;
  className?: string;
}) {
  return cn(
    "inline-flex min-h-9 items-center justify-center rounded-[10px] border px-3.5 py-1.5 text-sm font-medium transition",
    active
      ? "border-[rgba(229,169,68,0.25)] bg-[var(--bp-accent-dim)] text-[var(--bp-accent)] font-semibold"
      : "border-[var(--bp-line)] bg-transparent text-[var(--bp-muted)] hover:border-[var(--bp-line-strong)] hover:text-[var(--bp-ink)]",
    className
  );
}

/**
 * RetroLabel — the single label/badge component (2 levels)
 *
 * Sizes:
 *   sm  → 12px, h-22px  (inline tags, status badges, rank NEW)
 *   md  → 12px, h-26px  (emphasized labels, MAIN EVENT, chips, series)
 *
 * Tones:
 *   accent  → gold border + gold bg + gold text
 *   success → green bg + green text
 *   danger  → red bg + red text
 *   info    → blue bg + blue text
 *   neutral → subtle border + muted bg + muted text
 *   gold    → golden gradient text, no bg
 */
type RetroLabelSize = "xs" | "sm" | "md";
type RetroLabelTone = "accent" | "success" | "danger" | "info" | "neutral" | "gold";

const labelSizeStyles: Record<RetroLabelSize, string> = {
  xs: "h-[18px] px-1 text-[10px] rounded-[4px] gap-0.5",
  sm: "h-[24px] px-1.5 text-xs rounded-[6px] gap-1",
  md: "h-[26px] px-[7px] text-xs rounded-[6px] gap-1",
};

const labelToneStyles: Record<RetroLabelTone, string> = {
  accent: "border border-[rgba(229,169,68,0.3)] bg-[var(--bp-accent-dim)] text-[var(--bp-accent)]",
  success: "border border-[rgba(34,197,94,0.2)] bg-[rgba(34,197,94,0.12)] text-[var(--bp-success)]",
  danger: "border border-[rgba(239,68,68,0.2)] bg-[rgba(239,68,68,0.08)] text-[var(--bp-danger)]",
  info: "border border-[rgba(59,130,246,0.2)] bg-[rgba(59,130,246,0.12)] text-[#3b82f6]",
  neutral: "border border-[rgba(255,255,255,0.08)] bg-[rgba(255,255,255,0.04)] text-[var(--bp-muted)]",
  gold: "retro-label-gold",
};

const labelBase = "inline-flex items-center justify-center font-bold uppercase leading-none tracking-[0.04em]";

/** retroChipClassName — returns RetroLabel md classes for use on raw elements (a, span) */
export function retroChipClassName({
  tone = "accent",
  className,
}: {
  tone?: "accent" | "neutral";
  className?: string;
} = {}) {
  return cn(labelBase, labelSizeStyles.md, labelToneStyles[tone], className);
}

export function RetroLabel({
  children,
  size = "sm",
  tone = "accent",
  icon,
  className,
}: {
  children: ReactNode;
  size?: RetroLabelSize;
  tone?: RetroLabelTone;
  icon?: ReactNode;
  className?: string;
}) {
  return (
    <span
      className={cn(labelBase, labelSizeStyles[size], labelToneStyles[tone], className)}
    >
      {icon ? <span className="flex shrink-0 items-center">{icon}</span> : null}
      {children}
    </span>
  );
}

/**
 * RetroStatusBadge — backward-compatible wrapper around RetroLabel.
 * Maps old tones to RetroLabel tones.
 */
export function RetroStatusBadge({
  children,
  tone = "neutral",
  className,
}: {
  children: ReactNode;
  tone?: RetroBadgeTone;
  className?: string;
}) {
  return (
    <RetroLabel size="md" tone={tone as RetroLabelTone} className={className}>
      {children}
    </RetroLabel>
  );
}

export function RetroStatTile({
  label,
  value,
  meta,
  tone = "default",
  className,
}: {
  label: string;
  value: string | number;
  meta?: string;
  tone?: RetroPanelTone;
  className?: string;
}) {
  return (
    <div className={retroPanelClassName({ tone, className: cn("h-full p-3.5", className) })}>
      <p className="text-xs font-medium text-[var(--bp-muted)]">{label}</p>
      <p className="mt-2 text-2xl font-bold tracking-[-0.02em] text-[var(--bp-ink)]">
        {value}
      </p>
      {meta ? <p className="mt-1 text-xs text-[var(--bp-muted)]">{meta}</p> : null}
    </div>
  );
}

export function RetroEmptyState({
  title,
  description,
  action,
  className,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div className={retroInsetClassName(cn("rounded-[12px] px-5 py-6 text-center", className))}>
      <p className="text-lg font-semibold text-[var(--bp-ink)]">{title}</p>
      {description ? (
        <p className="mx-auto mt-2 max-w-md text-sm text-[var(--bp-muted)]">{description}</p>
      ) : null}
      {action ? <div className="mt-4 flex justify-center">{action}</div> : null}
    </div>
  );
}
