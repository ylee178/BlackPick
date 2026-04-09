---
name: Scoring & P4P System Design
description: Approved scoring formula, P4P ranking design, and analytics plan for BlackPick
type: project
---

## Scoring System v2 (Confirmed 2026-04-05)

### Points (even numbers, clean doubles)
| Result | Points |
|--------|--------|
| Winner correct only | +4 |
| Winner + method correct | +8 |
| Winner + method + round correct | +16 |
| Winner wrong (any detail) | -2 (flat) |

### Streak Multiplier (wins only, all results stay even)
| Streak | Multiplier |
|--------|-----------|
| 0-2 | 1.0x |
| 3-4 | 1.5x |
| 5-6 | 2.0x |
| 7+ | 2.5x |

### Hall of Fame (min 50 voters on that fight)
| Tier | Condition | Bonus |
|------|-----------|-------|
| 🥉 Sharp Call | Winner correct, <20% picked same | +10 |
| 🥈 Sniper | Winner+method correct, <15% picked same | +20 |
| 🥇 Oracle | Winner+method+round correct, <10% picked same | +50 |

- Stacks with streak multiplier (applied separately after base×streak)
- Permanently recorded on profile (🥇×2 🥈×3 🥉×5)

### Perfect Card
- All fights in an event predicted correctly (winner)
- Bonus: +30 + special badge
- Recorded permanently on profile

### Rules
- Score floor: 0 (no negatives)
- Loss always = -2, no multiplier on losses
- Streak resets on loss, no extra penalty

### P4P Ranking
- Track per-weight-class stats in `user_weight_class_stats` table
- P4P score = sum(class_win_rate × sqrt(class_fights)) × breadth_bonus
- Breadth bonus = 1 + 0.1 × (qualified_classes - 1), cap 2.0
- Minimum: 2 weight classes with 3+ predictions each, 10 total predictions
- Cached in `users.p4p_score`, recomputed after each `process_fight_result`

### UX
- Show potential points before submit: "✓ +4~+16  ✗ -2"
- Streak multiplier shown if active

### GPT Review (2026-04-05)
- Risk/reward balanced but -5 may be steep for casuals (consider -3)
- Streak multiplier pacing good
- Score floor at 0 agreed
- Watch for: 0-floor gaming, P4P minimum qualification abuse
- P4P formula approved

### Implementation
- Migration: `003_scoring_v2.sql`
- Replace `calculate_prediction_score` + `process_fight_result`
- New table: `user_weight_class_stats`
- New column: `users.p4p_score`
- Backfill via `recalculate_all_scores()` function
- Analytics page design: TBD (discuss with GPT)

**Why:** Current system never penalizes wrong winner-only picks (0 points), making rankings stale. New system adds meaningful risk, streak excitement, and cross-class P4P depth.

**How to apply:** All scoring changes go through DB migration. UI changes in FightCardPicker (points preview), ranking page (P4P tab), my-record page (analytics).
