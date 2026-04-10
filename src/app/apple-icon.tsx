import { ImageResponse } from "next/og";
import { BRAND_ACCENT, BRAND_BG } from "@/lib/brand-tokens";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: BRAND_BG,
          borderRadius: 36,
        }}
      >
        <div
          style={{
            fontSize: 80,
            fontWeight: 800,
            color: BRAND_ACCENT,
            letterSpacing: "-0.04em",
          }}
        >
          BP
        </div>
      </div>
    ),
    { ...size },
  );
}
