"use client";

import { useState } from "react";
import { retroButtonClassName } from "@/components/ui/retro";
import LoadingButtonContent from "@/components/ui/LoadingButtonContent";

export function DevSeedButton({ userId }: { userId: string }) {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<string | null>(null);

  if (process.env.NODE_ENV !== "development") return null;

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
      aria-busy={loading}
      className={retroButtonClassName({ variant: "ghost", size: "sm" })}
    >
      <LoadingButtonContent loading={loading} loadingLabel="Seeding...">
        {result ?? "DEV: Fill My Data"}
      </LoadingButtonContent>
    </button>
  );
}
