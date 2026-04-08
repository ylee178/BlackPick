import { retroPanelClassName, retroButtonClassName } from "@/components/ui/retro";
import { SearchX, Home } from "lucide-react";
import { Link } from "@/i18n/navigation";

export default function NotFound() {
  return (
    <div className="flex min-h-[60vh] items-center justify-center px-4">
      <div className={retroPanelClassName({ className: "max-w-md w-full p-8 text-center" })}>
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-[var(--bp-accent)]/10">
          <SearchX className="h-6 w-6 text-[var(--bp-accent)]" />
        </div>
        <h2 className="text-[32px] font-bold text-[var(--bp-ink)]">404</h2>
        <p className="mt-1 text-sm text-[var(--bp-muted)]">
          Page not found
        </p>
        <div className="mt-6">
          <Link
            href="/"
            className={retroButtonClassName({ variant: "primary", size: "sm" })}
          >
            <Home className="h-4 w-4" />
            Go home
          </Link>
        </div>
      </div>
    </div>
  );
}
