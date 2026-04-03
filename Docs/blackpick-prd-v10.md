# 🥊 Black Pick — PRD + TRD v10 (Final)

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

**Phase 1:** English (default), Korean
**Phase 2:** Japanese, Spanish

**구현:** i18n JSON, 자동 감지 + 수동 선택
**적용:** UI 텍스트, 시스템 메시지

---

## 4. Core Systems

### 4.1 🥊 Prediction System

**입력:**

| 항목 | 필수/선택 | 옵션 |
|------|-----------|------|
| Winner | 필수 | Fighter A or B |
| Method | 선택 | KO/TKO, Submission, Decision |
| Round | 선택 | 1, 2, 3, 4 (OT) |

**Round 규칙:** Black Combat 전 경기 3라운드. 판정 박빙 시 심판 투표로 4라운드(OT) 진행. OT는 4라운드 퍼포먼스만으로 결과 결정. Round 옵션은 전 경기 고정 (1, 2, 3, 4 OT).

**예측 규칙:**

- 로그인 유저만 가능
- 경기당 1회 예측
- 경기 시작 전까지 수정 가능
- 경기 시작 시 Lock

**🔐 예측 무결성 (Critical):**

DB 레벨에서 강제. 프론트엔드 잠금만으로는 불충분.

```sql
-- Supabase RLS Policy
user_id = auth.uid()
AND created_at < fight.start_time
```

**공개 정책:**

- 경기 시작 전 → 비공개 (따라찍기 방지)
- 경기 시작 후 → 전체 공개 (소셜 모먼트 생성)

---

### 4.2 ⚖️ Scoring System

**핵심 원칙:** 풀 적중 = 10점 만점. Winner만 맞추는 건 50:50 확률이므로 보상 최소화. 디테일까지 맞출수록 높은 보상.

**적중 점수:**

| 적중 범위 | 점수 |
|-----------|------|
| Winner + Method + Round 전부 적중 | **10점** |
| Winner + Method 적중, Round 틀림/미선택 | **7점** |
| Winner만 적중, Method 틀림/미선택 | **3점** |

**실패 (Winner 틀림):**

| 선택 범위 | 패널티 |
|-----------|--------|
| Winner만 선택 후 틀림 | **0점** |
| Method까지 선택 후 틀림 | **-3점** |
| Round까지 선택 후 틀림 | **-5점** |

**설계 의도:** Winner가 틀리면 Method/Round는 무의미 → 전부 틀린 것으로 처리. 디테일하게 예측할수록 틀렸을 때 리스크 존재. "확신 없으면 Winner만 찍어라, 대신 3점밖에 못 받는다."

---

### 4.3 Win / Loss (Fight Record)

| 결과 | 기록 |
|------|------|
| Winner 적중 | **Win** |
| Winner 미적중 | **Loss** |
| 경기 취소 | 카운트 안 함 |
| 예측 안 한 경기 | 카운트 안 함 |

Method/Round 적중 여부는 전적에 영향 없음 — 점수에만 반영.

---

### 4.4 🏆 Hall of Fame

**발동 조건 (전부 충족):**

1. Winner를 적중
2. 전체 예측자 중 5% 이하만 적중
3. 해당 경기 최소 예측자 20명 이상

**보상:**

- +50점 (기본 적중 점수에 추가)
- 프로필에 Hall of Fame 횟수 기록
- 이벤트 결과 페이지에 강조 표시 ("Only 3% got this right")

**설계 의도:** 유저 수와 무관하게 일정한 희소성 유지. 유저 10명일 때 과다 발생 방지(최소 20명 조건). 유저 10,000명일 때도 5% 기준이라 자연스럽게 발동.

---

### 4.5 🔥 Streak System

**정의:** Winner 연속 적중 횟수

**규칙:**

- Winner 틀리면 리셋
- 경기 취소 시 streak 영향 없음
- 시즌/시리즈와 무관하게 지속

**데이터:**

```json
{
  "current_streak": 5,
  "best_streak": 12
}
```

**역할:**

- 리텐션 핵심 ("지금 5연속인데 다음 경기도 맞추면...")
- 랭킹 Tie-breaker

---

### 4.6 🗳 MVP Vote

**정의:** 이벤트 단위, 해당 이벤트 전체 출전 선수 중 MVP 1명 선택

**조건:**

- 로그인 유저만
- 이벤트당 1회 투표
- 경기 종료 후 24시간 활성화

**MVP 결과 활용:**

- MVP 1위 선수의 픽셀 캐릭터 하이라이트 영상 제작 → YouTube 업로드 → 이벤트 결과 페이지 임베드

---

## 5. Ranking System

### 5.1 Running Ranking

- 전체 누적 점수
- 리셋 없음
- "커리어 랭킹" — 장기 기록

### 5.2 Series Ranking

- 블랙컵 / 넘버링 / 라이즈 등 시리즈 단위
- 시리즈 내 경쟁

### 5.3 Event Ranking

- 개별 이벤트 단위
- 단기 경쟁

### 5.4 Tie-breaker (확정)

동점 시 아래 순서대로 결정:

1. **score** (높은 순)
2. **best_streak** (높은 순)
3. **current_streak** (높은 순)
4. **hall_of_fame_count** (높은 순)
5. **created_at** (빠른 유저 우선)

---

## 6. Event Page States

이벤트 페이지는 status에 따라 세 가지 모드로 전환:

### 6.1 Pre-Fight (status: upcoming)

- 경기 리스트 (Fighter A vs Fighter B, 픽셀 아바타, 날짜)
- 각 경기별 예측 입력
- Crowd Prediction % 표시 (비율만, 개별 예측 비공개)

### 6.2 Live (status: live)

- 예측 잠금 (수정 불가)
- 전체 예측 공개
- Crowd Prediction % 업데이트

### 6.3 Post-Fight (status: completed)

- 각 경기별 결과 + 내 예측 적중/미적중 표시
- MVP 하이라이트 영상 임베드 (상단, YouTube embed)
- MVP 투표 (24시간)
- 내 전적 변동 표시

---

## 7. Fighter Display

**방식:** 실제 사진 ❌ → 픽셀 캐릭터 사용
**규칙:** 특정 선수 유사성 금지, 체형/스타일 기반 generic 캐릭터

---

## 8. Data Strategy

**구조:** Hybrid (Admin Primary + Crawling Secondary)

### 8.1 Primary — Admin 입력

- 이벤트 생성, 경기 등록, 선수 등록
- 결과 입력
- Admin Tool (수정 전용): 선수 변경, 경기 수정, 결과 입력, 이미지 업로드

### 8.2 Secondary — 크롤링 (보조/검증)

**소스:** `https://www.blackcombat-official.com/eventDetail.php`

(이벤트 페이지 → 각 선수 상세 페이지 링크 크롤링)

**흐름:** `Crawl → Parse → Upsert DB → Admin Override`

**기술:** Node.js + axios + cheerio
**실행:** Cron (하루 1회) + Admin 수동 trigger

**원칙:**

- Admin 데이터 우선 (크롤링 데이터는 검증/보완용)
- 크롤링 깨지면 Admin 수동으로 커버
- 크롤링 의존도 낮춤 → 안정성 확보

---

## 9. Account System

**인증:** Email + OAuth (Google)
**보안:** 이메일 인증 필수, 동일 IP 다중 예측 감지 → flag

**프로필 표시:**

- Ring Name
- Fight Record (W-L)
- Current Streak / Best Streak
- Hall of Fame 횟수
- 총 점수
- 랭킹
- 뱃지

---

## 10. Growth Strategy

### 10.1 YouTube → Platform Flywheel

1. 이벤트 종료
2. MVP 투표 결과 확정
3. MVP 선수 픽셀 캐릭터 하이라이트 영상 제작
4. YouTube 업로드 (description에 플랫폼 링크 + CTA)
5. 플랫폼 이벤트 결과 페이지에 임베드
6. YouTube에서 신규 유저 유입 → 다음 이벤트 예측 참여

**운영:** 이벤트당 1개 영상 (다음 이벤트 전까지 텀 활용)

### 10.2 Community Seeding

- 디시 미니갤러리 홍보
- Black Combat 관련 유튜브/인스타 커뮤니티 공유
- 제품 자체가 돌아가는 상태에서 자연스럽게 소개 → 블랙컴뱃 측과 관계 형성

---

## 11. Monetization

### Phase 1 — 수익 없음

제품 검증 + 유저 확보 집중. YouTube 영상은 채널 성장용.

### Phase 2 — Premium Identity ($3~5/month)

- 닉네임 색상 커스텀
- 프로필 테두리
- Hall of Fame 강조 UI
- 특별 픽셀 아바타

게임성에 영향 없음 (pay-to-win ❌). 자기 표현 욕구만 건드리는 cosmetic 수익화.

### Phase 3+ — Potential

- Black Combat 공식 파트너십 (공식 예측 파트너)
- 니치 광고 (격투기 브랜드, 보충제 등)
- 커뮤니티 영상 기여 구조

---

## 12. Technical Design (TRD)

### 12.1 Stack

| Layer | Tech | 이유 |
|-------|------|------|
| Frontend | Next.js (SSR) + Tailwind | SEO 확보 (검색 유입), Vercel 최적화 |
| Backend/DB | Supabase (PostgreSQL + Auth + RLS) | Auth 내장, 무료 시작, DB+API+RLS 통합 |
| Hosting | Vercel | Next.js 최적화, 무료 티어 |
| CDN/Domain | Cloudflare | 무료, 글로벌 CDN |

**MVP 비용:** $0 ~ $20/month

---

### 12.2 Security

**예측 무결성 (최우선):**

- 서버 타임스탬프 저장
- DB 레벨 Lock (RLS)
- 프론트엔드 잠금은 보조 수단

**RLS Policy:**

```sql
-- 예측 생성/수정
user_id = auth.uid()
AND created_at < fight.start_time

-- 예측 조회 (경기 시작 전: 본인만, 시작 후: 전체)
CASE
  WHEN fight.start_time > now() THEN user_id = auth.uid()
  ELSE true
END
```

**다중 계정 방지:**

- 이메일 인증 필수
- 동일 IP에서 경기당 2+ 예측 → flag
- 완벽한 방지는 불가 → MVP에서는 이 수준이면 충분

---

### 12.3 Database Schema

#### users

```
id              UUID (PK)
email           TEXT (unique)
ring_name       TEXT (unique)
wins            INT (default 0)
losses          INT (default 0)
current_streak  INT (default 0)
best_streak     INT (default 0)
hall_of_fame_count INT (default 0)
score           INT (default 0)
created_at      TIMESTAMPTZ
```

#### fighters

```
id              UUID (PK)
name            TEXT
record          TEXT          -- e.g. "5-2-0"
nationality     TEXT
weight_class    TEXT
image_url       TEXT          -- 픽셀 아바타 URL
created_at      TIMESTAMPTZ
```

#### events

```
id              UUID (PK)
name            TEXT          -- e.g. "Black Combat Numbering 10"
series_type     TEXT          -- 'black_cup' | 'numbering' | 'rise' | etc.
date            DATE
status          TEXT          -- 'upcoming' | 'live' | 'completed'
mvp_video_url   TEXT          -- YouTube embed URL (결과 확정 후 추가)
created_at      TIMESTAMPTZ
```

#### fights

```
id              UUID (PK)
event_id        UUID (FK → events)
fighter_a_id    UUID (FK → fighters)
fighter_b_id    UUID (FK → fighters)
start_time      TIMESTAMPTZ
status          TEXT          -- 'upcoming' | 'completed' | 'cancelled'
winner_id       UUID (FK → fighters, nullable)
method          TEXT          -- 'KO/TKO' | 'Submission' | 'Decision' | null
round           INT           -- 1~4, null
created_at      TIMESTAMPTZ
```

#### predictions

```
id                  UUID (PK)
user_id             UUID (FK → users)
fight_id            UUID (FK → fights)
winner_id           UUID (FK → fighters)
method              TEXT (nullable)
round               INT (nullable)
created_at          TIMESTAMPTZ

is_winner_correct   BOOLEAN (nullable, 결과 처리 후 업데이트)
is_method_correct   BOOLEAN (nullable)
is_round_correct    BOOLEAN (nullable)
score               INT (nullable, 결과 처리 후 계산)
```

**Unique constraint:** `(user_id, fight_id)` — 경기당 1예측

#### mvp_votes

```
id              UUID (PK)
user_id         UUID (FK → users)
event_id        UUID (FK → events)
fighter_id      UUID (FK → fighters)
created_at      TIMESTAMPTZ
```

**Unique constraint:** `(user_id, event_id)` — 이벤트당 1투표

#### rankings (Series/Event 전용)

```
id              UUID (PK)
type            TEXT          -- 'series' | 'event'
reference_id    UUID          -- event_id or series identifier
user_id         UUID (FK → users)
score           INT
rank            INT
```

**Note:** Running Ranking은 별도 테이블 없이 users.score 기준 정렬로 처리.

---

### 12.4 Fight Cancellation

**조건:** `fight.status = 'cancelled'`

**처리:**

- 해당 경기 모든 prediction 무효
- 점수 = 0 (가감 없음)
- Win/Loss 카운트 안 함
- Streak 영향 없음

---

### 12.5 Result Processing Flow

1. Admin이 경기 결과 입력 (`fights.winner_id`, `method`, `round`, `status = 'completed'`)
2. 해당 경기 전체 predictions 조회
3. 각 prediction에 대해:
   - `is_winner_correct` 계산
   - `is_method_correct` 계산 (method를 선택한 경우만)
   - `is_round_correct` 계산 (round를 선택한 경우만)
   - `score` 계산 (Scoring System 규칙 적용)
4. users 테이블 업데이트:
   - `wins` / `losses` 증감
   - `score` 가산
   - `current_streak` 업데이트 (적중 시 +1, 미적중 시 0으로 리셋)
   - `best_streak` 업데이트 (current > best이면 갱신)
5. Hall of Fame 체크:
   - 해당 경기 예측자 수 ≥ 20
   - Winner 적중률 ≤ 5%
   - 조건 충족 시: 해당 유저들 +50점, `hall_of_fame_count` +1

---

### 12.6 Crawling System

**역할:** Secondary (데이터 검증 + 누락 보완)

**기술:** Node.js + axios + cheerio
**실행:** Cron (하루 1회) + Admin trigger
**소스:** Black Combat 공식 사이트 이벤트 페이지 → 선수 상세 페이지

**흐름:** `Fetch → Parse → Extract → Upsert (Admin data 우선)`

---

## 13. Phase 2 — Social & Global (개요)

### 13.1 Fight Discussion

- Fight Detail 페이지 하단 댓글
- 로그인 유저만 작성

### 13.2 Translation (비용 최적화)

- 자동 번역 ❌, 버튼 번역 ⭕
- 클릭 시 번역 API 호출 + 캐싱
- 언어 태그 표시 (KO/EN)

### 13.3 Notifications

- 경기 시작 알림
- 결과 발표 알림
- MVP 투표 알림
- 랭킹 변화 알림
- Web push + Email fallback

### 13.4 Moderation

- 신고 (Report)
- 욕설 필터
- 관리자 삭제

---

## 14. Design System

**스타일:** Dark UI + Retro Pixel
**픽셀 캐릭터 역할:** UI 보조 + 실제 선수 이미지 대체

---

## 15. Success Metrics

### Phase 1

- Prediction 참여율 (이벤트당 예측 수)
- 재방문율 (이벤트 간 리텐션)
- Streak 유지율
- Hall of Fame 발생 빈도

### Phase 2

- 댓글 수
- 번역 사용률
- 알림 클릭률

---

## 16. Risks & Mitigation

| Risk | Mitigation |
|------|------------|
| 예측 조작 (경기 후 수정) | DB Lock (RLS policy) |
| 크롤링 실패 (사이트 구조 변경) | Admin 수동 입력 (primary) |
| 데이터 오류 | Admin override |
| 경기 취소 | status = cancelled, 예측 무효 처리 |
| Cold Start (유저 부족) | Crowd % 최소 표시 기준 설정, 운영자 초기 예측 |
| 고인물 독점 | Event/Series 랭킹으로 단기 경쟁 기회 제공 |
| 다중 계정 | 이메일 인증 + IP flag |

---

## 17. Constraints

- 선수 실제 이미지 사용 금지
- Black Combat only (Phase 1~2)
- 초기 데이터 Admin 수동 입력 기반

---

## 18. Implementation Order

1. Supabase 세팅 (Auth + DB + RLS)
2. DB 테이블 생성
3. 크롤러 구현 (선수/이벤트 데이터)
4. Admin Tool (결과 입력)
5. Prediction API
6. Event Page UI (3 states)
7. Profile / Ranking UI
8. MVP Vote

---

> **v10 = 이전 버전 대비 변경점:**
> - Scoring: 10점 만점 체계 (Confidence 제거)
> - Win/Loss: Winner 기준만
> - Hall of Fame: 비율 기반 (5%, 최소 20명)
> - Data Strategy: Admin primary / Crawling secondary
> - Event Page: 3-state 구조 (upcoming/live/completed)
> - MVP Vote: 복구 + 영상 연결
> - fighters 테이블: 복구
> - Fight Cancellation: 명시
> - Result Processing Flow: 신규 추가
> - DB: is_correct 필드, status 필드, mvp_video_url 추가
> - Monetization: YouTube flywheel + Premium Identity 구체화
