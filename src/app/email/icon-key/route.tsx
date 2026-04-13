import { ImageResponse } from "next/og";
import { BRAND_ACCENT } from "@/lib/brand-tokens";
// Import raw iconNode data from the lucide-react per-icon module. The
// top-level `KeyRound` component is `'use client'` (via Icon.js) and
// cannot be invoked inside an ImageResponse server context, so we
// render the raw node data as plain SVG. The visual output is identical
// to `<KeyRound />` in the web UI because we use the same node data
// and the same default stroke attributes.
import { __iconNode as keyRoundNode } from "lucide-react/dist/esm/icons/key-round.js";

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
          // Set CSS color so the key-round keyhole dot (which uses
          // `fill="currentColor"` in lucide's iconNode data) inherits
          // the brand gold instead of resolving to Satori's default
          // black and disappearing into the dark gold background.
          color: BRAND_ACCENT,
        }}
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width={56}
          height={56}
          viewBox="0 0 24 24"
          fill="none"
          stroke={BRAND_ACCENT}
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          {keyRoundNode.map(([tag, attrs]) => {
            const { key, ...rest } = attrs as {
              key?: string;
            } & Record<string, string | number>;
            const Tag = tag as
              | "path"
              | "circle"
              | "rect"
              | "line"
              | "ellipse"
              | "polygon"
              | "polyline";
            return <Tag key={key} {...rest} />;
          })}
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
