import { retroPanelClassName } from "@/components/ui/retro";

export default function TerminalLoading() {
  return (
    <div className="flex flex-col gap-6 animate-pulse">
      <div className="h-8 w-32 rounded bg-[var(--bp-card-inset)]" />
      <div className={retroPanelClassName({ className: "h-96 p-4" })} />
    </div>
  );
}
