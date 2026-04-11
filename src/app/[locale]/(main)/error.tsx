"use client";

import { useEffect } from "react";
import Link from "next/link";
import { retroPanelClassName, retroButtonClassName } from "@/components/ui/retro";
import { AlertTriangle, RotateCcw, Home } from "lucide-react";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production") console.error(error);
  }, [error]);

  return (
    <div className="flex min-h-[50vh] items-center justify-center px-4">
      <div className={retroPanelClassName({ className: "max-w-md w-full p-8 text-center" })}>
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-[var(--bp-danger)]/10">
          <AlertTriangle className="h-6 w-6 text-[var(--bp-danger)]" />
        </div>
        <h2 className="text-xl font-bold text-[var(--bp-ink)]">
          Something went wrong
        </h2>
        <p className="mt-2 text-sm text-[var(--bp-muted)]">
          An unexpected error occurred. Please try again.
        </p>
        <div className="mt-6 flex items-center justify-center gap-3">
          <button
            onClick={reset}
            className={retroButtonClassName({ variant: "primary", size: "sm" })}
          >
            <RotateCcw className="h-4 w-4" />
            Try again
          </button>
          <Link
            href="/"
            className={retroButtonClassName({ variant: "ghost", size: "sm" })}
          >
            <Home className="h-4 w-4" />
            Home
          </Link>
        </div>
      </div>
    </div>
  );
}
