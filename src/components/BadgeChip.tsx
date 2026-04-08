import { cn } from "@/lib/utils";
import { BADGE_CONFIG, type BadgeType } from "@/lib/badge-config";

export function BadgeChip({
  type,
  count,
  size = "sm",
}: {
  type: BadgeType;
  count?: number;
  size?: "sm" | "md";
}) {
  const config = BADGE_CONFIG[type];
  const Icon = config.icon;

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-[8px] border font-medium",
        config.color,
        size === "sm" ? "px-1.5 py-0.5 text-[11px]" : "px-2 py-1 text-xs",
      )}
      title={config.label}
    >
      <Icon className={size === "sm" ? "h-3 w-3" : "h-3.5 w-3.5"} />
      {config.label}
      {count && count > 1 ? (
        <span className="opacity-70">x{count}</span>
      ) : null}
    </span>
  );
}

export function BadgeList({
  badges,
  size = "sm",
  limit,
}: {
  badges: { type: BadgeType; count: number }[];
  size?: "sm" | "md";
  limit?: number;
}) {
  const visible = limit ? badges.slice(0, limit) : badges;
  if (!visible.length) return null;

  return (
    <div className="flex flex-wrap items-center gap-1">
      {visible.map((b) => (
        <BadgeChip key={b.type} type={b.type} count={b.count} size={size} />
      ))}
    </div>
  );
}
