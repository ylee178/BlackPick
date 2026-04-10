# BlackPick — Current State (2026-04-10, OAuth Launch + Test Foundation)

## Branch
`feature/i18n-migration`

## Latest Commits (today)
- `8bdadae` test: Phase 1 — Silicon Valley grade test foundation
- `e8b0897` fix(auth): stop double-prefixing locale on OAuth callback redirect
- `dc96f5b` feat: BC integration, OAuth PKCE fix, admin lockdown, i18n expansion

## Production
- **URL**: https://blackpick.io
- **Latest deploy**: `black-pick-huwc1wulm-uxerseans-projects.vercel.app` (today)
- **Health**: 10/10 smoke checks pass

---

## Completed (this session)

### Auth — Google OAuth live on prod
- ~~PKCE bypass~~ → SocialAuthButtons routes through `/api/auth/callback`
- ~~Locale double-prefix `/en/en`~~ → raw path through callback, middleware handles locale
- ~~Callback error swallowing~~ → exchange errors redirect to `/login?error=oauth_exchange_failed`
- ~~Host-header trust in production~~ → `NEXT_PUBLIC_SITE_URL` canonical origin enforced
- ~~OAuth credentials wiring~~ → DEV/PROD isolated client_id/secret in respective Supabase projects
- ~~Ring-name INSERT failure on PROD~~ → `public.users.email` column dropped (backed up to `/tmp/prod-users-email-backup.json`)

### Codex WIP shipped
- ~~30+ uncommitted files (1361/1024 LoC)~~ → analyzed, deemed ship-ready, single bundled commit + deployed
- BC official data integration (bc-official, bc-ticket, fight-alignment) live
- Discussion threading utility shared between Fighter and Fight comments
- Admin lockdown via `admin_users` table (env-based admin email check removed)
- Dev seed route overhaul
- Loading UI primitives (LoadingButtonContent, PendingSubmitButton)
- 7-locale i18n expansion (+36 lines per file)

### Supabase config
- ~~PROD `site_url` was localhost~~ → `https://blackpick.io`
- ~~PROD `uri_allow_list` empty~~ → `https://blackpick.io/**`
- DEV/PROD Google provider both ON with isolated credentials, cross-checked
- Migration `202604090003_public_profile_privacy.sql` applied to PROD

### Phase 1 test foundation
- ~~OAuth helper extracted~~ → `src/lib/auth/oauth-redirect.ts` + 28 unit cases
- ~~SocialAuthButtons contract tests~~ → 8 component cases (mocked Supabase client)
- ~~Schema drift script~~ → `npm run check:schema-drift` (DEV ↔ PROD info_schema diff)
- ~~i18n key integrity~~ → `npm run check:i18n` (caught 4 real missing keys on first run, all fixed)
- ~~Prod smoke test~~ → `npm run smoke:prod` (10 live checks)
- ~~vitest config split (unit + component projects)~~
- ~~`npm run deploy` gate~~ → predeploy → vercel --prod → smoke
- ~~GitHub Actions workflow~~ → `.github/workflows/test.yml`
- ~~Regression simulation~~ → tests verified to fail when bugs reintroduced

### i18n keys backfilled
- ~~`ja.json` missing `event.officialPrediction`~~
- ~~`pt-BR.json` missing `event.officialPrediction`, `prediction.correct`, `prediction.wrong`~~

---

## Remaining Tasks

### Launch blockers
| # | Task | Status |
|---|------|--------|
| 1 | Facebook OAuth setup (Meta console + Supabase wire-in) | **Pending** — Google pattern verified, same template applies |
| 2 | Manual e2e test of Google OAuth from multiple locales | **Partial** — Sean confirmed login works, ring-name save works |

### Launch nice-to-have
| # | Task | Notes |
|---|------|-------|
| 3 | Supabase migration history sync | PROD schema is correct but migration tracking table doesn't have 202604090001/2/3 records. Cosmetic — `IF NOT EXISTS` guards make re-running safe. |
| 4 | OG image | `public/og/default.png` (1200x630) still missing per session 2 notes |
| 5 | Sentry production DSN | Package installed, config ready, DSN env var needs value |

### Phase 2 test infrastructure (next session)
- BlackPick_Test new Supabase project (~5 min create)
- Real DB integration test for ring-name route (covers Bug 3 class directly)
- Test data factories with `@faker-js/faker`
- `supabase gen types` automation + diff against committed `database.ts`
- Direct middleware/proxy.ts unit tests
- lefthook pre-commit hook
- Coverage measurement (no thresholds yet)

### Phase 3 test infrastructure (later)
- Route handler unit tests for auth/admin critical paths
- Playwright OAuth stub flow (no real Google in CI)
- Coverage thresholds for `src/lib/auth/**`
- BC scraper isolation test (mock fetch)

### Lower-priority backlog
- ~~i18n drift~~ done
- Sentry DSN activation
- OG default image design
- 31 fighter pixel art outpaint touchups (per session 2)
- Mobile/browser compatibility manual test
- RLS dependency reduction (architecture work, post-launch)

---

## Recommended Next Steps

```
1. Facebook OAuth (Meta console + Supabase wire-in via existing automation)
2. Manual e2e: Google login from /ko, /ja, /es, /zh-CN, /mn pages
3. Phase 2 test infra (BlackPick_Test + ring-name integration test)
4. Sentry DSN + OG image
5. Migration history sync (cosmetic cleanup)
```

---

## Schema (PROD)

| Table | Columns | Notes |
|---|---|---|
| `users` | 11 (id, ring_name, wins, losses, current_streak, best_streak, hall_of_fame_count, score, created_at, p4p_score, preferred_language) | email column dropped today |
| `admin_users` | 2 (user_id, created_at) | seeded with Sean (ylee178@gmail.com) |
| `events` | 9 | sync with DEV |
| `fights` | 12 | sync with DEV (incl. result_processed_at) |
| `predictions` | 12 | sync with DEV |
| `fighters` | 10 | sync with DEV |
| `fighter_comments` | 6 | sync with DEV |

Drift: none (verified by `npm run check:schema-drift`)

## OAuth Clients

| Environment | Google Client ID prefix | Supabase project | Redirect URI |
|---|---|---|---|
| DEV | `312732011458-6dd753flhh...` | `lqyzivuxznybmlnlexmq` | `https://lqyzivuxznybmlnlexmq.supabase.co/auth/v1/callback` |
| PROD | `312732011458-ju6m9oe4s2b...` | `nxjwthpydynoecrvggih` | `https://nxjwthpydynoecrvggih.supabase.co/auth/v1/callback` |

OAuth Consent Screen: published, `email`/`profile`/`openid` scopes, blackpick.io domain verified via Google Search Console.

## Test Surface (Phase 1)

| Layer | Files | Cases | Runtime |
|---|---|---|---|
| Unit (vitest) | `src/lib/**/*.test.ts` | 28 + 9 existing | <300ms |
| Component (vitest jsdom) | `src/components/**/*.test.tsx` | 8 | ~600ms |
| Schema drift script | `scripts/check-schema-drift.mjs` | 7 tables | ~2s |
| i18n integrity script | `scripts/check-i18n-keys.mjs` | 7 locales | <1s |
| Prod smoke script | `scripts/smoke-prod.mjs` | 10 checks | ~5s |

`npm run test:fast` = 5 files / 45 cases / 1.22s
`npm run predeploy` = i18n + schema-drift + tests + build
`npm run deploy` = predeploy + `vercel --prod` + smoke

---

## Dev Tools Available

DevPanel (dev only, 우하단 톱니):
- **Full Data** — 시드 유저 10명, 이벤트 3개, 예측, 댓글, 랭킹 생성
- **Complete** — upcoming/live 경기 → completed (랜덤 승자)
- **Empty** — 시드 데이터 전부 삭제

## Fighter Images
- 84개 픽셀아트 in `public/fighters/pixel/` (오늘 6개 추가됨)
- 배경: #2A2A2A
- 머리 잘린 이미지 31개 — 리스트는 `Wiki_Sean/BlackPick/2026-04-08-session.md`
