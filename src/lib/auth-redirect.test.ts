import { describe, expect, it, vi } from "vitest";
import { buildAuthRedirectUrl } from "./auth-redirect";

describe("buildAuthRedirectUrl", () => {
  it("prefers the browser fallback origin for client OAuth flows when requested", () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "https://blackpick.io");

    const url = buildAuthRedirectUrl("/api/auth/callback?next=%2Fen%2Fdashboard", {
      fallbackOrigin: "https://dev.blackpick.io",
      localize: false,
      preferFallbackOrigin: true,
    });

    expect(url.startsWith("https://dev.blackpick.io/api/auth/callback")).toBe(true);
  });

  it("keeps canonical origin for server-generated links by default", () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "https://blackpick.io");

    const url = buildAuthRedirectUrl("/api/auth/callback?next=%2F", {
      fallbackOrigin: "https://dev.blackpick.io",
      localize: false,
    });

    expect(url.startsWith("https://blackpick.io/api/auth/callback")).toBe(true);
  });
});
