"use client";

import { useState } from "react";
import { retroButtonClassName } from "@/components/ui/retro";
import { isDevelopmentApp } from "@/lib/app-env";

export function DevSeedButton({ userId }: { userId: string }) {
  const isDevApp = isDevelopmentApp();
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<string | null>(null);

  if (!isDevApp) return null;

  async function handleSeed() {
    setLoading(true);
    setResult(null);
    try {
      const res = await fetch("/api/dev/seed", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "seed-me", userId }),
      });
      const data = await res.json();
      if (data.ok) {
        setResult(`${data.predictions} predictions seeded`);
        setTimeout(() => window.location.reload(), 800);
      } else {
        setResult(data.error ?? "Failed");
      }
    } catch {
      setResult("Error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      onClick={handleSeed}
      disabled={loading}
      className={retroButtonClassName({ variant: "ghost", size: "sm" })}
    >
      {loading ? "Seeding..." : result ?? "DEV: Fill My Data"}
    </button>
  );
}
