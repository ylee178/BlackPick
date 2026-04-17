// jsdom env per vitest.config.ts component project — storage events need a window.
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { TIMEZONE_STORAGE_KEY } from "@/lib/timezone";
import { subscribe } from "./use-timezone";

function dispatchStorage(key: string | null, oldValue: string | null, newValue: string | null) {
  // StorageEvent's constructor lets us set the four fields we actually care
  // about — jsdom's default ctor leaves oldValue/newValue null otherwise.
  const evt = new StorageEvent("storage", { key, oldValue, newValue });
  window.dispatchEvent(evt);
}

describe("use-timezone subscribe()", () => {
  let unsubscribe: () => void;

  beforeEach(() => {
    window.localStorage.clear();
  });

  afterEach(() => {
    unsubscribe?.();
  });

  it("fires the listener when a different timezone lands from another tab", () => {
    const listener = vi.fn();
    unsubscribe = subscribe(listener);
    dispatchStorage(TIMEZONE_STORAGE_KEY, "Asia/Seoul", "America/New_York");
    expect(listener).toHaveBeenCalledTimes(1);
  });

  it("skips the listener when oldValue === newValue (no-op write from another tab)", () => {
    const listener = vi.fn();
    unsubscribe = subscribe(listener);
    // A cross-tab setItem with the same value still fires a storage event
    // everywhere. Without the short-circuit, every subscriber would wake
    // to recompute an identical snapshot.
    dispatchStorage(TIMEZONE_STORAGE_KEY, "Asia/Seoul", "Asia/Seoul");
    expect(listener).not.toHaveBeenCalled();
  });

  it("ignores storage events for unrelated keys", () => {
    const listener = vi.fn();
    unsubscribe = subscribe(listener);
    dispatchStorage("bp_some_other_key", "a", "b");
    expect(listener).not.toHaveBeenCalled();
  });

  it("treats a storage event with null key (localStorage.clear) as relevant", () => {
    // key === null means the entire storage was cleared; we should refresh
    // since our preference may have been wiped.
    const listener = vi.fn();
    unsubscribe = subscribe(listener);
    dispatchStorage(null, "Asia/Seoul", null);
    expect(listener).toHaveBeenCalledTimes(1);
  });

  it("unsubscribe stops further listener calls", () => {
    const listener = vi.fn();
    const off = subscribe(listener);
    off();
    unsubscribe = () => {};
    dispatchStorage(TIMEZONE_STORAGE_KEY, "Asia/Seoul", "America/New_York");
    expect(listener).not.toHaveBeenCalled();
  });
});
