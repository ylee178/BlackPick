import { retroPanelClassName } from "@/components/ui/retro";

export default function DashboardLoading() {
  return (
    <div className="flex flex-col gap-6 animate-pulse">
      <div className="h-8 w-48 rounded bg-[var(--bp-card-inset)]" />
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className={retroPanelClassName({ className: "h-24 p-4" })} />
        ))}
      </div>
      <div className={retroPanelClassName({ className: "h-64 p-4" })} />
    </div>
  );
}
