"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { logEvent } from "@/lib/analytics";

function inferReferrer(referrerUrl: string): string {
  if (!referrerUrl) return "direct";
  if (referrerUrl.includes("youtube.com")) return "social_youtube";
  if (referrerUrl.includes("instagram.com")) return "social_instagram";
  if (referrerUrl.includes("discord.com")) return "social_discord";
  if (referrerUrl.includes("google.com")) return "organic_search";
  if (referrerUrl.includes("naver.com")) return "organic_search";
  if (referrerUrl.includes("daum.net")) return "organic_search";
  return "unknown";
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
    logEvent("session_start", {
      referrer: params.get("ref") ?? inferReferrer(document.referrer),
      notification_id: params.get("nid") ?? undefined,
      path: window.location.pathname,
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
