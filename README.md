# Black Pick

Black Pick is a multilingual fight prediction product built on Next.js 16, React 19, `next-intl`, and Supabase.

## Local Development

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

Required environment variables live in `.env` and `.env.example`. The important ones for local work are:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `GEMINI_API_KEY` if you use fighter avatar generation
- `REMOVE_BG_API_KEY` if you use fighter avatar background removal

## Verification Commands

```bash
npx tsc --noEmit
npx eslint .
npm run test:unit
npm run build
```

E2E coverage is available through Playwright:

```bash
npm run test:e2e
```

## Recent Hardening Checklist

The current codebase expects these migrations to be applied in order:

- `supabase/migrations/202604090001_admin_lockdown.sql`
- `supabase/migrations/202604090002_profile_integrity.sql`

Those migrations add:

- `admin_users` for explicit admin allowlisting
- `fights.result_processed_at` for idempotent result processing
- expanded translation locale support
- `fighter_comment_translations`

## Admin Bootstrap

Grant admin access by inserting the authenticated user id into `public.admin_users`.

Admin checks are enforced both on `/admin/*` pages and on mutation APIs such as fighter image management and result processing.

Repeatable rollout helpers:

```bash
npm run ops:remote:verify
node scripts/ops/bootstrap-admin.mjs you@example.com
bash scripts/ops/apply-remote-migrations.sh
```

## Operational Notes

- Result processing now runs through server-only admin APIs. Do not reintroduce browser-side RPC calls for `process_fight_result`.
- Fighter detail uses original reference photos when available. Profile-style pixel avatars are treated as derivatives.
- Pixel avatar resolution supports both base files like `<fighter-id>.png` and generated variants like `<fighter-id>_v3.png`.
- The current avatar-generation workflow is: face crop -> Gemini generate with a flat color background -> remove.bg post-process -> save transparent PNG.
- Account deletion is now a real delete flow, not a fake `deleted_at` soft delete.
- User email addresses stay in Supabase Auth. Do not store them in `public.users`.

## Project Structure

- `src/app` app routes, route handlers, admin surfaces
- `src/components` UI and interactive product components
- `src/lib` shared product logic, auth helpers, avatar helpers, i18n helpers
- `supabase/migrations` schema and function migrations
- `e2e` Playwright coverage

## Next.js Note

This repo is on Next.js 16. Before changing routing or file conventions, check the relevant docs in `node_modules/next/dist/docs/`. The project already uses `proxy.ts` instead of deprecated `middleware.ts`.
