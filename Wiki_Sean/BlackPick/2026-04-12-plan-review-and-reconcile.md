# 2026-04-12 — Plan review + reconcile + new task manifest

## Context

End of 2026-04-12 session. After shipping the hooks migration + ring_name index + focus trap + Codex CLI cutover (PRs #9, #10, #11, #12), Sean laid out a fresh batch of ~25 items he wants for launch. I proposed a 6-phase plan, Sean took it to an external GPT for review, and brought back a detailed set of critiques and suggestions.

This entry documents the reconciliation — what GPT said, what Sean said, what I decided, and why.

## The three voices

- **Sean**: product owner, wants to ship BlackPick. "i18n is the last task", "8h MVP timer is an example because I'm doing it manually", "feedback widget goes where DevPanel is now in prod", "DevPanel switches not tabs".
- **GPT plan review**: external second opinion. Strong on structural concerns (phase ordering, premature automation, missing onboarding, ticket schema gaps). Over-indexed on some engagement-loop features (anomaly detection, clustering, hot-fight detection) that are premature at zero-user scale.
- **Me (Claude)**: implementation judge. Responsible for making the calls that hold up when the keyboard hits the code.

## GPT's review verdict

> "Structure is senior+ level. Direction is nearly perfect. Some things are premature, some are risky, some are ordered wrong. GO with phase reordering."

Specific critiques GPT raised and how I handled each:

### Accepted as-is

1. **Automation phase (cron, live transitions, email notifications) is too early** — moved from Phase 4 to Phase 7, post-launch. Building automated state-sync with zero users is premature; debugging it without traffic is a maintenance tax with no payoff.
2. **`feedback_tickets.source` enum missing `analytics_anomaly`** — added as a schema slot in Phase 2, even though the actual detection logic lands in Phase 7. Cheap to add now, expensive to migrate later.
3. **GitHub Actions cron `*/10 * * * *` is overkill** — switched to `*/30` for fight state sync. Even that's generous for a platform that covers a single cup event per week.
4. **Onboarding flow is missing from the plan** — added to Phase 1 with a scoped-small spec: ring-name prompt modal, empty-state hint cards, first-prediction hint. No wizards, no tooltip tours.
5. **Streak UX is absent** — added to Phase 1 with a scoped spec: profile surface, streak toast on new PR, share-CTA copy integration.
6. **Share CTA needs emotional trigger copy** — merged into `fix/share-cta-visibility` with state-driven dynamic copy: default label, "N/N locked in" when complete, "W-L this card" with result, "🔥 streak in a row" with streak.

### Accepted with scope adjustment

7. **DevPanel shadow state vs direct DB writes** — GPT wanted a full shadow state (test DB / test user only). I scoped that down to three guards that cover 95% of the risk at BlackPick's scale without the shadow-DB engineering investment:
   - Client UI gated on `NODE_ENV === 'development'` (already present).
   - Server API gated on `NODE_ENV === 'development'` (already present at `src/app/api/dev/seed/route.ts:1047`, verified).
   - New `X-Dev-Panel-Token` header with a secret pulled from `.env.local` — only Sean's machine, where the token lives, can hit the mutation endpoint. Hardens against a compromised browser extension or accidental public dev deploy.
8. **MVP timer — GPT said 8h is arbitrary** — Sean explicitly said 8h is a fallback because he's doing it manually. Reconciled by making the admin trigger the **primary** mechanism (button on `/admin/events/{id}`) with a lazy request-time fallback (`mvp_voting_opens_at = event.date + 8h` set on first read if null and 8h elapsed). Both work together: admin-first, fallback-second.
9. **i18n priority order** — GPT wanted EN + KO + pt-BR first, rest later. Sean wanted "i18n at the very end, done properly". Reconciled by splitting:
   - **Hardcoded Korean leaks in non-Korean views** = bug class, fixed in Phase 1 under `fix/hardcoded-korean-leaks`. This is a bug report, not i18n work.
   - **Comprehensive tone review of all 7 locales** = Phase 5, the last phase before launch. Honors Sean's "마지막에 제대로" while still getting hardcoded leaks out early.

### Rejected or deferred

10. **Anomaly auto-issue, feedback clustering, hot-fight detection** — GPT's three engagement-loop suggestions. All three are excellent ideas but pointless at zero-user scale. Can't tune a DAU-drop threshold when DAU is 0. Reserved the schema slots in Phase 2 (`source='analytics_anomaly'`, `cluster_key` column) so Phase 7 can add the logic without a migration. The actual implementations ship in Phase 7 after at least a week of real traffic.
11. **Shadow state DB for DevPanel** — rejected. At BlackPick's scale and single-admin operation, the risk from direct dev-DB writes is low enough that three layered guards (UI flag + server env + token header) are sufficient. A shadow DB would cost 2+ days of work for a marginal gain.

## Sean's mid-conversation additions

### DevPanel UI overhaul (switches, not tabs, gold-active, label left / switch right)

Captured in Phase 0 `dev-ui/panel-v2-switches`. Replaces the current tab UI with grouped switches. Sections: Event State / User State / Content State / Actions. The DevPanel overhaul is Phase 0 because every other phase depends on Sean being able to verify edge-case UI states locally.

### Feedback button replaces DevPanel position in prod

Captured in Phase 2. `FeedbackButton` and `DevPanel` both render in the same bottom-right floating slot, but mutually exclusive by `NODE_ENV`. In dev Sean sees the DevPanel; in prod users see the FeedbackButton. This was Sean's original framing: "dev panel 버튼 자리에 유저가 서포트 채널 버튼 보듯이 피드백 줄 수 있는 버튼."

### Ticket system integration with errors + future Claude autofix

Sean's framing: "피드백 + 센트리 에러 등등이 우리가 ux나 시스템 에러 티켓 관리 시스템으로 되게 (시스템 관리는 클로드코드가 자동으로 픽스하겠지만 그렇지 못한 어려운 타스크를 내가 관리할 수 있어야 해)". The `feedback_tickets` table is the single substrate. User feedback, Sentry errors, and eventually Claude autofix failures all land there. Admin triages via `/admin/tickets`. Future: Claude Code workflow reads GitHub issues labeled `claude-autofix-candidate` and attempts fixes on its own branch.

### Admin surface consolidation

Added mid-drafting: "fighter manage 페이지를 이벤트 관리 페이지랑 합쳐서 애드민 페이지로 만들어서 애드민 권한 있는 로그인으로 하면 어카운트 메뉴에서 엑세스 가능하게해줘". Current state (verified): `/admin/*` route group exists with events/fighters/results but uses gray-900/amber-400 literals (not the retro CSS tokens), not i18n'd, and NOT linked from the account dropdown. `/[locale]/(main)/fighters/manage` is the legacy surface and IS linked from the account dropdown. New task in Phase 2: unify into `/admin/*`, restyle with retro tokens, flip account dropdown link, delete the old route.

### Codex CLI blocked, local fallback research parked

Sean asked me to research local-model fallbacks since Codex CLI is currently blocked. Verified Sean's hardware (M1 16GB) cannot run 30B+ models, and BlackPick is a public GitHub repo so the privacy argument for local is moot. Honest recommendation: stick with Qwen Code cloud as fallback, skip local. Sean parked this entirely — we proceed with the plan and handle code-review gating ad hoc when Codex comes back. For docs-only changes (like this reconcile commit), self-review is fine.

## Final Phase order

```
Phase 0  DevPanel v2 (test harness)
Phase 1  UX bugs + hardcoded-KR cleanup + onboarding + streak UX
Phase 2  Tickets + Feedback widget + admin surface consolidation
Phase 3  Email infra (docs + templates)
Phase 4  Facebook OAuth + comment edit/delete + MVP timer (admin + fallback)
Phase 5  i18n comprehensive tone review (7 locales, last gate)
────── LAUNCH GATE ──────
Phase 6  Launch (deploy, smoke, soft announce)
Phase 7  Post-launch automation (crawler cron, live notif, anomaly detection, clustering, hot-fight)
```

This is what TASKS.md is now pinned to. See that file for the branch-level breakdown of each phase.

## Scale check — why this plan is right-sized

BlackPick today: single admin (Sean), zero live users, weekly cup event as primary content, public GitHub repo, running on Vercel + Supabase. At that scale:

- Over-engineering risk > under-engineering risk.
- Direct DB mutations from a dev UI are safer than elaborate shadow state because the only operator is the one building it.
- Automation has negative ROI without traffic to automate against.
- Admin UI doesn't need to be pretty, it needs to work.
- Feature scope should prioritize conversion (onboarding, share, streak) over retention automation (live notifs, anomaly alerts) because you need conversion first.

Post-launch (Phase 7+), once real users are in, every one of GPT's engagement suggestions becomes worth implementing. Just not before.

## Review gate status

Codex CLI is currently blocked. The plan is to keep it as the primary reviewer and pause code branches until it comes back, rather than silently downgrading review quality. Docs-only changes (TASKS.md, this wiki entry, design docs) are explicitly exempt from the codex gate per the updated process notes in TASKS.md.
