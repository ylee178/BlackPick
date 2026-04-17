# src/scripts/archive

Abandoned / superseded script drafts kept for historical reference. Not wired into any runtime path and not exercised by tests.

| File | Archived | Reason |
|---|---|---|
| `crawler-v2.ts` | 2026-04-17 | Early BC crawler rewrite that was abandoned before `src/lib/bc-official.ts` extraction. `src/scripts/crawler.ts` is canonical — it consumes the shared `bc-official` helpers (`fetchBcEventList`, `fetchBcOfficialEventCard`) and shares a foundation with `sync-bc-event-card.ts`. `crawler-v2.ts` reimplements HTTP/parse logic inline and predates the BC integration commit `dc96f5b`. |
