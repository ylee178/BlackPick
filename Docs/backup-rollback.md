# BlackPick 백업/롤백 전략

## 백업 대상

| 대상 | 위치 | 방법 |
|------|------|------|
| DB (Postgres) | Supabase | Supabase Dashboard → Database → Backups (Pro plan: 자동 일일 백업) |
| DB Schema | Git | `supabase/migrations/` — 모든 마이그레이션 Git 관리 |
| Storage | Supabase Storage | 중요 파일만 수동 백업 (pixel art 등) |
| 앱 코드 | GitHub | Git history + Vercel 배포 이력 |
| 환경변수 | Vercel | Vercel Dashboard → Settings → Environment Variables |

## 배포 전 체크리스트

1. `main` 브랜치 최신 상태 확인
2. Supabase migration 파일이 Git에 커밋되어 있는지 확인
3. 중요 데이터 변경이 있다면 Supabase Dashboard에서 수동 백업 생성
4. Vercel Preview 배포에서 이상 없는지 확인
5. 배포 실행

## 코드 롤백 (Vercel)

1. Vercel Dashboard → Deployments
2. 이전 정상 배포 선택
3. "Promote to Production" 클릭
4. 즉시 이전 버전으로 롤백 완료

## DB 롤백

### Migration 되돌리기
```bash
# 최근 migration 확인
supabase migration list

# SQL로 직접 되돌리기 (migration에 down 함수가 없으므로)
supabase db execute --sql "DROP TABLE IF EXISTS ..."
```

### 데이터 복원
1. Supabase Dashboard → Database → Backups
2. 복원 시점 선택 → Restore (Pro plan)
3. Free plan: 수동 export한 SQL/CSV로 복원

## 수동 데이터 Export

```bash
# Supabase CLI로 특정 테이블 export
supabase db dump --data-only -f backup_$(date +%Y%m%d).sql

# 또는 Dashboard → Table Editor → Export CSV
```

## 장애 시 복구 순서

1. **증상 확인** — Vercel 로그, Sentry 에러 확인
2. **코드 원인이면** → Vercel에서 이전 배포로 즉시 롤백
3. **DB 원인이면** → migration 되돌리기 또는 백업에서 복원
4. **환경변수 원인이면** → Vercel Dashboard에서 수정 후 재배포
5. **원인 분석** → postmortem 작성 (`docs/postmortem.md`)

## 백업 주기

| 환경 | 주기 | 방법 |
|------|------|------|
| Production DB | 자동 일일 (Pro plan) | Supabase 자동 |
| Schema/Migration | 매 커밋 | Git |
| 주요 배포 전 | 수동 | Supabase Dashboard |
| pixel art 이미지 | 변경 시 | Git (public/fighters/pixel/) |
