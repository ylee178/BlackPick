import { retroPanelClassName } from "@/components/ui/retro";

export default function EventDetailLoading() {
  return (
    <div className="flex flex-col gap-6 animate-pulse">
      {/* Event header skeleton */}
      <div className={retroPanelClassName({ className: "p-6" })}>
        <div className="h-7 w-48 rounded bg-[var(--bp-card-inset)]" />
        <div className="mt-3 h-4 w-32 rounded bg-[var(--bp-card-inset)]" />
      </div>

      {/* Fight cards skeleton */}
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className={retroPanelClassName({ className: "p-5" })}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-12 w-12 rounded-full bg-[var(--bp-card-inset)]" />
              <div className="h-4 w-24 rounded bg-[var(--bp-card-inset)]" />
            </div>
            <div className="h-5 w-8 rounded bg-[var(--bp-card-inset)]" />
            <div className="flex items-center gap-3">
              <div className="h-4 w-24 rounded bg-[var(--bp-card-inset)]" />
              <div className="h-12 w-12 rounded-full bg-[var(--bp-card-inset)]" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
