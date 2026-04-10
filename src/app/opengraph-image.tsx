import { ImageResponse } from "next/og";
import {
  BRAND_ACCENT,
  BRAND_ACCENT_DIM,
  BRAND_BG,
  BRAND_BG_LIGHT,
} from "@/lib/brand-tokens";

export const alt = "Black Pick — Who Is The Pick?";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OGImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          background: `linear-gradient(145deg, ${BRAND_BG} 0%, ${BRAND_BG_LIGHT} 50%, ${BRAND_BG} 100%)`,
          padding: 80,
        }}
      >
        {/* Accent top bar */}
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            height: 6,
            background: BRAND_ACCENT,
          }}
        />

        {/* Title */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 16,
          }}
        >
          <div
            style={{
              fontSize: 28,
              fontWeight: 700,
              letterSpacing: "0.3em",
              color: BRAND_ACCENT,
              textTransform: "uppercase",
            }}
          >
            Black Pick
          </div>
          <div
            style={{
              fontSize: 72,
              fontWeight: 800,
              color: "#ffffff",
              textAlign: "center",
              lineHeight: 1.1,
            }}
          >
            Who Is The Pick?
          </div>
          <div
            style={{
              fontSize: 24,
              color: "rgba(255,255,255,0.5)",
              marginTop: 12,
            }}
          >
            Black Combat Fight Prediction Platform
          </div>
        </div>

        {/* Corner accent */}
        <div
          style={{
            position: "absolute",
            bottom: 40,
            right: 60,
            fontSize: 18,
            fontWeight: 600,
            color: BRAND_ACCENT_DIM,
            letterSpacing: "0.15em",
          }}
        >
          blackpick.io
        </div>
      </div>
    ),
    { ...size },
  );
}
