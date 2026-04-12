// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// Mock fetch globally before importing analytics
const fetchMock = vi.fn().mockResolvedValue(new Response("ok"));
vi.stubGlobal("fetch", fetchMock);

// Mock sessionStorage
const sessionStorageMock = (() => {
  const store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] ?? null,
    setItem: (key: string, value: string) => { store[key] = value; },
    removeItem: (key: string) => { delete store[key]; },
    clear: () => { Object.keys(store).forEach((k) => delete store[k]); },
    get length() { return Object.keys(store).length; },
    key: (i: number) => Object.keys(store)[i] ?? null,
  };
})();
vi.stubGlobal("sessionStorage", sessionStorageMock);

import { getSessionId, logEvent } from "./analytics";

beforeEach(() => {
  fetchMock.mockClear();
  sessionStorageMock.clear();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("getSessionId", () => {
  it("generates a session ID and persists to sessionStorage", () => {
    const id = getSessionId();
    expect(id).toBeTruthy();
    expect(typeof id).toBe("string");
    expect(sessionStorageMock.getItem("bp_session_id")).toBe(id);
  });

  it("returns the same ID on subsequent calls (same session)", () => {
    const id1 = getSessionId();
    const id2 = getSessionId();
    expect(id1).toBe(id2);
  });

  it("returns the stored ID if sessionStorage already has one", () => {
    sessionStorageMock.setItem("bp_session_id", "existing-123");
    expect(getSessionId()).toBe("existing-123");
  });
});

describe("logEvent", () => {
  it("fires a POST to /api/analytics/event with correct payload shape", () => {
    logEvent("session_start", { referrer: "direct" });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, opts] = fetchMock.mock.calls[0];
    expect(url).toBe("/api/analytics/event");
    expect(opts.method).toBe("POST");
    expect(opts.keepalive).toBe(true);

    const body = JSON.parse(opts.body);
    expect(body.event_type).toBe("session_start");
    expect(body.session_id).toBeTruthy();
    expect(body.metadata).toEqual({ referrer: "direct" });
    expect(body.fight_id).toBeNull();
    expect(body.event_id).toBeNull();
  });

  it("includes fight_id and event_id from context when provided", () => {
    logEvent("prediction_submitted", { winner_id: "abc" }, {
      fightId: "fight-1",
      eventId: "event-1",
    });

    const body = JSON.parse(fetchMock.mock.calls[0][1].body);
    expect(body.fight_id).toBe("fight-1");
    expect(body.event_id).toBe("event-1");
    expect(body.metadata.winner_id).toBe("abc");
  });

  it("never throws even if fetch rejects", () => {
    fetchMock.mockRejectedValueOnce(new Error("network error"));
    // Should not throw
    expect(() => logEvent("page_view", { path: "/test" })).not.toThrow();
  });

  it("sets Content-Type header to application/json", () => {
    logEvent("login_completed", { method: "google" });

    const opts = fetchMock.mock.calls[0][1];
    // headers can be a plain object or Headers instance; check both
    const ct =
      typeof opts.headers?.get === "function"
        ? opts.headers.get("Content-Type")
        : opts.headers?.["Content-Type"];
    expect(ct).toBe("application/json");
  });
});
