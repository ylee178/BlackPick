import { describe, expect, it } from "vitest";
import { snapshotsEqual, type Notification, type NotificationsSnapshot } from "./use-notifications";

function n(overrides: Partial<Notification> = {}): Notification {
  return {
    id: "1",
    type: "fight_start",
    title: "Fight starting",
    body: "",
    reference_id: null,
    is_read: false,
    created_at: "2026-04-17T12:00:00Z",
    ...overrides,
  };
}

function snap(
  notifications: Notification[],
  unreadCount: number,
): NotificationsSnapshot {
  return { notifications, unreadCount };
}

describe("snapshotsEqual", () => {
  it("is true for two empty snapshots", () => {
    expect(snapshotsEqual(snap([], 0), snap([], 0))).toBe(true);
  });

  it("is false when unreadCount differs", () => {
    expect(snapshotsEqual(snap([n()], 1), snap([n()], 0))).toBe(false);
  });

  it("is false when length differs", () => {
    expect(
      snapshotsEqual(snap([n({ id: "1" })], 1), snap([n({ id: "1" }), n({ id: "2" })], 2)),
    ).toBe(false);
  });

  it("is true when same ids + same is_read (title/body/created_at ignored)", () => {
    const a = snap(
      [n({ id: "1", is_read: false, title: "old title" })],
      1,
    );
    const b = snap(
      [
        n({
          id: "1",
          is_read: false,
          title: "new title",
          body: "new body",
          created_at: "2026-04-18T00:00:00Z",
        }),
      ],
      1,
    );
    expect(snapshotsEqual(a, b)).toBe(true);
  });

  it("is false when any notification's is_read flipped", () => {
    const a = snap([n({ id: "1", is_read: false })], 1);
    const b = snap([n({ id: "1", is_read: true })], 0);
    expect(snapshotsEqual(a, b)).toBe(false);
  });

  it("is false when one notification's is_read flipped but unreadCount matches", () => {
    // Both snapshots have unreadCount=1, so the early unreadCount guard
    // passes and the per-item is_read check is the real decider. This
    // guards the loop branch against future refactors that might skip it
    // when the total count lines up.
    const a = snap(
      [n({ id: "1", is_read: true }), n({ id: "2", is_read: false })],
      1,
    );
    const b = snap(
      [n({ id: "1", is_read: false }), n({ id: "2", is_read: true })],
      1,
    );
    expect(snapshotsEqual(a, b)).toBe(false);
  });

  it("is false when an id changed even if is_read matches", () => {
    const a = snap([n({ id: "1", is_read: false })], 1);
    const b = snap([n({ id: "2", is_read: false })], 1);
    expect(snapshotsEqual(a, b)).toBe(false);
  });

  it("is order-sensitive — same ids in different positions count as different", () => {
    const a = snap(
      [n({ id: "1" }), n({ id: "2" })],
      2,
    );
    const b = snap(
      [n({ id: "2" }), n({ id: "1" })],
      2,
    );
    // The API returns notifications newest-first; a stable order means a
    // reorder is a real change (e.g. a new notification pushed an old one
    // down). Order-sensitivity is the correct semantics here.
    expect(snapshotsEqual(a, b)).toBe(false);
  });
});
