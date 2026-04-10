"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { logEvent } from "@/lib/analytics";

/**
 * Map a referrer URL to a coarse bucket for attribution analytics.
 * Parses the hostname properly (not substring) so that google.com.fake
 * or ...?q=google.com in a query string don't false-match.
 */
function inferReferrer(referrerUrl: string): string {
  if (!referrerUrl) return "direct";
  let hostname: string;
  try {
    hostname = new URL(referrerUrl).hostname.toLowerCase();
  } catch {
    return "unknown";
  }
  if (!hostname) return "unknown";

  // Helper: match `domain.tld` as an exact host or any subdomain of it.
  const matches = (suffix: string) =>
    hostname === suffix || hostname.endsWith(`.${suffix}`);

  if (matches("youtube.com") || matches("youtu.be")) return "social_youtube";
  if (matches("instagram.com")) return "social_instagram";
  if (matches("discord.com") || matches("discord.gg")) return "social_discord";
  if (matches("twitter.com") || matches("x.com") || matches("t.co")) return "social_twitter";
  if (matches("facebook.com") || matches("fb.com")) return "social_facebook";
  if (matches("reddit.com")) return "social_reddit";
  if (matches("tiktok.com")) return "social_tiktok";

  // Search engines — cover major global + KR/JP/CN TLDs
  if (hostname.includes("google.")) return "organic_search";
  if (matches("bing.com")) return "organic_search";
  if (matches("duckduckgo.com")) return "organic_search";
  if (matches("naver.com")) return "organic_search";
  if (matches("daum.net")) return "organic_search";
  if (matches("yahoo.co.jp") || matches("yahoo.com")) return "organic_search";
  if (matches("baidu.com")) return "organic_search";

  return "unknown";
}

/**
 * Classify the current device from the UA string. Three buckets are enough
 * to answer "does our mobile funnel convert worse than desktop?" — anything
 * finer (OS/browser version) is noise for launch-week analytics.
 *
 * iPadOS 13+ reports as "Macintosh" with no "iPad" token — we use the
 * touchscreen heuristic (maxTouchPoints > 1 on a Mac) to rescue it.
 */
function inferDeviceType(
  userAgent: string,
  maxTouchPoints = 0,
): "mobile" | "tablet" | "desktop" {
  if (!userAgent) return "desktop";
  if (/iPad/i.test(userAgent) || /Tablet/i.test(userAgent)) return "tablet";
  // iPadOS 13+ disguise: Macintosh UA + touchscreen = actually an iPad
  if (/Macintosh/i.test(userAgent) && maxTouchPoints > 1) return "tablet";
  if (/Mobi|Android|iPhone/i.test(userAgent)) return "mobile";
  return "desktop";
}

/**
 * Pick up standard UTM parameters from the current URL if present. Returns
 * undefined for missing keys so we don't bloat the metadata JSON with nulls.
 */
function extractUtmParams(params: URLSearchParams): Record<string, string> {
  const utm: Record<string, string> = {};
  for (const key of ["utm_source", "utm_medium", "utm_campaign", "utm_content", "utm_term"]) {
    const value = params.get(key);
    if (value) utm[key] = value;
  }
  return utm;
}

/**
 * Analytics session + page view tracker. Place once in the locale layout.
 * Fires session_start on mount and page_view on every pathname change.
 */
export default function AnalyticsProvider() {
  const pathname = usePathname();
  const prevPathRef = useRef<string | null>(null);
  const sessionStartedRef = useRef(false);

  // Session start — fires once per component mount (= once per browser tab)
  useEffect(() => {
    if (sessionStartedRef.current) return;
    sessionStartedRef.current = true;

    const params = new URLSearchParams(window.location.search);
    const utm = extractUtmParams(params);
    logEvent("session_start", {
      referrer: params.get("ref") ?? inferReferrer(document.referrer),
      notification_id: params.get("nid") ?? undefined,
      landing_path: window.location.pathname,
      device_type: inferDeviceType(
        navigator.userAgent,
        navigator.maxTouchPoints ?? 0,
      ),
      ...utm,
    });

    // One-shot OAuth login detection — the callback route appends `bp_lm`
    // with the auth provider name (email/google/facebook). Log it and
    // strip it from the visible URL so it doesn't leak into shares or
    // subsequent analytics events.
    const loginMethod = params.get("bp_lm");
    if (loginMethod) {
      logEvent("login_completed", { method: loginMethod });
      params.delete("bp_lm");
      const cleanQuery = params.toString();
      const cleanUrl =
        window.location.pathname + (cleanQuery ? `?${cleanQuery}` : "") + window.location.hash;
      window.history.replaceState({}, "", cleanUrl);
    }
  }, []);

  // Page view — fires on every real pathname change (client navigation).
  // The same-path guard prevents duplicate logging when `usePathname` fires
  // with an unchanged value (e.g., after a history.replaceState in this same
  // component stripping the `bp_lm` query param).
  useEffect(() => {
    if (!pathname) return;
    if (prevPathRef.current === pathname) return;

    logEvent("page_view", {
      path: pathname,
      prev_path: prevPathRef.current,
    });

    prevPathRef.current = pathname;
  }, [pathname]);

  return null;
}
