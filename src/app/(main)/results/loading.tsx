import { retroPanelClassName } from "@/components/ui/retro";

export default function ResultsLoading() {
  return (
    <div className="flex flex-col gap-6 animate-pulse">
      <div className="h-8 w-40 rounded bg-[var(--bp-card-inset)]" />
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className={retroPanelClassName({ className: "h-20 p-4" })}>
          <div className="h-4 w-3/4 rounded bg-[var(--bp-card-inset)]" />
        </div>
      ))}
    </div>
  );
}
