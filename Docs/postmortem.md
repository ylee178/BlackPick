# Black Pick — Postmortem

**Date:** 2026-04-03 ~ 04-04 (1 session)
**Repo:** github.com/ylee178/BlackPick

---

## What We Built

Black Pick — a fight prediction platform for Black Combat (Korean MMA). Users predict fight outcomes, build win-loss records, and compete on a global leaderboard.

### Deliverables
- Full Next.js 15 app (TypeScript, Tailwind, Supabase)
- 46 source files, ~5,900 lines of code
- 14 commits, deployed to GitHub
- 57 events, 383 fights, 335 fighters seeded from crawled data
- 363 fights with winner data
- 4 languages (EN, KO, JA, PT-BR)

---

## Architecture

```
Next.js 15 (App Router) + Tailwind CSS
├── Supabase (PostgreSQL + Auth + RLS)
├── Server Components (data fetching)
├── Client Components (forms, interactivity)
└── API Routes (predictions, voting, ranking)
```

### Key Technical Decisions
- **Supabase RLS** for prediction integrity (DB-level lock, not just frontend)
- **Cookie-based i18n** instead of [locale] routing (simpler, no route restructuring)
- **Server components** for data fetching, **client components** only for interactivity
- **Async server FightCard** with translated labels passed as props to child panels

---

## GPT-5.4 + Claude Collaboration

### The Model
1. GPT-5.4 generates code
2. Claude reviews, catches bugs, fixes issues
3. Ship

### What GPT-5.4 Did Well
- **Full app scaffolding** — 20 files in one shot (types, lib, admin, API, pages, components)
- **Translation files** — complete ja.json, pt-BR.json with natural translations
- **Ranking page design** — podium cards with gold/silver/bronze styling
- **Code review** — identified real security concerns (iframe sandboxing, aggregation in SQL)
- **Product strategy** — honest assessment that 371 fights isn't enough for AI predictions
- **Copywriting** — "찍는 게 아니라, 읽는 거다" (격잘알 branding)

### What GPT-5.4 Got Wrong (Repeatedly)
1. **Trailing explanation text in code files** — "Add it to your root layout like this:" left as actual code, causing syntax errors. Happened 3 times.
2. **Wrong Supabase join syntax** — Used `fighter_a:fighter_a_id(...)` instead of `fighter_a:fighters!fighter_a_id(...)`. The fighters table has multiple FKs to fights, requiring explicit hints. GPT missed this every time.
3. **Server/client boundary confusion** — Imported server-only modules (`next/headers`) into `"use client"` components. EventStatusBadge (async server) was imported into StickyEventHeader (client).
4. **Wrong function names** — Generated `createSupabaseServerClient` but other files imported `createSupabaseServer`.
5. **Missing translation keys** — Generated new UI text with `t("new.key")` but didn't add keys to all 4 locale files.
6. **Phantom DB columns** — Referenced `order_index`, `is_test`, `completed_at` that don't exist in the schema.
7. **False positive security findings** — Flagged RLS and unique constraints as "critical" issues, but they were already in the DB schema. GPT didn't read the schema file.

### What Claude Caught & Fixed
- All 3 instances of trailing text in code
- Supabase join hints (every time)
- Server/client boundary violations
- Function name mismatches across files
- Missing translation keys (ran script to diff EN vs JA/PT-BR)
- Hydration mismatch on countdown timer
- Auth FK constraint for test users (users.id → auth.users)

### Lesson: GPT-5.4 Prompt Rules Needed
For future GPT-5.4 prompts, always include:
```
- Output ONLY code. No explanations, notes, or text after the closing bracket.
- fighters table has multiple FKs to fights. Always use: fighters!fighter_a_id, fighters!fighter_b_id
- Server function is createSupabaseServer() not createSupabaseServerClient()
- "use client" components CANNOT import from @/lib/i18n-server or @/lib/supabase-server
- When adding t("new.key"), add the key to ALL 4 locale files: en, ko, ja, pt-BR
- Only reference columns that exist in the schema. Do not invent columns.
```

---

## Cost

### GPT-5.4 API
- Total tokens: ~60,000
- Estimated cost: **~$2-3** out of $20 budget
- 93% budget remaining

### Breakdown by task
| Task | Tokens | Quality |
|------|--------|---------|
| Full app scaffold (Part 1+2) | ~30,800 | Excellent — best ROI |
| Profile + Ranking + Auth | ~10,900 | Good |
| i18n + Language Picker | ~3,660 | Good |
| Code review + fixes | ~16,000 | Mixed — good findings but GPT didn't read schema |
| Ranking page redesign | ~4,000 | Good |
| Dev panel + seed API | ~11,000 | Decent — needed cleanup |
| Translations (ja, pt-BR) | ~4,000 | Excellent |
| Product strategy (AI feature) | ~3,700 | Excellent — honest and actionable |
| Copywriting (격잘알) | ~1,600 | Excellent |

### Earlier gpt-4o-mini attempt
- ~14,000 tokens, ~$0.02
- Quality was poor — skeleton code, wrong patterns, no dark theme
- Reverted entirely and redone with gpt-5.4

---

## Timeline

| Time | What |
|------|------|
| Start | PRD review, API key setup |
| +15m | DB schema + RLS (Claude wrote, GPT skeleton was rewritten) |
| +25m | Crawler v1 built + tested (57 events, 383 fights, 335 fighters) |
| +30m | gpt-4o-mini attempt — quality too low, reverted |
| +45m | GPT-5.4 full app generation (20 files) |
| +1h | Build passing, all routes working |
| +1.5h | Supabase project created, DB seeded, app running on localhost |
| +2h | Ring names, flag emojis, i18n setup |
| +2.5h | GPT-5.4 review pass — fixed translations, WIN/LOSS badges |
| +3h | 격잘알 branding, countdown timer, ranking page |
| +3.5h | Sticky header, dev panel, security hardening |
| +4h | Dev panel v2 with seed presets, postmortem |

---

## What's Next

### Immediate
- [ ] Auth flow (signup/login with Supabase Auth)
- [ ] Test the full prediction → result → scoring flow end-to-end
- [ ] Vercel deployment
- [ ] Ticket/membership buttons on event banners

### Phase 2
- [ ] Real user testing with the Mongolia vs China event (Apr 11)
- [ ] Series/Event ranking tabs
- [ ] MVP voting after event completion
- [ ] Community seeding (DC mini gallery, YouTube)

### Phase 3
- [ ] Premium features (top predictor picks, form reports)
- [ ] Push notifications
- [ ] Fight discussion comments
- [ ] Black Combat partnership outreach

---

## Key Takeaway

**GPT-5.4 is a strong code generator but a sloppy finisher.** It produces 80-90% correct code fast, but consistently makes the same categories of mistakes (boundary violations, phantom columns, trailing text). The most effective workflow was:

1. Give GPT-5.4 a clear, constrained prompt with explicit rules
2. Have Claude review every output before applying
3. Never trust GPT's code review of things it hasn't read (it flagged existing DB constraints as missing)
4. Use GPT for bulk generation and translation, Claude for precision fixes

The gpt-4o-mini → gpt-5.4 upgrade was worth it. The quality jump was dramatic — from unusable skeleton code to production-ready components.
