import { ImageResponse } from "next/og";
import { BRAND_ACCENT } from "@/lib/brand-tokens";

// Cache aggressively — icon never changes between releases.
export const revalidate = 31536000; // 1 year

export async function GET() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#1a1306",
          borderRadius: 9999,
          border: `2px solid ${BRAND_ACCENT}`,
        }}
      >
        {/* Lucide key-round SVG */}
        <svg
          width="56"
          height="56"
          viewBox="0 0 24 24"
          fill="none"
          stroke={BRAND_ACCENT}
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M2.586 17.414A2 2 0 0 0 2 18.828V21a1 1 0 0 0 1 1h3a1 1 0 0 0 1-1v-1a1 1 0 0 0 1-1h1a1 1 0 0 0 1-1v-1a1 1 0 0 0 1-1h.172a2 2 0 0 0 1.414-.586l.814-.814a6.5 6.5 0 1 0-4-4z" />
          <circle cx="16.5" cy="7.5" r="1.5" fill={BRAND_ACCENT} stroke="none" />
        </svg>
      </div>
    ),
    {
      width: 120,
      height: 120,
      headers: {
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    },
  );
}
