import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

type RetroPanelTone = "default" | "accent" | "muted" | "flat";
type RetroButtonVariant = "primary" | "secondary" | "ghost";
type RetroButtonSize = "sm" | "md" | "lg";
type RetroBadgeTone = "neutral" | "accent" | "success" | "danger" | "info";
type RetroMeterTone = "accent" | "success" | "info" | "danger";

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

export function retroChipClassName({
  tone = "accent",
  className,
}: {
  tone?: "accent" | "neutral";
  className?: string;
} = {}) {
  return cn(
    "retro-chip",
    tone === "neutral" && "retro-chip-neutral",
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

export function RetroSectionHeading({
  eyebrow,
  title,
  description,
  action,
  className,
}: {
  eyebrow?: string;
  title?: string;
  description?: string;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col gap-3 md:flex-row md:items-start md:justify-between", className)}>
      <div className="min-w-0">
        {eyebrow ? <span className={retroChipClassName()}>{eyebrow}</span> : null}
        {title ? (
          <h2 className="mt-3 text-2xl font-bold tracking-[-0.02em] text-[var(--bp-ink)] md:text-3xl">
            {title}
          </h2>
        ) : null}
        {description ? (
          <p className="mt-2 max-w-2xl text-sm text-[var(--bp-muted)]">
            {description}
          </p>
        ) : null}
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  );
}

export function RetroPageIntro({
  eyebrow,
  title,
  description,
  action,
  meta,
  className,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  action?: ReactNode;
  meta?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col gap-4 md:flex-row md:items-end md:justify-between", className)}>
      <div className="min-w-0">
        {eyebrow ? <span className={retroChipClassName()}>{eyebrow}</span> : null}
        <h1 className="mt-3 text-2xl font-bold tracking-[-0.02em] text-[var(--bp-ink)] md:text-3xl">
          {title}
        </h1>
        {description ? (
          <p className="mt-2 max-w-2xl text-sm text-[var(--bp-muted)]">
            {description}
          </p>
        ) : null}
        {meta ? <div className="mt-3">{meta}</div> : null}
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  );
}

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
    <span
      className={cn(
        "retro-status-badge",
        tone === "accent" && "retro-status-badge-accent",
        tone === "success" && "retro-status-badge-success",
        tone === "danger" && "retro-status-badge-danger",
        tone === "info" && "retro-status-badge-info",
        className
      )}
    >
      {children}
    </span>
  );
}

export function RetroMeter({
  label,
  value,
  max,
  valueLabel,
  tone = "accent",
  className,
}: {
  label: string;
  value: number;
  max: number;
  valueLabel?: string;
  tone?: RetroMeterTone;
  className?: string;
}) {
  const ratio = max <= 0 ? 0 : Math.min(100, Math.max(0, (value / max) * 100));

  return (
    <div className={cn("space-y-1.5", className)}>
      <div className="flex items-center justify-between gap-3 text-[11px] text-[var(--bp-muted)]">
        <span>{label}</span>
        <span className="font-semibold text-[var(--bp-ink)]">{valueLabel ?? `${Math.round(ratio)}%`}</span>
      </div>
      <div className="retro-meter">
        <div
          className={cn(
            "retro-meter-fill",
            tone === "success" && "retro-meter-fill-success",
            tone === "info" && "retro-meter-fill-info",
            tone === "danger" && "retro-meter-fill-danger"
          )}
          style={{ width: `${ratio}%` }}
        />
      </div>
    </div>
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
      <p className="text-[11px] font-medium text-[var(--bp-muted)]">{label}</p>
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
