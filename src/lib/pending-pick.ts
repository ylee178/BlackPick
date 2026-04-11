/**
 * Tiny localStorage shim for persisting a "user was about to pick X" intent
 * across the OAuth redirect round-trip.
 *
 * The Supabase OAuth flow is a full-page navigation, which means React state
 * in FightCardPicker is wiped when the user comes back. This module parks the
 * pending fighter id for the current fight so the event page can reapply the
 * selection on its first post-auth mount.
 *
 * Scope is deliberately tiny:
 *  - Exactly one pending pick at a time (newest click wins).
 *  - Fight-scoped: the consumer only restores when fightId matches its own.
 *  - Single-use: restore clears the stash immediately.
 *
 * No server storage, no cookies — we do not want to leak pending picks to
 * the server, and we do not want them to survive beyond the browser session
 * in a way the user can't reason about.
 */

const STORAGE_KEY = "bp:pendingPick:v1";
const MAX_AGE_MS = 10 * 60 * 1000; // 10 minutes — plenty for an OAuth round-trip

export type PendingPick = {
  fightId: string;
  fighterId: string;
  side: "a" | "b";
};

type StoredPendingPick = PendingPick & {
  timestamp: number;
};

function isBrowser(): boolean {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

export function savePendingPick(pick: PendingPick): void {
  if (!isBrowser()) return;
  try {
    const stored: StoredPendingPick = { ...pick, timestamp: Date.now() };
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(stored));
  } catch {
    // QuotaExceededError or private-browsing restriction — fail silent. The
    // user will simply have to reselect after auth, which is the same
    // behavior as before this feature existed.
  }
}

export function loadPendingPick(): PendingPick | null {
  if (!isBrowser()) return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<StoredPendingPick>;
    if (
      typeof parsed.fightId !== "string" ||
      typeof parsed.fighterId !== "string" ||
      (parsed.side !== "a" && parsed.side !== "b") ||
      typeof parsed.timestamp !== "number"
    ) {
      // Corrupt / wrong-shape stash (old schema, manual tampering, etc.).
      clearPendingPick();
      return null;
    }
    if (Date.now() - parsed.timestamp > MAX_AGE_MS) {
      // Stale. User abandoned the flow; don't ambush them later with a
      // fighter they no longer remember selecting.
      clearPendingPick();
      return null;
    }
    return {
      fightId: parsed.fightId,
      fighterId: parsed.fighterId,
      side: parsed.side,
    };
  } catch {
    clearPendingPick();
    return null;
  }
}

export function clearPendingPick(): void {
  if (!isBrowser()) return;
  try {
    window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    // ignore
  }
}
