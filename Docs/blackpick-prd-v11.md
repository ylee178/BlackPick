# Black Pick — PRD + TRD v11

> **Black Pick은 예측 서비스가 아니라 격투기 팬들의 Fight Record 플랫폼이다.**

---

## 1. Product Definition

**Working Name:** Black Pick
**Platform:** Web (Responsive, Mobile-first)
**Scope:** Black Combat only (확장은 Phase 3+)

격투기 경기 결과를 예측하고, 자신의 Fight Record(전적)를 쌓으며, 글로벌 팬들과 경쟁하는 플랫폼.

**Core Loop:**

```
Pick → Fight → Result → Record → Ranking → Repeat
```

**Product Philosophy:**

- 점수 중심 ❌ → 전적/기록 중심 ⭕
- "나 850점이다" ❌ → "나 12승 3패다" ⭕

---

## 2. Target Users

- Black Combat 팬 (한국 + 글로벌)
- 디시 미니갤, 유튜브, 인스타에 흩어져 있는 팬들을 한 곳으로

---

## 3. Localization

**Supported Locales:** English (default), Korean, Japanese, Portuguese (Brazil)

**구현:** i18n JSON (`src/messages/{locale}.json`), 자동 감지 + 수동 선택 (LanguagePicker)
**적용:** UI 텍스트, 시스템 메시지
**번역:** Google Translate free API + MyMemory fallback (무료, 유저 댓글 번역)

---

## 4. Core Systems

### 4.1 Prediction System

**입력:**

| 항목 | 필수/선택 | 옵션 |
|------|-----------|------|
| Winner | 필수 | Fighter A or B |
| Method | 선택 | KO/TKO, Submission, Decision |
| Round | 선택 | 1, 2, 3, 4 (OT) |

**예측 규칙:**

- 로그인 유저만 가능
- 경기당 1회 예측
- 경기 시작 전까지 수정 가능 (에딧 버튼으로 전환)
- 경기 시작 시 Lock

**UX:**

- 선수 카드 클릭으로 승자 선택
- 선택 후 카드 내에서 method/round 선택
- **저장 후 read-only 모드**: method/round 칩이 비활성 상태로 보이고, 에딧 버튼(펜슬 아이콘)으로 수정 가능
- **My Pick 레이블**: 선택된 카드 우상단에 초록 체크마크 + "My Pick"
- **선수 사진 골드 후광**: 선택된 선수 아바타에 golden pulse 애니메이션
- **포인트 미리보기**: 저장 전에 "✓ +4~+16  ✗ -2" 표시

**공개 정책:**

- 경기 시작 전 → 비공개
- 경기 시작 후 → 전체 공개

---

### 4.2 Scoring System v2

**핵심 원칙:** 짝수 기반 깔끔한 점수. 맞추면 올라가고 틀리면 내려감. 디테일까지 맞출수록 더블업 보상.

**적중 점수:**

| 적중 범위 | 기본 점수 |
|-----------|-----------|
| Winner + Method + Round (R1~R3) 전부 적중 | **+16** |
| Winner + Method + Round (R4) 전부 적중 | **+20** |
| Winner + Method 적중 | **+8** |
| Winner만 적중 | **+4** |

**실패:**

| 결과 | 패널티 |
|------|--------|
| Winner 틀림 (선택 범위 무관) | **-2** |

**Score Floor:** 0 (마이너스 불가)

---

### 4.3 Streak Multiplier

**적용:** 승리 시에만 (패배에는 배율 없음)

| 연승 | 배율 | +4 base | +8 base | +16 base |
|------|------|---------|---------|----------|
| 0-2 | 1.0x | +4 | +8 | +16 |
| 3-4 | 1.5x | +6 | +12 | +24 |
| 5-6 | 2.0x | +8 | +16 | +32 |
| 7+ | 2.5x | +10 | +20 | +40 |

- 패배 시 연승 리셋, 추가 패널티 없음
- 모든 결과값이 짝수로 떨어짐

---

### 4.4 Win / Loss (Fight Record)

| 결과 | 기록 |
|------|------|
| Winner 적중 | **Win** |
| Winner 미적중 | **Loss** |
| 경기 취소 | 카운트 안 함 |
| 예측 안 한 경기 | 카운트 안 함 |

---

### 4.5 Hall of Fame (Tiered)

**발동 조건:** 해당 경기 예측 참여자 **50명 이상**

| 등급 | 조건 | 보너스 |
|------|------|--------|
| 🥉 Sharp Call | Winner 적중, <20% 선택 | **+10** |
| 🥈 Sniper | Winner + Method 적중, <15% 선택 | **+20** |
| 🥇 Oracle | Winner + Method + Round 적중, <10% 선택 | **+50** |

- 연승 배율과 **별도** (중첩 적용)
- `hall_of_fame_entries` 테이블에 영구 기록
- 프로필에 표시 (🥇×2 🥈×3 🥉×5)

---

### 4.6 Perfect Card

**조건:** 이벤트 내 모든 경기의 Winner를 적중
**보너스:** +30 + 특별 뱃지
**기록:** `perfect_card_entries` 테이블에 영구 기록

---

### 4.7 Streak System

**정의:** Winner 연속 적중 횟수

**규칙:**

- Winner 틀리면 리셋
- 경기 취소 시 streak 영향 없음
- 시즌/시리즈와 무관하게 지속
- 연승 배율로 점수에 직접 영향 (4.3 참조)

---

### 4.8 MVP Vote

**정의:** 이벤트 단위, 전체 출전 선수 중 MVP 1명 선택
**조건:** 로그인 유저만, 이벤트당 1회 투표
**MVP 결과 활용:** MVP 하이라이트 영상 → YouTube → 이벤트 결과 페이지 임베드

---

## 5. Ranking System

### 5.1 Running (All-Time)
- 전체 누적 점수
- 서브텍스트: "누적 점수 순위"

### 5.2 P4P (Pound-for-Pound) — NEW
- 체급별 예측 정확도 추적 (`user_weight_class_stats`)
- P4P score = sum(class_win_rate × sqrt(class_fights)) × breadth_bonus
- Breadth bonus = 1 + 0.1 × (qualified_classes - 1), cap 2.0
- 최소 조건: 2개 체급, 각 3전 이상
- 캐치웨이트/오픈웨이트 제외
- 서브텍스트: "체급 무관 최고 승률"

### 5.3 Series Ranking
- 블랙컵 / 넘버링 / 라이즈 등 시리즈 단위

### 5.4 Event Ranking
- 개별 이벤트 단위

### 5.5 Win Streak Ranking
- 현재 연승 기록 순
- LIVE 뱃지 (진행중) / best 표시 (정지)

### 5.6 Tie-breaker

1. **score** (높은 순)
2. **best_streak** (높은 순)
3. **current_streak** (높은 순)
4. **hall_of_fame_count** (높은 순)
5. **created_at** (빠른 유저 우선)

---

## 6. Navigation & Pages

### 6.1 Menu Structure

**Desktop:** 승부예측 / 나의 전적 / 랭킹
**Mobile (3-tab):** 승부예측 / 나의 전적 / 랭킹

### 6.2 Pages

| Route | Page | Description |
|-------|------|-------------|
| `/` | 승부예측 (Home) | Featured event + fight cards + ranking sidebar |
| `/results` | 나의 전적 | Personal analytics, timeline, badges |
| `/ranking` | 랭킹 | Full ranking with tabs |
| `/events/[id]` | Event Detail | All fights + poster background |
| `/events/[id]/fights/[fightId]` | Fight Detail | Single fight + comments |
| `/profile` | Profile | Account settings, stats |
| `/login`, `/signup` | Auth | Email + Google OAuth |

---

## 7. Social Features

### 7.1 Fight Discussion (Instagram-style)
- 각 경기별 댓글 (threaded replies)
- 좋아요 (heart toggle, optimistic UI)
- @멘션 자동완성 (댓글 참여자 기반)
- 답글 시 `@이름` 자동 프리필 + 인라인 입력
- 번역 버튼 (See translation / See original)

### 7.2 Notifications
- Bell icon with unread count badge
- 60초 polling
- Types: fight_start, result, mvp_vote, ranking_change
- Mark all read

---

## 8. My Record / Analytics (Strava-inspired) — PLANNED

### 8.1 Overview
- Fight Record (W-L), Score, Ranking, Streak
- P4P rank (if qualified)
- Badge collection summary

### 8.2 Prediction Timeline
- 시간순 전체 예측 히스토리
- 각 예측: 경기, 선택, 결과, 점수 변동, 뱃지 획득
- 하이라이트: Perfect Card, HoF 진입, 연승 기록

### 8.3 Badge System (Strava-inspired)

| Badge | Condition | Tier |
|-------|-----------|------|
| 🥇 Oracle | HoF Oracle 등극 | Count-based (×1, ×3, ×5) |
| 🥈 Sniper | HoF Sniper 등극 | Count-based |
| 🥉 Sharp Call | HoF Sharp Call 등극 | Count-based |
| 🎯 Perfect Card | 이벤트 전경기 적중 | Count-based |
| 🔥 Streak Fire | 10연승 달성 | Bronze(5) / Silver(10) / Gold(20) |
| 💯 Century | 100전 달성 | Bronze(50) / Silver(100) / Gold(200) |
| 🌍 World Class | 3+ 체급 예측 활동 | Bronze(2) / Silver(4) / Gold(6+) |
| ⚡ First Blood | 첫 예측 | One-time |
| 🏆 Champion | 이벤트 랭킹 1위 | Count-based |

### 8.4 Weight Class Breakdown
- 체급별 승/패, 승률, 점수
- 체급별 accuracy bar chart

### 8.5 Method Accuracy
- KO/TKO, Submission, Decision별 적중률

### 8.6 Score Trend Chart
- 시간별 점수 변동 그래프
- 연승 구간, HoF 진입 하이라이트

---

## 9. BC Official Site Integration

**Source:** `https://blackcombat-official.com`

**Data fetched:**
- 공식 대중예측 % (승부예측)
- 체급 정보 (English BOUT → Korean 체급 매핑)
- 선수 division 정보 (랭킹, 체급)
- 이벤트 포스터 이미지 (히어로 배경)
- Event ID 자동 매칭 (이벤트명으로 검색)

**Implementation:** `src/lib/bc-predictions.ts`
- `fetchBcEventDataFull()` — fights + posterUrl + sourceEventId
- `findSourceEventId()` — event name → BC site ID
- `fetchFromDetailPage()` — predictions, weight classes, divisions

---

## 10. Design System

**스타일:** Dark flat UI (no glassmorphism, except sticky headers with backdrop-blur)
**폰트:** Pretendard (sans-serif only)

### Components

| Component | Description |
|-----------|-------------|
| `RetroLabel` | Unified label (xs/sm/md × accent/success/danger/info/neutral/gold) |
| `RetroStatusBadge` | Status indicator (5 tones) |
| `retroChipClassName` | Category chips (accent/neutral) |
| `retroButtonClassName` | Full rounded buttons (primary/secondary/ghost × sm/md/lg) |
| `retroPanelClassName` | Card panels |
| `RankingRowCompact` | Sidebar ranking row |
| `RankingRowFull` | Full ranking page row |
| `RankDelta` | Rank change indicator (↑/↓/NEW) |

### Design Tokens

```
--bp-bg: #050505       --bp-card: #0d0d0d
--bp-card-inset: #080808  --bp-ink: #f5f5f5
--bp-accent: #ffba3c    --bp-muted: rgba(255,255,255,0.5)
--bp-success: #22c55e   --bp-danger: #ef4444
--bp-line: rgba(255,255,255,0.08)
```

### Spacing: 4px multiples (4, 8, 12, 16, 20, 24, 32, 40, 48px)
### Border Radius: 16px panels, 12px cards, 8px chips, 9999px buttons

---

## 11. Database Schema

### Core Tables
- `users` — id, email, ring_name, wins, losses, current_streak, best_streak, hall_of_fame_count, score, p4p_score
- `fighters` — id, name, ring_name, name_en, name_ko, record, nationality, weight_class, image_url
- `events` — id, name, series_type, date, status, mvp_video_url, poster_url, source_event_id
- `fights` — id, event_id, fighter_a_id, fighter_b_id, start_time, status, winner_id, method, round
- `predictions` — id, user_id, fight_id, winner_id, method, round, is_winner_correct, is_method_correct, is_round_correct, score
- `mvp_votes` — id, user_id, event_id, fighter_id
- `rankings` — id, type, reference_id, user_id, score, rank

### Social Tables
- `fight_comments` — id, fight_id, user_id, parent_id, body
- `comment_likes` — comment_id, user_id
- `comment_translations` — id, comment_id, target_locale, translated_body
- `notifications` — id, user_id, type, title, body, reference_id, is_read

### Scoring v2 Tables
- `user_weight_class_stats` — id, user_id, weight_class, wins, losses, score
- `hall_of_fame_entries` — id, user_id, fight_id, tier (sharp_call/sniper/oracle), bonus_points
- `perfect_card_entries` — id, user_id, event_id, bonus_points

### Key Functions
- `calculate_prediction_score()` — v2 scoring (+4/+8/+16, -2)
- `get_streak_multiplier()` — 1.0/1.5/2.0/2.5x
- `process_fight_result()` — full pipeline (score → streak → HoF → Perfect Card → P4P)
- `calculate_p4p_score()` — per-user P4P calculation
- `recalculate_all_scores()` — migration helper

---

## 12. Growth Strategy

### YouTube → Platform Flywheel
1. 이벤트 종료 → MVP 투표 → 하이라이트 영상 → YouTube → 플랫폼 유입

### Community Seeding
- 디시 미니갤, 유튜브/인스타 커뮤니티

---

## 13. Monetization

### Phase 1 — 수익 없음 (제품 검증)
### Phase 2 — Premium Identity ($3~5/month)
- 닉네임 색상, 프로필 테두리, HoF 강조, 특별 아바타
### Phase 3+ — 파트너십, 광고

---

## 14. Success Metrics

- Prediction 참여율, 재방문율, Streak 유지율
- HoF 발생 빈도, Perfect Card 빈도
- 댓글 수, 번역 사용률
- P4P 자격 유저 수 (체급 다양성 지표)

---

> **v11 변경 요약 (vs v10):**
> - Scoring: +4/+8/+16, -2 (짝수 체계), 연승 배율 1.0/1.5/2.0/2.5x
> - Hall of Fame: 3-tier (Sharp Call/Sniper/Oracle), 최소 50명
> - Perfect Card: 이벤트 전경기 적중 보너스
> - P4P Ranking: 체급별 정확도 추적, 새 탭
> - Social: Instagram-style 댓글, @멘션, 좋아요, 번역
> - Notifications: Bell icon, polling
> - BC Integration: 포스터 배경, 대중예측 %, 체급/랭킹
> - Design System: RetroLabel 컴포넌트, full rounded 버튼, golden pulse
> - Analytics/Badges: Strava-inspired My Record (계획중)
> - Menu: 승부예측 / 나의 전적 / 랭킹
> - i18n: en, ko, ja, pt-BR (4개 언어)
> - DB: 6개 신규 테이블, 5개 신규 함수
