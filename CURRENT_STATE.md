# BlackPick — Current State (2026-04-08, Session 2)

## Branch
`feature/fighter-image-management`

---

## Completed (Session 2)

### Security — ALL DONE
- ~~#1 API키 로테이션~~ → .env가 Git에 커밋된 적 없어 불필요
- ~~#2 fighter-avatar API 인증~~ → getUser() 추가 완료
- ~~#3 Path traversal 차단~~ → UUID 검증 완료
- ~~#4 Auth callback open redirect~~ → 내부 경로만 허용
- ~~#5 generate rate limiting~~ → 5/hr
- ~~#6 Gemini API키 process.env~~ → 완료
- ~~#7 댓글/예측 rate limiting~~ → 20-30/min

### Legal — DONE
- ~~#8 이용약관~~ → /terms (ko/en)
- ~~#9 개인정보처리방침~~ → /privacy (ko/en)

### Infra/Ops — DONE
- ~~#10 에러 페이지~~ → error.tsx, not-found.tsx, global-error.tsx
- ~~#11 SEO~~ → robots.ts, sitemap.ts, OG/Twitter meta
- ~~#12 CORS~~ → middleware.ts (API routes only)
- ~~#13 env validation~~ → instrumentation.ts + .env.example
- ~~#14 Sentry~~ → config files ready (.bak, 패키지 설치 필요)
- ~~#15 백업/롤백~~ → docs/backup-rollback.md

### Performance HIGH — DONE
- ~~#16 ISR~~ → home/events/fighters revalidate 60-300초
- ~~#17 .limit()~~ → fighters, admin에 limit 추가
- ~~#18 SELECT *~~ → admin fighters 필요 컬럼만 (events는 타입 제약으로 유지)
- ~~#19 loading.tsx~~ → events/[id]/ 추가
- ~~#20 FighterAvatar~~ → Next.js Image 전환
- ~~#21 fs.readdirSync~~ → pixel-files.ts 서버 전용 캐시
- ~~#22 Cache-Control~~ → ranking s-maxage=300, events/stats s-maxage=60

### Performance MEDIUM — PARTIALLY DONE
- ~~#24 dynamic import~~ → ScoreTrendChart, FighterImageManager
- ~~#25 loading.tsx~~ → results, dashboard, terminal 추가
- #23 axios 제거 → scripts에만 사용, 스킵
- #26 불필요 "use client" 정리 → 미착수

---

## Remaining Tasks

### Feature Gaps (다음 세션)

| Feature | Status | Notes |
|---------|--------|-------|
| Badge System UI | **Missing** | DB에 기록 있음 (oracle/sniper/sharp_call). 9개 뱃지 시각 표시 미구현 |
| @Mention Autocomplete | **Missing** | FightComments에는 구현됨, FighterComments에만 없음. MentionInput 공유 컴포넌트 추출 필요 |
| Perfect Card | Done (logic) | **UI 뱃지 표시 미구현** |

### Accessibility (LOW)

| # | Task |
|---|------|
| 27 | FightCardPicker nested-interactive 구조 리팩토링 |
| 28 | 선수 디테일 페이지 color contrast 3건 수정 |
| 29 | ~~console.error 민감 정보~~ → error.tsx에서 prod 제외 처리 완료 |
| 30 | Tailwind 번들 크기 검증 |
| 31 | 모바일/브라우저 호환성 테스트 |
| 32 | RLS 의존도 줄이기 |

### Pending Infra
- Sentry: `npm install @sentry/nextjs` + DSN 설정 후 .bak 파일 rename
- OG 이미지: `public/og/default.png` (1200x630) 디자인 필요
- CORS: prod 도메인 확정 후 `CORS_ALLOW_ORIGIN` 설정
- Supabase dev/prod 프로젝트 분리 (Dashboard 설정)

---

## Recommended Next Steps

```
1. 기능 갭 (badge UI, @mention autocomplete, Perfect Card 뱃지)
2. 접근성 (#27-28, #30-32)
3. Sentry 패키지 설치 + 활성화
4. OG 이미지 디자인
5. 이미지 보정 (31개 outpaint)
```

---

## Dev Tools Available

DevPanel (dev only, 우하단 톱니):
- **Full Data** — 시드 유저 10명, 이벤트 3개, 예측, 댓글, 랭킹 생성
- **Complete** — upcoming/live 경기 → completed (랜덤 승자)
- **Empty** — 시드 데이터 전부 삭제

## Fighter Images
- 84개 픽셀아트 in `public/fighters/pixel/`
- 배경: #2A2A2A
- 머리 잘린 이미지 31개 — 리스트: Wiki_Sean/BlackPick/2026-04-08-session.md
