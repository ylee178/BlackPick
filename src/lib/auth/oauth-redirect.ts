import { getSafeAuthNext } from "@/lib/auth-next";

/**
 * The single source of truth for the OAuth callback path.
 *
 * The PKCE flow under @supabase/ssr stores the code verifier in an HttpOnly
 * cookie, so the code MUST be exchanged server-side. The provider must return
 * the user to this exact path — never directly to a destination page —
 * otherwise the session is never established.
 */
export const OAUTH_CALLBACK_PATH = "/api/auth/callback";

/**
 * Build the relative `next=` query value used by the OAuth callback route.
 *
 * Invariants enforced here:
 *  1. Result is ALWAYS a path under {@link OAUTH_CALLBACK_PATH}, never a
 *     destination page directly. This protects against the original PKCE
 *     bypass bug where Google was redirected to /en?code=... and the code
 *     was never exchanged.
 *  2. The destination is sanitized through {@link getSafeAuthNext}, which
 *     decodes percent-encoded sequences and rejects external/protocol-
 *     relative URLs.
 *  3. The destination path is passed through AS-IS without any locale
 *     prefixing. The next-intl middleware (proxy.ts) is the single owner
 *     of locale resolution after the callback redirects. Pre-prefixing
 *     here caused the /en/en double-prefix bug because upstream callers
 *     pass `window.location.pathname` which is already locale-prefixed.
 *
 * @param redirectTo Raw post-login destination requested by the caller.
 *   Can be `/`, a non-localized path like `/dashboard`, or an already
 *   locale-prefixed path like `/en/dashboard`. The function tolerates
 *   nullish input and falls back to `/`.
 * @returns A relative URL string starting with `/api/auth/callback?next=`.
 */
export function buildOAuthCallbackPath(redirectTo: string | null | undefined): string {
  const safeNext = getSafeAuthNext(redirectTo);
  return `${OAUTH_CALLBACK_PATH}?next=${encodeURIComponent(safeNext)}`;
}

/**
 * Extract the `next` value back out of an OAuth callback path. Useful in
 * tests to round-trip and assert the destination was preserved correctly.
 */
export function readOAuthCallbackNext(callbackPath: string): string | null {
  try {
    // Use a placeholder origin so URL can parse a relative path.
    const url = new URL(callbackPath, "https://placeholder.invalid");
    if (url.pathname !== OAUTH_CALLBACK_PATH) return null;
    return url.searchParams.get("next");
  } catch {
    return null;
  }
}
