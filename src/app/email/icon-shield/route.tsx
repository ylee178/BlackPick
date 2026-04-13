import { ImageResponse } from "next/og";
import { BRAND_ACCENT } from "@/lib/brand-tokens";
// Import raw iconNode data from the lucide-react per-icon module. The
// top-level `ShieldCheck` component is `'use client'` (via Icon.js) and
// cannot be invoked inside an ImageResponse server context, so we
// render the raw node data as plain SVG. The visual output is identical
// to `<ShieldCheck />` in the web UI because we use the same node data
// and the same default stroke attributes.
import { __iconNode as shieldCheckNode } from "lucide-react/dist/esm/icons/shield-check.js";

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
          // Set CSS color so any `fill="currentColor"` in the lucide
          // iconNode (e.g. the key-round keyhole dot) inherits the
          // brand gold instead of resolving to Satori's default black.
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
          {shieldCheckNode.map(([tag, attrs]) => {
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
