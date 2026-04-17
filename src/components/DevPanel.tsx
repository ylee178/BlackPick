"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "@/i18n/navigation";
import { Settings, Loader2, X, Undo2 } from "lucide-react";
// Note: ChevronRight removed with v3 — ActionRow was deleted in favor
// of PresetButton + CompactActionButton grids.
import { Switch } from "@base-ui/react/switch";
import { createBrowserSupabaseClient } from "@/lib/supabase";
import {
  TIMER_PRESETS,
  isValidSnapshot,
  snapshotLocalStorageKey,
  type EventSnapshot,
} from "@/lib/dev-state-helpers";

/**
 * DevPanel v3 — compact Korean layout with scenario presets at top.
 *
 * **한국어 전용**: DevPanel은 Sean의 개인 테스트 도구이므로 i18n 대상
 * 아님 (`src/messages/*.json`에 추가하지 않음). 한국어 라벨을 하드
 * 코딩. 향후 외부 기여자가 이 저장소를 클론해서 쓰는 경우에도 영어
 * fallback 추가할 필요 없음 — 이 주석이 그 결정을 기록하는 단일 출처.
 *
 * Visible only when `NODE_ENV === 'development'`. The server endpoint
 * (`/api/dev/seed`) has its own env guard that returns 403 in prod, so
 * even if the client bundle accidentally shipped with this component
 * included, none of the mutations would go through.
 *
 * Sections (top to bottom):
 *   - 프리셋: 1-click scenario setup (첫 방문 / 예측 완료 / 라이브 중
 *     / 결과 확인) — saves ~24 clicks per session vs manual flipping
 *   - 이벤트 상태: upcoming / live / completed (3 switches, mutex)
 *   - 내 계정: ring name / picks toggles + streak input
 *   - 콘텐츠 플래그: preview / clear (2 action buttons)
 *   - 데이터: seed / wipe / show 404 (3 action buttons)
 *   - 토스트 락 리셋: 3 compact reset buttons in a row
 *
 * DESIGN.md typography exemption: DevPanel uses `text-[9px]`,
 * `text-[10px]`, `text-[11px]` below the 12px minimum because it's a
 * dev-only internal tool, never seen by real users.
 *
 * State is derived from the server on mount via a composite action
 * (`get-user-state`) so the switches reflect reality after any manual
 * change Sean makes in another tab.
 */

const isDev = process.env.NODE_ENV === "development";

type EventStatus = "upcoming" | "live" | "completed";

type UserState = {
  has_ring_name: boolean;
  ring_name: string | null;
  has_predictions: boolean;
  prediction_count: number;
  predicted_on_latest: number;
  predictable_on_latest: number;
  current_streak: number;
  best_streak: number;
  latest_event_id: string | null;
  latest_event_name: string | null;
  latest_event_status: string | null;
};

const DEFAULT_STATE: UserState = {
  has_ring_name: false,
  ring_name: null,
  has_predictions: false,
  prediction_count: 0,
  predicted_on_latest: 0,
  predictable_on_latest: 0,
  current_streak: 0,
  best_streak: 0,
  latest_event_id: null,
  latest_event_name: null,
  latest_event_status: null,
};

async function callSeed(action: string, body: Record<string, unknown> = {}) {
  const res = await fetch("/api/dev/seed", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action, ...body }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data?.error || "Failed");
  return data;
}

type EventOption = {
  id: string;
  name: string;
  date: string;
  status: "upcoming" | "live" | "completed";
};

export default function DevPanel() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState<string | null>(null);
  const [overlay, setOverlay] = useState(false);
  const [message, setMessage] = useState("");
  const [userId, setUserId] = useState<string | null>(null);
  const [state, setState] = useState<UserState>(DEFAULT_STATE);
  const [streakDraft, setStreakDraft] = useState<{ current: string; best: string }>({
    current: "0",
    best: "0",
  });
  // Event picker + sandbox snapshot — Sean 2026-04-14 mental model:
  //   1. Pick an event → auto-capture snapshot of its current state
  //   2. Mutate via DevPanel (state flips, timer, presets, flags)
  //   3. 리셋 button → restore DB to snapshot
  //
  // Snapshot is stored in both React state (for 리셋 button) AND
  // localStorage (so page reloads don't lose it). Each event has its
  // own snapshot namespace so switching between events preserves
  // earlier snapshots.
  const [events, setEvents] = useState<EventOption[]>([]);
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
  const [snapshot, setSnapshot] = useState<EventSnapshot | null>(null);
  const [snapshotLoading, setSnapshotLoading] = useState(false);

  const refreshState = useCallback(
    async (uid: string | null, eventIdOverride?: string | null) => {
      if (!uid) {
        setState(DEFAULT_STATE);
        return;
      }
      try {
        // Forward selected event so getUserState + latest_event_id
        // align with the home page's featured logic (reviewer round 2
        // [major] fold — was diverging and causing wrong toast lock
        // wipe in handleReplayAllPredictedToast).
        const eventId = eventIdOverride ?? selectedEventId ?? undefined;
        const body: Record<string, unknown> = { userId: uid };
        if (eventId) body.eventId = eventId;
        const data = await callSeed("get-user-state", body);
        const next = data as UserState;
        setState(next);
        setStreakDraft({
          current: String(next.current_streak ?? 0),
          best: String(next.best_streak ?? 0),
        });
      } catch {
        // swallow — dev panel should never block the page
      }
    },
    [selectedEventId],
  );

  // Resolve the current user id once on mount, then fetch composite state.
  useEffect(() => {
    if (!isDev) return;
    let cancelled = false;
    (async () => {
      try {
        const supabase = createBrowserSupabaseClient();
        const { data } = await supabase.auth.getUser();
        const uid = data.user?.id ?? null;
        if (cancelled) return;
        setUserId(uid);
        await refreshState(uid);
      } catch {
        // ignore
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [refreshState]);

  // Fetch events list once on mount for the event picker dropdown.
  // Re-fetches after Seed/Wipe actions (via `refreshEvents()` call).
  const refreshEvents = useCallback(async () => {
    try {
      const data = await callSeed("list-events");
      const list = (data?.events ?? []) as EventOption[];
      setEvents(list);
    } catch {
      /* swallow — dev panel should never block */
    }
  }, []);

  useEffect(() => {
    if (!isDev) return;
    refreshEvents();
  }, [refreshEvents]);

  // On mount, read `?dev_event` from URL and restore selectedEventId.
  // Runs once — allows Sean to refresh the page and keep the picker
  // synced to whatever event is currently featured via the override.
  useEffect(() => {
    if (!isDev) return;
    try {
      const params = new URLSearchParams(window.location.search);
      const urlEventId = params.get("dev_event");
      if (urlEventId) setSelectedEventId(urlEventId);
    } catch {
      /* ignore */
    }
  }, []);

  // Rehydrate snapshot from localStorage on mount — survives page
  // reloads so Sean's sandbox state persists across `router.push`
  // navigations + manual refreshes.
  useEffect(() => {
    if (!selectedEventId) {
      setSnapshot(null);
      return;
    }
    try {
      const raw = window.localStorage.getItem(snapshotLocalStorageKey(selectedEventId));
      if (!raw) {
        setSnapshot(null);
        return;
      }
      const parsed = JSON.parse(raw);
      if (isValidSnapshot(parsed)) {
        setSnapshot(parsed);
      } else {
        // Corrupted or stale (older DevPanel version) — drop it
        window.localStorage.removeItem(snapshotLocalStorageKey(selectedEventId));
        setSnapshot(null);
      }
    } catch {
      setSnapshot(null);
    }
  }, [selectedEventId]);

  /**
   * Captures a fresh snapshot of the selected event. Called
   * automatically when Sean picks an event from the dropdown AND
   * no prior snapshot exists for that event in localStorage.
   * Manual re-snap is triggered via the "스냅샷 재촬영" button.
   */
  const captureSnapshotForEvent = useCallback(
    async (eventId: string): Promise<EventSnapshot | null> => {
      setSnapshotLoading(true);
      try {
        const data = await callSeed("capture-snapshot", { eventId });
        if (!data?.ok || !isValidSnapshot(data?.snapshot)) {
          setMessage("스냅샷 캡처 실패");
          return null;
        }
        const snap = data.snapshot as EventSnapshot;
        setSnapshot(snap);
        try {
          window.localStorage.setItem(
            snapshotLocalStorageKey(eventId),
            JSON.stringify(snap),
          );
        } catch {
          /* localStorage full / unavailable — snapshot still in React state */
        }
        setMessage(`스냅샷 캡처됨 (${snap.fights.length}개 경기)`);
        return snap;
      } catch (e) {
        setMessage(e instanceof Error ? e.message : "스냅샷 캡처 실패");
        return null;
      } finally {
        setSnapshotLoading(false);
      }
    },
    [],
  );

  // Event picker onChange handler — auto-captures snapshot if one
  // doesn't already exist for this event. If there's already a
  // snapshot in localStorage, the rehydrate effect above picks it up
  // and we don't re-capture (preserves Sean's original state).
  const handleEventPick = async (nextEventId: string | null) => {
    setSelectedEventId(nextEventId);
    if (!nextEventId) {
      setSnapshot(null);
      router.push("/");
      router.refresh();
      return;
    }
    // Check if a snapshot already exists (rehydrate effect fires
    // on state change — race-safe to check directly here).
    let alreadyCaptured = false;
    try {
      const raw = window.localStorage.getItem(snapshotLocalStorageKey(nextEventId));
      alreadyCaptured = !!raw;
    } catch {
      /* ignore */
    }
    if (!alreadyCaptured) {
      // No existing snapshot — capture fresh
      await captureSnapshotForEvent(nextEventId);
    }
    // Navigate to home with the dev override — page.tsx reads
    // `dev_event` from searchParams in dev mode and features it,
    // so Sean immediately sees the picked event on screen.
    router.push(`/?dev_event=${encodeURIComponent(nextEventId)}`);
    router.refresh();
    await refreshState(userId, nextEventId);
  };

  /**
   * 리셋 — restores the selected event + its fights back to the
   * captured snapshot. This is the core sandbox affordance: Sean
   * mutates freely knowing he can always return to square one.
   */
  const handleResetToSnapshot = async () => {
    if (!snapshot) {
      setMessage("스냅샷 없음");
      return;
    }
    setLoading("reset:snapshot");
    setOverlay(true);
    setMessage("");
    try {
      const data = await callSeed("restore-snapshot", { snapshot });
      if (!data?.ok) {
        setMessage(data?.reason ?? "리셋 실패");
        return;
      }
      setMessage(`리셋 완료 (${data.fights_restored ?? 0}개 경기)`);
      await refreshState(userId);
      await refreshEvents();
      router.refresh();
      await new Promise((r) => setTimeout(r, 400));
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "리셋 실패");
    } finally {
      setLoading(null);
      setOverlay(false);
    }
  };

  /**
   * 스냅샷 재촬영 — manually re-captures the current state as the new
   * snapshot. Use case: Sean applied some mutations he wants to
   * checkpoint as the new "원래 상태" before exploring further.
   */
  const handleResnapshot = async () => {
    if (!selectedEventId) return;
    await captureSnapshotForEvent(selectedEventId);
    router.refresh();
  };

  if (!isDev) return null;

  const run = async (
    label: string,
    action: string,
    body: Record<string, unknown> = {},
    options: { message?: (data: unknown) => string } = {},
  ) => {
    setLoading(label);
    setOverlay(true);
    setMessage("");
    try {
      // Merge selectedEventId into body if set. Actions that don't
      // care about eventId will just ignore it server-side; actions
      // that do (setEventStatus, setTimer, completeFights, etc.) will
      // target the picker selection instead of home-featured fallback.
      const mergedBody = selectedEventId
        ? { ...body, eventId: selectedEventId }
        : body;
      const data = await callSeed(action, mergedBody);
      if (options.message) {
        setMessage(options.message(data));
      }
      await refreshState(userId);
      await refreshEvents();
      // If a target event is selected, ensure home page features it
      // after the mutation so Sean sees the result immediately.
      if (selectedEventId) {
        router.push(`/?dev_event=${encodeURIComponent(selectedEventId)}`);
      }
      router.refresh();
      // Let the server layer re-render before removing the overlay.
      await new Promise((r) => setTimeout(r, 400));
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Error");
    } finally {
      setLoading(null);
      setOverlay(false);
    }
  };

  // ── Event State ────────────────────────────────────────────────────
  const currentEventStatus: EventStatus | null = (() => {
    const s = state.latest_event_status;
    if (s === "upcoming" || s === "live" || s === "completed") return s;
    return null;
  })();

  const handleEventStatus = async (next: EventStatus) => {
    // Silent no-op 클릭은 DevPanel이 고장난 것처럼 보이게 만듦.
    // 같은 상태 클릭 시 피드백 메시지를 surface — 서버 쪽
    // setEventStatus는 idempotent하므로 강제로 re-run할 필요가
    // 있으면 다른 경로로 가능.
    const labels: Record<EventStatus, string> = {
      upcoming: "업커밍",
      live: "라이브",
      completed: "완료됨",
    };
    if (next === currentEventStatus) {
      setMessage(`이미 ${labels[next]} 상태`);
      return;
    }
    await run(`event:${next}`, "set-event-status", { status: next }, {
      message: () => `이벤트 → ${labels[next]}`,
    });
  };

  // ── User State ─────────────────────────────────────────────────────
  const handleRingNameToggle = async (on: boolean) => {
    if (!userId) return;
    if (on === state.has_ring_name) return;
    await run(
      on ? "ringname:on" : "ringname:off",
      "set-ring-name",
      { userId, ringName: on ? "DevTester" : null },
      {
        message: () => (on ? "링네임 → DevTester" : "링네임 삭제됨"),
      },
    );
  };

  const handlePredictionsToggle = async (on: boolean) => {
    if (!userId) return;
    if (on) {
      await run("picks:seed", "seed-me", { userId }, {
        // `seedMyData` returns `{ predictions, wins, losses, ... }`.
        // Round 2 fold: was `.seeded` which never existed, always
        // showing "0개" in the status row.
        message: (d) => `${(d as { predictions?: number }).predictions ?? 0}개 픽 시드됨`,
      });
    } else {
      await run("picks:clear", "clear-my-predictions", { userId }, {
        message: (d) => `${(d as { cleared?: number }).cleared ?? 0}개 픽 삭제됨`,
      });
    }
  };

  // Wrapper for direct callSeed inside preset/replay handlers.
  // Merges selectedEventId into body for event-targeted actions so
  // preset flows honor the event picker.
  const callSeedWithEvent = async (
    action: string,
    body: Record<string, unknown> = {},
  ) => {
    const merged = selectedEventId ? { ...body, eventId: selectedEventId } : body;
    return callSeed(action, merged);
  };

  /**
   * Navigate to home page with the dev_event override if a target
   * event is selected. Used by preset/timer/replay handlers so
   * Sean lands on the event he picked instead of the home-featured
   * fallback.
   */
  const navigateToTargetEvent = () => {
    if (selectedEventId) {
      router.push(`/?dev_event=${encodeURIComponent(selectedEventId)}`);
    } else {
      router.push("/");
    }
  };

  // ── 시나리오 프리셋 ───────────────────────────────────────────────
  //
  // 각 프리셋은 기존 핸들러들을 순차 호출. `run()` 래퍼를 통한
  // overlay + refresh 흐름을 하나의 시나리오 호출로 합침.
  //
  // 순서 주의사항:
  //  - seed-me는 `status='completed'`인 fights (historical) +
  //    latest event의 upcoming fights 양쪽에 predictions 생성
  //  - `결과 확인` 은 set-event-status: completed를 **먼저** 실행해야
  //    함. 순서가 반대면 seed-me가 실행될 때 fights가 아직 upcoming
  //    이라 historical picks만 생기고, 그 후 completeFights가 flip
  //    하지만 이미 seed-me는 끝남 → 현재 event에 picks 없음
  //  - `라이브 중` 은 seed-me가 먼저 여도 OK. seed-me의 upcoming
  //    extension이 현재 이벤트 fights에 pre-lock picks를 생성하고,
  //    그 후 set-event-status: live가 start_time을 past로 밀어 lock
  //    상태 시뮬레이션
  const applyPreset = async (
    name: "firstVisit" | "picksComplete" | "live" | "completed",
  ) => {
    if (!userId) return;
    setLoading(`preset:${name}`);
    setOverlay(true);
    setMessage("");
    try {
      if (name === "firstVisit") {
        // 첫 방문: 링네임 없음 + 픽 없음 + 업커밍 + 스트릭 0/0
        await callSeedWithEvent("set-event-status", { status: "upcoming" });
        await callSeedWithEvent("set-ring-name", { userId, ringName: null });
        await callSeedWithEvent("clear-my-predictions", { userId });
        await callSeedWithEvent("set-streak", { userId, current: 0, best: 0 });
        setMessage("프리셋 → 첫 방문");
      } else if (name === "picksComplete") {
        // 예측 완료: 링네임 있음 + 현재 upcoming event에 pre-lock
        // picks + historical picks + 업커밍. seed-me가 현재 이벤트의
        // upcoming fights에도 pre-lock picks를 생성하므로 순서는
        // event-first가 맞음 (fights가 upcoming일 때 seed-me 실행).
        await callSeedWithEvent("set-event-status", { status: "upcoming" });
        await callSeedWithEvent("set-ring-name", { userId, ringName: "DevTester" });
        await callSeedWithEvent("seed-me", { userId });
        setMessage("프리셋 → 예측 완료");
      } else if (name === "live") {
        // 라이브 중: 링네임 있음 + 픽 저장 + 라이브 + 스트릭 2/2
        // seed-me를 event flip 전에 실행 — seed-me는 현재 이벤트의
        // upcoming fights에 pre-lock picks를 만들고, 그 다음
        // set-event-status: live가 start_time을 past로 밀어 lock
        // 상태를 시뮬레이션. 순서가 반대면 live flip이 fights.status
        // 를 유지하지만 start_time 이 과거로 이동한 상태에서 seed-me
        // 는 여전히 upcoming 필터로 찾을 수 있음 (무방)
        await callSeedWithEvent("set-ring-name", { userId, ringName: "DevTester" });
        await callSeedWithEvent("seed-me", { userId });
        await callSeedWithEvent("set-event-status", { status: "live" });
        await callSeedWithEvent("set-streak", { userId, current: 2, best: 2 });
        setMessage("프리셋 → 라이브 중");
      } else if (name === "completed") {
        // 결과 확인: 링네임 있음 + 픽 저장 + 완료 + 스트릭 3/3
        // **순서 주의** (round 2 blocker fold): set-event-status를
        // 반드시 먼저 실행해서 fights를 completed 상태로 flip해야
        // 함. 그 후에 seed-me가 실행돼서 이제-completed fights에
        // historical-style picks를 생성. 순서가 반대면 seed-me가
        // 실행될 때 fights는 아직 upcoming이라 현재 이벤트의
        // completed-now fights에 picks가 안 만들어짐 → "결과 확인"
        // 시나리오에서 내 픽 vs 결과 UI 확인 불가.
        await callSeedWithEvent("set-ring-name", { userId, ringName: "DevTester" });
        await callSeedWithEvent("set-event-status", { status: "completed" });
        await callSeedWithEvent("seed-me", { userId });
        await callSeedWithEvent("set-streak", { userId, current: 3, best: 3 });
        setMessage("프리셋 → 결과 확인");
      }
      await refreshState(userId);
      navigateToTargetEvent();
      router.refresh();
      await new Promise((r) => setTimeout(r, 400));
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "프리셋 실패");
    } finally {
      setLoading(null);
      setOverlay(false);
    }
  };

  const streakCurrentNum = Number.parseInt(streakDraft.current, 10);
  const streakBestNum = Number.parseInt(streakDraft.best, 10);
  const streakDraftValid =
    Number.isFinite(streakCurrentNum) &&
    Number.isFinite(streakBestNum) &&
    streakCurrentNum >= 0 &&
    streakBestNum >= 0 &&
    streakCurrentNum <= streakBestNum;

  const handleSetStreak = async () => {
    if (!userId || !streakDraftValid) return;
    await run(
      "streak:set",
      "set-streak",
      { userId, current: streakCurrentNum, best: streakBestNum },
      {
        message: () => `연승 → ${streakCurrentNum}/${streakBestNum}`,
      },
    );
  };

  /**
   * 모의 타이머 설정 — fight.start_time 을 `now + minutesAhead` 로
   * 밀어서 Sean이 원하는 카운트다운 상태를 즉시 시뮬레이션.
   * 이벤트 상태를 upcoming 으로도 flip (preset과 같은 의미체로).
   * 클릭 → 홈으로 이동 + refresh 해서 Sean이 즉시 카운트다운 확인.
   */
  const handleSetTimer = async (
    minutesAhead: number,
    label: string,
  ) => {
    setLoading(`timer:${minutesAhead}`);
    setOverlay(true);
    setMessage("");
    try {
      await callSeedWithEvent("set-timer", { minutesAhead });
      setMessage(`타이머 → ${label} (홈 이동)`);
      navigateToTargetEvent();
      router.refresh();
      await new Promise((r) => setTimeout(r, 400));
      await refreshState(userId);
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "타이머 실패");
    } finally {
      setLoading(null);
      setOverlay(false);
    }
  };

  // ── Data utilities ─────────────────────────────────────────────────
  const handleShow404 = () => {
    router.push(`/en/__dev_not_found_${Date.now()}`);
  };

  const handleSeed = () => run("seed", "full", {}, {
    message: (d) => `${(d as { created_users?: number }).created_users ?? 0}명 유저 시드`,
  });

  const handleEmpty = () => run("empty", "empty", {}, {
    message: (d) => `${(d as { deleted_users?: number }).deleted_users ?? 0}명 유저 삭제`,
  });

  // ── 즉시 볼 수 있는 토스트/온보딩 트리거 ──────────────────────
  //
  // 이 세 개의 action은 단순 localStorage wipe가 아니라
  // **클릭 → Sean이 즉시 해당 UI를 눈으로 확인**할 수 있게 설계됨.
  // 각 action은 다음 3단계를 수행:
  //   (1) localStorage key wipe
  //   (2) 필요한 서버 prerequisite 세팅 (ring name, streak, picks)
  //   (3) 해당 UI가 렌더되는 페이지로 navigate + refresh
  // 결과: Sean은 DevPanel을 닫을 필요 없이 바로 그 페이지로 이동해서
  // 해당 UI가 뜨는 걸 본다.
  //
  // Sean 2026-04-14 피드백: "토스트락 리셋은 도대체 뭐야 누르면 내가
  // 그걸 볼수잇게해야하는데 뭘하는건지 모르겟다" — 이전 구현은 lock
  // 만 지우고 Sean이 어디 가서 뭘 볼지 알아내야 했음.

  const clearLocalStoragePrefixes = (prefixes: readonly string[]): number => {
    let cleared = 0;
    try {
      for (let i = window.localStorage.length - 1; i >= 0; i--) {
        const key = window.localStorage.key(i);
        if (!key) continue;
        if (prefixes.some((p) => key.startsWith(p))) {
          window.localStorage.removeItem(key);
          cleared++;
        }
      }
    } catch {
      /* localStorage 사용 불가 (private browsing) — 무시 */
    }
    return cleared;
  };

  /**
   * 온보딩 다시 보기:
   *  1. bp.onboarding.* 삭제
   *  2. 링네임 = null (RingNameOnboarding 모달의 트리거 조건)
   *  3. / 로 이동 + refresh
   *  → 즉시 RingNameOnboarding 모달이 layout에서 뜸
   */
  const handleReplayOnboarding = async () => {
    if (!userId) return;
    setLoading("replay:onboarding");
    setOverlay(true);
    setMessage("");
    try {
      const cleared = clearLocalStoragePrefixes(["bp.onboarding."]);
      await callSeed("set-ring-name", { userId, ringName: null });
      setMessage(`온보딩 초기화 (${cleared}) → 홈 이동`);
      navigateToTargetEvent();
      router.refresh();
      await new Promise((r) => setTimeout(r, 400));
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "실패");
    } finally {
      setLoading(null);
      setOverlay(false);
    }
  };

  /**
   * 스트릭 신기록 토스트 보기:
   *  1. bp.streakPR.* 삭제 (lock)
   *  2. bp.streakBest.v1:{uid} = "0" 쓰기 (baseline — null 이면
   *     silent first-sync 로 빠짐; 0으로 세팅해야 다음 로드에서
   *     server > stored 감지됨)
   *  3. server streak = 3/3 (set-streak)
   *  4. / 로 이동 + refresh
   *  → StreakPrToast 가 stored=0 vs server=3 감지 → 즉시 발화
   */
  const handleReplayStreakToast = async () => {
    if (!userId) return;
    setLoading("replay:streak");
    setOverlay(true);
    setMessage("");
    try {
      // Wipe lock; but set baseline explicitly to 0 (not null)
      const cleared = clearLocalStoragePrefixes(["bp.streakPR.", "bp.streakBest."]);
      try {
        window.localStorage.setItem(`bp.streakBest.v1:${userId}`, "0");
      } catch {
        /* ignore */
      }
      await callSeed("set-streak", { userId, current: 3, best: 3 });
      setMessage(`스트릭 초기화 (${cleared}) → 홈 이동`);
      navigateToTargetEvent();
      router.refresh();
      await new Promise((r) => setTimeout(r, 400));
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "실패");
    } finally {
      setLoading(null);
      setOverlay(false);
    }
  };

  /**
   * 전체 예측 토스트 보기:
   *  1. allPredictedToast:v1:{uid}:{eid} lock 삭제
   *  2. 링네임 = DevTester (prerequisite)
   *  3. 이벤트 = upcoming (fights 가 pickable 상태)
   *  4. clear-my-predictions (막 픽 시작 전 상태)
   *  5. 홈으로 이동 + refresh
   *  → Sean 이 픽을 하나씩 저장하다가 전체 저장 시 AllPredictedToast
   *    가 transition-detected → 발화.
   */
  const handleReplayAllPredictedToast = async () => {
    if (!userId || !state.latest_event_id) {
      setMessage("유저 + 이벤트 필요");
      return;
    }
    setLoading("replay:allPredicted");
    setOverlay(true);
    setMessage("");
    try {
      try {
        window.localStorage.removeItem(
          `allPredictedToast:v1:${userId}:${state.latest_event_id}`,
        );
      } catch {
        /* ignore */
      }
      await callSeedWithEvent("set-ring-name", { userId, ringName: "DevTester" });
      await callSeedWithEvent("set-event-status", { status: "upcoming" });
      await callSeedWithEvent("clear-my-predictions", { userId });
      setMessage("픽 저장 완료 시 토스트 발화 → 홈 이동");
      navigateToTargetEvent();
      router.refresh();
      await new Promise((r) => setTimeout(r, 400));
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "실패");
    } finally {
      setLoading(null);
      setOverlay(false);
    }
  };

  // ── Content Flags (title_fight + main_card preview) ────────────────
  const handleContentFlagsPreview = () => run(
    "content-flags:preview",
    "set-content-flags-preview",
    {},
    {
      message: (d) => {
        const r = d as { title_fights?: number; main_card?: number };
        return `title=${r.title_fights ?? 0} · main=${r.main_card ?? 0}`;
      },
    },
  );

  const handleContentFlagsClear = () => run(
    "content-flags:clear",
    "clear-content-flags",
    {},
    {
      message: (d) => `${(d as { fights?: number }).fights ?? 0}개 경기 초기화`,
    },
  );

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="fixed bottom-20 right-4 z-[9999] flex h-10 w-10 items-center justify-center rounded-full border border-[var(--bp-line)] bg-[var(--bp-card)] text-[var(--bp-muted)] shadow-lg transition hover:border-[rgba(255,255,255,0.15)] hover:text-[var(--bp-ink)] md:bottom-5"
        aria-label="Dev Panel"
        suppressHydrationWarning
      >
        <Settings className="h-5 w-5" strokeWidth={1.5} />
      </button>
    );
  }

  return (
    <>
      {/* Full-screen loading overlay */}
      {overlay && (
        <div className="fixed inset-0 z-[9998] flex items-center justify-center bg-black/70 backdrop-blur-sm">
          <div className="flex flex-col items-center gap-3">
            <Loader2 className="h-8 w-8 animate-spin text-[var(--bp-accent)]" strokeWidth={2} />
            <p className="text-sm font-semibold text-white">업데이트 중…</p>
          </div>
        </div>
      )}

      <div
        className="fixed bottom-20 right-4 z-[9999] flex w-72 flex-col overflow-hidden rounded-[14px] border border-[var(--bp-line)] bg-[var(--bp-card)] shadow-xl md:bottom-5"
        style={{
          // Panel anchors to the same position as the (closed) dev
          // button — bottom-20 on mobile / bottom-5 on desktop — and
          // grows UPWARD with a hard cap that leaves room for the
          // main header. When the gear button is closed and Sean
          // clicks it, the panel replaces it in place rather than
          // floating elsewhere on screen.
          //
          // maxHeight: clamp to viewport minus main-header (~80px)
          // minus the bottom offset Sean sees so it never spills
          // off-screen even on short mobile viewports.
          maxHeight: "min(calc(100dvh - 180px), 720px)",
        }}
      >
        {/* Header — shrink-0 so the scrollable body takes remaining space */}
        <div className="flex shrink-0 items-center justify-between border-b border-[var(--bp-line)] bg-[var(--bp-card-inset)] px-3 py-2">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold uppercase tracking-[0.14em] text-[var(--bp-ink)]">Dev</span>
            {state.latest_event_name ? (
              <span className="truncate text-[10px] text-[var(--bp-muted)]">
                · {state.latest_event_name}
              </span>
            ) : null}
          </div>
          <button
            onClick={() => setOpen(false)}
            className="flex cursor-pointer items-center justify-center rounded p-1 text-[var(--bp-muted)] hover:text-[var(--bp-ink)]"
            aria-label="Close"
          >
            <X className="h-3.5 w-3.5" strokeWidth={2} />
          </button>
        </div>

        <div className="flex min-h-0 flex-1 flex-col divide-y divide-[var(--bp-line)] overflow-y-auto">
          {/* 타겟 이벤트 — sandbox mode: pick event, auto-snapshot, mutate, reset */}
          <Section label="타겟 이벤트 (샌드박스)">
            <select
              value={selectedEventId ?? ""}
              onChange={(e) => handleEventPick(e.target.value || null)}
              disabled={loading !== null || snapshotLoading || events.length === 0}
              className="w-full cursor-pointer rounded border border-[var(--bp-line)] bg-[#0a0a0a] px-2 py-1 text-[11px] text-[var(--bp-ink)] disabled:cursor-not-allowed disabled:opacity-40"
            >
              <option value="">이벤트 선택 —</option>
              {events.map((ev) => (
                <option key={ev.id} value={ev.id}>
                  {ev.name} · {ev.date.slice(5)} · {ev.status}
                </option>
              ))}
            </select>
            {snapshotLoading ? (
              <p className="mt-1 text-[10px] text-[var(--bp-muted)]">
                스냅샷 캡처 중...
              </p>
            ) : snapshot ? (
              <>
                <p className="mt-1 text-[10px] text-[var(--bp-accent)]">
                  스냅샷 활성 · {snapshot.fights.length}개 경기 · 원래: {snapshot.event.status}
                </p>
                <div className="mt-1.5 grid grid-cols-2 gap-1.5">
                  <button
                    type="button"
                    onClick={handleResetToSnapshot}
                    disabled={loading !== null}
                    className="flex cursor-pointer items-center justify-center gap-1 rounded border border-[var(--bp-accent)]/40 bg-[rgba(229,169,68,0.08)] px-2 py-1 text-[11px] font-semibold text-[var(--bp-accent)] transition hover:bg-[rgba(229,169,68,0.15)] disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    <Undo2 className="h-3 w-3" strokeWidth={2.5} />
                    원래 상태로 리셋
                  </button>
                  <button
                    type="button"
                    onClick={handleResnapshot}
                    disabled={loading !== null || snapshotLoading}
                    className="cursor-pointer rounded border border-[var(--bp-line)] px-2 py-1 text-[11px] font-medium text-[var(--bp-muted)] transition hover:border-[var(--bp-line-strong)] hover:text-[var(--bp-ink)] disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    스냅샷 재촬영
                  </button>
                </div>
              </>
            ) : selectedEventId ? (
              <p className="mt-1 text-[10px] text-[var(--bp-danger)]">
                스냅샷 없음 (캡처 실패)
              </p>
            ) : (
              <p className="mt-1 text-[10px] text-[var(--bp-muted)]">
                이벤트 선택 시 현재 상태 자동 캡처 → 모든 조작 후 리셋 가능
              </p>
            )}
          </Section>

          {/* 프리셋 — 시나리오 1-click setup */}
          <Section label="프리셋">
            <div className="grid grid-cols-2 gap-1.5">
              <PresetButton
                label="첫 방문"
                onClick={() => applyPreset("firstVisit")}
                disabled={loading !== null || !userId}
              />
              <PresetButton
                label="예측 완료"
                onClick={() => applyPreset("picksComplete")}
                disabled={loading !== null || !userId}
              />
              <PresetButton
                label="라이브 중"
                onClick={() => applyPreset("live")}
                disabled={loading !== null || !userId}
              />
              <PresetButton
                label="결과 확인"
                onClick={() => applyPreset("completed")}
                disabled={loading !== null || !userId}
              />
            </div>
          </Section>

          {/* 이벤트 상태 */}
          <Section label="이벤트 상태">
            <SwitchRow
              label="업커밍"
              title="Pre-lock · 픽 가능 · 타이머 카운트다운"
              checked={currentEventStatus === "upcoming"}
              disabled={loading !== null}
              onChange={(on) => on && handleEventStatus("upcoming")}
            />
            <SwitchRow
              label="라이브"
              title="Locked · 경기 시작됨 · 서브헤더 streak 표시"
              checked={currentEventStatus === "live"}
              disabled={loading !== null}
              onChange={(on) => on && handleEventStatus("live")}
            />
            <SwitchRow
              label="완료됨"
              title="결과 입력 · 첫 flip에 랜덤 승자, 이후 안정"
              checked={currentEventStatus === "completed"}
              disabled={loading !== null}
              onChange={(on) => on && handleEventStatus("completed")}
            />
          </Section>

          {/* 모의 타이머 — Sean-selectable countdown duration */}
          <Section label="모의 타이머 (이벤트 upcoming으로)">
            <div className="grid grid-cols-3 gap-1.5">
              {TIMER_PRESETS.map((preset) => (
                <CompactActionButton
                  key={preset.key}
                  label={preset.label}
                  title={`fight.start_time = now + ${preset.minutes}분 · 이벤트 → upcoming · 홈 이동`}
                  onClick={() => handleSetTimer(preset.minutes, preset.label)}
                  disabled={loading !== null}
                />
              ))}
            </div>
          </Section>

          {/* 내 계정 */}
          <Section label="내 계정">
            <SwitchRow
              label="링네임"
              title={state.ring_name ?? "켜면 'DevTester'로 설정"}
              checked={state.has_ring_name}
              disabled={loading !== null || !userId}
              onChange={handleRingNameToggle}
            />
            <SwitchRow
              label="픽"
              title={
                state.predictable_on_latest > 0
                  ? `최신 이벤트 ${state.predicted_on_latest}/${state.predictable_on_latest}`
                  : "completed 경기에서 과거 픽 시드"
              }
              checked={state.has_predictions}
              disabled={loading !== null || !userId}
              onChange={handlePredictionsToggle}
            />
            <div className="flex items-center gap-1.5 pt-1">
              <span className="text-[11px] font-medium text-[var(--bp-ink)]">연승</span>
              <span className="text-[10px] text-[var(--bp-muted)]">
                {state.current_streak}/{state.best_streak}
              </span>
              <input
                type="number"
                min="0"
                inputMode="numeric"
                value={streakDraft.current}
                onChange={(e) =>
                  setStreakDraft((prev) => ({ ...prev, current: e.target.value }))
                }
                disabled={loading !== null || !userId}
                className="ml-auto w-11 rounded border border-[var(--bp-line)] bg-[#0a0a0a] px-1 py-0.5 text-[11px] text-[var(--bp-ink)] disabled:opacity-40"
                aria-label="현재 연승"
              />
              <span className="text-[10px] text-[var(--bp-muted)]">/</span>
              <input
                type="number"
                min="0"
                inputMode="numeric"
                value={streakDraft.best}
                onChange={(e) =>
                  setStreakDraft((prev) => ({ ...prev, best: e.target.value }))
                }
                disabled={loading !== null || !userId}
                className="w-11 rounded border border-[var(--bp-line)] bg-[#0a0a0a] px-1 py-0.5 text-[11px] text-[var(--bp-ink)] disabled:opacity-40"
                aria-label="최고 연승"
              />
              <button
                type="button"
                onClick={handleSetStreak}
                disabled={loading !== null || !userId || !streakDraftValid}
                className="cursor-pointer rounded border border-[var(--bp-line)] px-1.5 py-0.5 text-[10px] font-medium text-[var(--bp-ink)] transition hover:border-[var(--bp-accent)] disabled:cursor-not-allowed disabled:opacity-40"
              >
                설정
              </button>
            </div>
            {!streakDraftValid && (streakDraft.current !== "" || streakDraft.best !== "") ? (
              <p className="mt-0.5 text-[10px] text-[var(--bp-danger)]">
                현재 ≤ 최고여야 함
              </p>
            ) : null}
          </Section>

          {/* 타이틀전 + 메인카드 칩 (admin 플래그) */}
          <Section label="타이틀전 / 메인카드 칩">
            <div className="grid grid-cols-2 gap-1.5">
              <CompactActionButton
                label="칩 표시"
                title="헤드라인 경기에 TITLE FIGHT 크라운 칩 + 상위 절반 경기에 MAIN CARD 칩 표시 (is_title_fight · is_main_card 플래그 on)"
                onClick={handleContentFlagsPreview}
                disabled={loading !== null || !state.latest_event_id}
              />
              <CompactActionButton
                label="칩 숨김"
                title="모든 경기의 title_fight + main_card 플래그 해제"
                onClick={handleContentFlagsClear}
                disabled={loading !== null || !state.latest_event_id}
              />
            </div>
          </Section>

          {/* 데이터 + 유틸 */}
          <Section label="데이터">
            <div className="grid grid-cols-3 gap-1.5">
              <CompactActionButton
                label="시드"
                title="10 users · 3 events · predictions"
                onClick={handleSeed}
                disabled={loading !== null}
              />
              <CompactActionButton
                label="삭제"
                title="모든 users · events · predictions 삭제"
                onClick={handleEmpty}
                disabled={loading !== null}
                tone="danger"
              />
              <CompactActionButton
                label="404"
                title="존재하지 않는 URL로 이동"
                onClick={handleShow404}
                disabled={loading !== null}
              />
            </div>
          </Section>

          {/* 다시 보기 — 클릭 → 해당 UI가 뜨는 상태로 셋업 + 이동 */}
          <Section label="다시 보기">
            <div className="grid grid-cols-1 gap-1.5">
              <CompactActionButton
                label="온보딩 모달 다시 보기"
                title="bp.onboarding.* 삭제 + 링네임 초기화 + 홈 이동 → RingNameOnboarding 즉시 표시"
                onClick={handleReplayOnboarding}
                disabled={loading !== null || !userId}
              />
              <CompactActionButton
                label="스트릭 신기록 토스트 다시 보기"
                title="bp.streakPR.* 삭제 + baseline=0 + server streak=3/3 + 홈 이동 → StreakPrToast 즉시 발화"
                onClick={handleReplayStreakToast}
                disabled={loading !== null || !userId}
              />
              <CompactActionButton
                label="전체 예측 토스트 다시 보기"
                title="lock 삭제 + 픽 초기화 + 이벤트 업커밍 + 홈 이동 → 픽 저장 완료 시 발화"
                onClick={handleReplayAllPredictedToast}
                disabled={loading !== null || !userId || !state.latest_event_id}
              />
            </div>
          </Section>
        </div>

        {/* Message */}
        {message ? (
          <div className="shrink-0 border-t border-[var(--bp-line)] px-3 py-2">
            <p className="truncate text-[11px] text-[var(--bp-muted)]">{message}</p>
          </div>
        ) : null}
      </div>
    </>
  );
}

// ── primitives ────────────────────────────────────────────────────────

function Section({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1.5 px-3 py-2">
      <p className="text-[9px] font-bold uppercase tracking-[0.14em] text-[var(--bp-muted)]">
        {label}
      </p>
      {children}
    </div>
  );
}

type SwitchRowProps = {
  label: string;
  /**
   * Hover tooltip. DevPanel v3 removed the always-visible description
   * text to keep the panel compact; `title` provides the same context
   * on hover without the vertical cost. Desktop-only pattern —
   * acceptable because DevPanel is dev-tool.
   */
  title?: string;
  checked: boolean;
  disabled?: boolean;
  onChange: (checked: boolean) => void;
};

function SwitchRow({ label, title, checked, disabled, onChange }: SwitchRowProps) {
  return (
    <label className="flex items-center justify-between gap-3 py-1" title={title}>
      <div className="min-w-0 flex-1">
        <p className="text-xs font-medium text-[var(--bp-ink)]">{label}</p>
      </div>
      <Switch.Root
        checked={checked}
        disabled={disabled}
        onCheckedChange={onChange}
        className="relative inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full border border-[var(--bp-line)] bg-[#0a0a0a] transition data-[checked]:border-[var(--bp-accent)] data-[checked]:bg-[var(--bp-accent)] data-[disabled]:cursor-not-allowed data-[disabled]:opacity-40"
      >
        <Switch.Thumb className="ml-0.5 inline-block h-3.5 w-3.5 rounded-full bg-[var(--bp-muted)] transition-transform data-[checked]:translate-x-4 data-[checked]:bg-[#0a0a0a]" />
      </Switch.Root>
    </label>
  );
}

/**
 * Gold-accented preset button for 1-click scenario setup. Used in the
 * top "프리셋" section of DevPanel v3.
 */
function PresetButton({
  label,
  onClick,
  disabled,
}: {
  label: string;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="cursor-pointer rounded-[6px] border border-[var(--bp-line)] bg-[#0a0a0a] px-2 py-1.5 text-[11px] font-semibold text-[var(--bp-ink)] transition hover:border-[var(--bp-accent)] hover:bg-[var(--bp-card-inset)] hover:text-[var(--bp-accent)] disabled:cursor-not-allowed disabled:opacity-40"
    >
      {label}
    </button>
  );
}

/**
 * Compact action button used in grid layouts (콘텐츠 플래그, 데이터,
 * 토스트 락 리셋). Replaces the v2 `ActionRow` which was a wide
 * row-layout with label + description + chevron. v3 uses grid cells
 * with `title` tooltips for context.
 */
function CompactActionButton({
  label,
  title,
  onClick,
  disabled,
  tone = "default",
}: {
  label: string;
  title?: string;
  onClick: () => void;
  disabled?: boolean;
  tone?: "default" | "danger";
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={title}
      className={`cursor-pointer rounded-[6px] border px-2 py-1.5 text-[11px] font-medium transition disabled:cursor-not-allowed disabled:opacity-40 ${
        tone === "danger"
          ? "border-[rgba(248,113,113,0.2)] text-[var(--bp-danger)] hover:border-[var(--bp-danger)] hover:bg-[rgba(248,113,113,0.08)]"
          : "border-[var(--bp-line)] text-[var(--bp-ink)] hover:border-[var(--bp-accent)] hover:bg-[var(--bp-card-inset)]"
      }`}
    >
      {label}
    </button>
  );
}
