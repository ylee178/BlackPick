import { describe, expect, it } from "vitest";
import {
  OAUTH_CALLBACK_PATH,
  buildOAuthCallbackPath,
  readOAuthCallbackNext,
} from "./oauth-redirect";

describe("buildOAuthCallbackPath", () => {
  describe("invariant: targets the API callback route", () => {
    // This is the regression guard for the original CRITICAL PKCE bypass bug.
    // SocialAuthButtons used to send Google directly to the destination page,
    // skipping the server-side exchangeCodeForSession entirely.
    const inputs = [
      "/",
      "/dashboard",
      "/en",
      "/en/dashboard",
      "/ko/events/123",
      undefined,
      null,
      "",
    ];

    it.each(inputs)("starts with %s -> /api/auth/callback", (input) => {
      const result = buildOAuthCallbackPath(input);
      expect(result.startsWith(`${OAUTH_CALLBACK_PATH}?next=`)).toBe(true);
    });
  });

  describe("invariant: never double-prefixes locale", () => {
    // Regression guard for /en/en bug. The function must NOT add a /${locale}
    // prefix; locale resolution happens later in the next-intl middleware.
    it("/en stays /en (not /en/en)", () => {
      const result = buildOAuthCallbackPath("/en");
      expect(readOAuthCallbackNext(result)).toBe("/en");
    });

    it("/en/dashboard stays /en/dashboard (not /en/en/dashboard)", () => {
      const result = buildOAuthCallbackPath("/en/dashboard");
      expect(readOAuthCallbackNext(result)).toBe("/en/dashboard");
    });

    it("/ko/events/123 stays /ko/events/123", () => {
      const result = buildOAuthCallbackPath("/ko/events/123");
      expect(readOAuthCallbackNext(result)).toBe("/ko/events/123");
    });

    it("/dashboard stays /dashboard (no auto-localization)", () => {
      const result = buildOAuthCallbackPath("/dashboard");
      expect(readOAuthCallbackNext(result)).toBe("/dashboard");
    });

    it("/ stays /", () => {
      const result = buildOAuthCallbackPath("/");
      expect(readOAuthCallbackNext(result)).toBe("/");
    });
  });

  describe("invariant: rejects unsafe destinations", () => {
    // Open-redirect protection. getSafeAuthNext should already block these,
    // but we lock the contract in here so a refactor can't regress.
    const evilInputs: Array<{ input: string; reason: string }> = [
      { input: "//evil.com", reason: "protocol-relative URL" },
      { input: "//evil.com/path", reason: "protocol-relative with path" },
      { input: "https://evil.com", reason: "absolute external URL" },
      { input: "http://evil.com", reason: "absolute http URL" },
      { input: "javascript:alert(1)", reason: "javascript scheme" },
      { input: "no-leading-slash", reason: "no leading slash" },
      { input: "%2F%2Fevil.com", reason: "percent-encoded protocol-relative" },
    ];

    it.each(evilInputs)("falls back to '/' for $reason ($input)", ({ input }) => {
      const result = buildOAuthCallbackPath(input);
      expect(readOAuthCallbackNext(result)).toBe("/");
    });
  });

  describe("invariant: nullish and empty inputs collapse to '/'", () => {
    it.each([null, undefined, ""])("input %s -> next is /", (input) => {
      const result = buildOAuthCallbackPath(input);
      expect(readOAuthCallbackNext(result)).toBe("/");
    });
  });

  describe("invariant: percent-encodes the next value safely", () => {
    it("encodes / as %2F so query parsing works", () => {
      const result = buildOAuthCallbackPath("/en/foo");
      expect(result).toContain("next=%2Fen%2Ffoo");
    });

    it("preserves query strings on the destination", () => {
      // Note: getSafeAuthNext does decodeURIComponent first, so a path with
      // a query like "/dashboard?tab=1" round-trips through URL parsing.
      const result = buildOAuthCallbackPath("/dashboard?tab=1");
      expect(readOAuthCallbackNext(result)).toBe("/dashboard?tab=1");
    });
  });
});

describe("readOAuthCallbackNext", () => {
  it("returns null when path does not match the callback route", () => {
    expect(readOAuthCallbackNext("/some-other-path?next=/foo")).toBeNull();
  });

  it("returns null when there is no next query param", () => {
    expect(readOAuthCallbackNext(OAUTH_CALLBACK_PATH)).toBeNull();
  });

  it("returns the decoded next value", () => {
    expect(
      readOAuthCallbackNext(`${OAUTH_CALLBACK_PATH}?next=%2Fen%2Fdashboard`),
    ).toBe("/en/dashboard");
  });
});
