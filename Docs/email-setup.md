# BlackPick Email Infrastructure Setup

**Goal**: ship a zero-cost, PIPA-compliant email stack for BlackPick that handles:
1. **Inbound** — users reply to `support@blackpick.io` and it lands in Sean's Gmail
2. **Outbound** — Supabase auth emails + feedback relay notifications sent from `noreply@blackpick.io`
3. **Send-as** — Sean replies to users from `support@blackpick.io` (or `admin@`/`privacy@`) directly from Gmail

**Monthly cost**: $0 (at expected pre-launch volume of ~600 emails/mo, well within Resend's 3000/mo free tier and Cloudflare Email Routing's unlimited free tier).

**Who runs this**: Sean. Manual ~30 min one-time setup. After this guide is executed, the `feature/feedback-email-relay` branch (Phase 2 branch 2) can ship.

---

## 4 addresses

| Address | Direction | Purpose |
|---|---|---|
| `noreply@blackpick.io` | Outbound only | Supabase auth (confirm signup, reset password), feedback relay notifications to Sean. Users should NOT reply here — bounces/drops. |
| `support@blackpick.io` | **Inbound + Outbound** | User-facing support. Users email here for help. Sean replies from here via Gmail Send As. |
| `admin@blackpick.io` | Inbound + rare Outbound | Domain registrar contacts (Vercel/Cloudflare billing, DNS notifications), Sentry alerts, Supabase admin notifications, general ops. |
| `privacy@blackpick.io` | Inbound (alias) | **PIPA 제30조 requirement** — 개인정보처리방침에 공개해야 하는 개인정보보호책임자 연락처. Forwards to `admin@` or Sean's Gmail. |

---

## Architecture

```
┌─────────────────┐
│   사용자         │
└────────┬────────┘
         │ support@blackpick.io로 이메일
         ▼
┌──────────────────────────┐
│ Cloudflare               │  ← MX 레코드 여기로 (자동 설정)
│ Email Routing            │  (무료, inbound only)
│                          │
│ Rule 1: support@      ───┼──┐
│ Rule 2: admin@        ───┼──┤
│ Rule 3: privacy@      ───┼──┤
│ Rule 4: noreply@ → drop  │  │
└──────────────────────────┘  │
                              ▼
                    ┌──────────────────┐
                    │ sean@gmail.com   │
                    │ (기존 개인 메일)  │
                    │                  │
                    │ Gmail Send As:   │
                    │  • support@      │ ← Resend SMTP로 발송
                    │  • admin@        │
                    │  • privacy@      │
                    └──────────────────┘

┌──────────────────┐
│ BlackPick 서버    │
│ (Vercel)         │
└────────┬─────────┘
         │ Resend API
         ▼
┌──────────────────────────┐
│ Resend                   │  ← SPF + DKIM + DMARC 인증
│ (무료 3000/mo, 100/day)  │
│                          │
│ From: noreply@       ────┼──→ 사용자 인박스 (Supabase auth)
│ From: noreply@       ────┼──→ sean@gmail.com (feedback relay)
│ From: support@       ────┼──→ 사용자 인박스 (Sean 답장 시)
└──────────────────────────┘
```

---

## Prerequisites

- Cloudflare 계정에 `blackpick.io` 이미 등록되어 있음 (현재 DNS 관리 중)
- Sean 개인 Gmail 계정 (`sean@gmail.com` 또는 기존 사용 중인 것)
- Vercel 프로젝트 접근 권한 (env var 추가용)
- Terminal + 웹브라우저

---

## Step 1: Resend 계정 + 도메인 추가 (10분)

### 1.1 Resend 가입

1. https://resend.com/signup 접속
2. GitHub OAuth 또는 이메일로 가입
3. 가입 완료되면 Dashboard로 이동

### 1.2 도메인 추가

1. Dashboard 좌측 사이드바 → **Domains** 클릭
2. **Add Domain** 버튼 클릭
3. Domain 입력: `blackpick.io`
4. Region 선택: **Tokyo (ap-northeast-1)** — 한국 유저 지연 최소화
5. **Add** 클릭

### 1.3 DNS 레코드 정보 복사

Resend가 도메인 인증용 레코드 4~6개를 보여줌. 각 레코드의:
- **Type** (TXT / CNAME / MX)
- **Name** (예: `resend._domainkey` 또는 `send`)
- **Value** (긴 문자열)
- **Priority** (MX 레코드일 때만)

메모장에 다 복사해두기. 다음 스텝에서 Cloudflare에 넣을 예정.

---

## Step 2: Cloudflare Email Routing 활성화 (5분)

### 2.1 Email Routing 켜기

1. Cloudflare 대시보드 → `blackpick.io` 도메인 선택
2. 좌측 사이드바 → **Email** → **Email Routing**
3. **Enable Email Routing** 클릭
4. Cloudflare가 자동으로 필요한 **MX + TXT 레코드**를 DNS에 추가함 (수동 작업 없음)

### 2.2 Destination address 등록

Cloudflare는 forward 목적지 이메일을 사전 검증해야 함.

1. Email Routing 페이지 → **Destination addresses** 탭
2. **Add destination address** → Sean의 개인 Gmail 입력 (예: `sean@gmail.com`)
3. Gmail 인박스로 가서 Cloudflare 검증 링크 클릭 → 확인

### 2.3 Routing rules 생성

**Custom addresses** 탭에서 4개 rule 만들기:

| Custom address | Action | Destination |
|---|---|---|
| `support@blackpick.io` | Send to an email | sean@gmail.com |
| `admin@blackpick.io` | Send to an email | sean@gmail.com |
| `privacy@blackpick.io` | Send to an email | sean@gmail.com |
| `noreply@blackpick.io` | **Drop** | — |

**Catch-all** (선택, 권장): 설정 안 된 주소로 오는 메일 자동 처리
- Catch-all address → **Drop** (스팸 방지)

### 2.4 Inbound 테스트

Gmail에서 `test@blackpick.io`로 자기 자신에게 메일 보내기 → Drop 되어야 함 (catch-all drop). 그 다음 `support@blackpick.io`로 보내기 → Gmail 인박스에 도착해야 함.

---

## Step 3: Cloudflare DNS에 Resend 레코드 추가 (5분)

Step 1.3에서 복사해둔 Resend DNS 레코드들을 Cloudflare DNS에 추가.

1. Cloudflare 대시보드 → `blackpick.io` → **DNS** → **Records**
2. 각 Resend 레코드마다 **Add record**:

### SPF 레코드 (TXT)
- Type: `TXT`
- Name: `send` (Resend가 준 이름 그대로)
- Content: `v=spf1 include:amazonses.com ~all` (또는 Resend가 준 값)
- TTL: Auto
- Proxy status: **DNS only** (orange cloud OFF)

### DKIM 레코드 (CNAME × 3)
- Type: `CNAME`
- Name: `resend._domainkey` 등 (Resend가 준 이름)
- Target: Resend가 준 값 (예: `resend._domainkey.xxxxx.resend.com`)
- Proxy status: **DNS only**

### DMARC 레코드 (TXT)
- Type: `TXT`
- Name: `_dmarc`
- Content: `v=DMARC1; p=none; rua=mailto:admin@blackpick.io; ruf=mailto:admin@blackpick.io; fo=1`
- `p=none` 으로 시작 → 2주 관찰 후 문제 없으면 `p=quarantine`으로 업그레이드

**참고**: Cloudflare는 orange-cloud proxy가 기본값이지만 이메일 DNS 레코드는 **반드시 DNS only (회색)** 여야 함. Cloudflare proxy가 TXT/CNAME을 건드리면 이메일 인증이 깨짐.

### 레코드 추가 후 Resend 검증

1. Resend Dashboard → Domains → `blackpick.io` → **Verify DNS Records** 버튼
2. 5~15분 기다림 (DNS 전파)
3. 모든 레코드 ✓ 초록색이 되면 도메인 verified
4. 도메인 상태: **Verified** 표시

---

## Step 4: Resend API key 발급 + Vercel env var (5분)

### 4.1 API key 발급

1. Resend Dashboard → 좌측 사이드바 → **API Keys**
2. **Create API Key** 클릭
3. Name: `BlackPick Production`
4. Permission: **Full access** (또는 **Sending access** — 더 좁음, 권장)
5. Domain: `blackpick.io` 선택
6. **Create** → 나오는 `re_XXXX...` 키를 즉시 복사 (페이지 닫으면 다시 못 봄)

### 4.2 Vercel env var 추가

```bash
# 로컬 CLI 사용 (vercel login 된 상태여야 함)
vercel env add RESEND_API_KEY production
# 프롬프트에 API key 붙여넣기

vercel env add FEEDBACK_RECIPIENT_EMAIL production
# 프롬프트에 sean@gmail.com 또는 support@blackpick.io 입력
# (내 피드백 relay가 어디로 가는지 — admin@ 추천)
```

또는 Vercel 대시보드 UI로:
1. Vercel → `blackpick` 프로젝트 → Settings → Environment Variables
2. Name: `RESEND_API_KEY`, Value: `re_XXXX...`, Environment: Production
3. Name: `FEEDBACK_RECIPIENT_EMAIL`, Value: `admin@blackpick.io`, Environment: Production

**Preview/Development 환경**: 선택사항. 프리뷰에서도 실제 이메일을 쏘고 싶으면 추가. 보통은 안 함 (프리뷰는 스팸 발생 가능).

### 4.3 `.env.local` 에도 추가 (로컬 개발용)

```bash
# .env.local 에 추가 (gitignore 됨)
RESEND_API_KEY=re_XXXX...
FEEDBACK_RECIPIENT_EMAIL=admin@blackpick.io
```

---

## Step 5: Gmail Send As 설정 (5분 × 3개 alias)

Sean이 Gmail에서 답장할 때 `From: support@blackpick.io`로 나가게 하려면 Gmail "Send mail as" 설정 필요.

### 5.1 support@blackpick.io 추가

1. Gmail 열기 → 우측 상단 ⚙️ → **See all settings**
2. **Accounts and Import** 탭 → **Send mail as** 섹션
3. **Add another email address** 클릭
4. 팝업에서:
   - Name: `BlackPick Support` (또는 원하는 표시 이름)
   - Email address: `support@blackpick.io`
   - **Treat as an alias** 체크
5. **Next Step**
6. SMTP Server 설정:
   - SMTP Server: `smtp.resend.com`
   - Port: `587`
   - Username: `resend`
   - Password: (Step 4.1에서 발급한 API key 붙여넣기)
   - **Secured connection using TLS** 선택
7. **Add Account**
8. Gmail이 `support@blackpick.io`로 검증 메일을 보냄 (내가 Cloudflare Email Routing으로 설정한 대로 Sean 인박스로 돌아옴)
9. 검증 메일의 확인 링크 클릭 → 완료

### 5.2 admin@ + privacy@ 동일하게 추가

Step 5.1 반복, Email 부분만 변경.

### 5.3 기본 From 주소 설정 (선택)

Gmail Settings → Accounts → "When replying to a message:" → **Reply from the same address the message was sent to** 선택. 이렇게 하면:
- 유저가 `support@`로 보낸 메일 답장 → 자동으로 `From: support@`로 나감
- Sean 개인 Gmail로 온 메일 답장 → 자동으로 `From: sean@gmail.com`로 나감

자동 분기라서 편함.

---

## Step 6: Supabase Auth 이메일을 Custom SMTP로 전환 (선택, 5분)

**지금은 선택**: Supabase는 기본적으로 자체 도메인 (`*.supabase.co`)에서 인증 메일을 보냄. 이것도 동작은 하는데, `noreply@blackpick.io`에서 보내면 브랜드 일관성 좋아짐.

### 6.1 Supabase 대시보드 설정

1. Supabase Dashboard → `BlackPick` 프로젝트 (PROD) → **Project Settings** → **Auth**
2. 스크롤 → **SMTP Settings** 섹션
3. **Enable Custom SMTP** 토글
4. 설정:
   - Sender email: `noreply@blackpick.io`
   - Sender name: `BlackPick`
   - Host: `smtp.resend.com`
   - Port: `587`
   - Username: `resend`
   - Password: (Resend API key, Step 4.1)
5. **Save**

### 6.2 DEV 프로젝트에도 동일 설정 (선택)

Dev 환경에서도 같은 브랜딩 원하면 `BlackPick_Dev` 프로젝트에도 동일하게.

Resend 도메인은 하나만 verified 되어 있어도 DEV + PROD 둘 다 쓸 수 있음 (같은 From 주소).

### 6.3 Test Email 발송

Supabase Dashboard → Authentication → Email Templates → **confirm_signup** → **Send Test Email** → 설정한 테스트 주소로 발송 → Gmail/iOS Mail/Outlook에서 렌더링 확인.

---

## Step 7: Verification 체크리스트

전체 셋업 완료 후 다음 항목이 다 통과해야 함:

- [ ] Cloudflare Email Routing Enabled
- [ ] 4 custom rules 생성 (support/admin/privacy → Gmail, noreply → drop)
- [ ] Catch-all rule = drop
- [ ] Destination address (Sean's Gmail) verified
- [ ] Resend 도메인 `blackpick.io` Verified 상태
- [ ] SPF TXT 레코드 Cloudflare DNS에 있음
- [ ] DKIM CNAME 3개 Cloudflare DNS에 있음
- [ ] DMARC TXT 레코드 Cloudflare DNS에 있음 (p=none으로 시작)
- [ ] `RESEND_API_KEY` Vercel production env에 있음
- [ ] `FEEDBACK_RECIPIENT_EMAIL` Vercel production env에 있음
- [ ] Gmail Send As: support@blackpick.io 검증 완료
- [ ] Gmail Send As: admin@blackpick.io 검증 완료
- [ ] Gmail Send As: privacy@blackpick.io 검증 완료
- [ ] (선택) Supabase Custom SMTP 활성화 + test email 성공

### 동작 테스트

1. **Inbound**: 다른 이메일 계정에서 `support@blackpick.io`로 이메일 보내기 → Sean Gmail 인박스에 도착하면 OK
2. **Outbound via Resend API**: 다음 세션에 `feature/feedback-email-relay`로 테스트 (route handler가 Resend 호출)
3. **Send As**: Gmail에서 새 메일 작성 → From 드롭다운에 `support@blackpick.io` 보임 → 다른 이메일로 테스트 발송 → 수신 측 From 필드가 `support@blackpick.io`로 보이면 OK
4. **DMARC report**: 2주 후 `admin@blackpick.io`로 DMARC report XML이 오기 시작함. 내용 확인해서 fail 없으면 `p=quarantine`으로 업그레이드.

---

## Troubleshooting

### "Resend 도메인 verification 실패"
- DNS 전파 대기 부족. `dig TXT send.blackpick.io` 로 확인. 안 나오면 15분 더 기다림.
- Cloudflare proxy (orange cloud)가 켜져 있으면 TXT/CNAME 꺼버림. 전부 **DNS only**로.
- DNS 레코드 Name 필드에 `blackpick.io` 포함 여부 확인 — Cloudflare는 자동으로 붙이므로 `send`만 입력 (`send.blackpick.io` 아님)

### "Gmail Send As 검증 메일 안 와"
- Cloudflare Email Routing rule이 `support@blackpick.io` → Sean Gmail로 설정 되어 있는지 확인
- Cloudflare Destination address가 verified 되어 있는지 확인
- 스팸함 체크

### "Supabase 테스트 메일 안 와"
- Resend Dashboard → Logs → 해당 이메일 찾아서 status 확인 (delivered / bounced / complaint)
- `noreply@blackpick.io` 가 Resend에서 허용된 From인지 확인 — 도메인 자체가 verified 면 아무 `*@blackpick.io` 사용 가능
- Supabase URL Configuration에서 Site URL이 `https://blackpick.io` 맞는지

### "SPF fail in Gmail header"
- SPF 레코드 value에 `include:amazonses.com` + `include:_spf.resend.com` 둘 다 있는지 (Resend가 AWS SES 기반이라 둘 다 필요할 수 있음). Resend Dashboard가 주는 value 그대로 쓰기.

### "DMARC 보고서 넘쳐"
- 2주 후 `admin@`에 DMARC XML 보고서가 쌓임. 자동 파싱 안 해도 되지만 대량이면 `rua=` 제거하거나 전용 서비스 (dmarc.postmarkapp.com 무료) 사용.

---

## PIPA 처리방침 업데이트 필요

이 셋업 적용 후 BlackPick 개인정보처리방침 (`/[locale]/privacy` 페이지)에 다음 추가:

### 개인정보 처리위탁 (제26조)

| 수탁자 | 위탁업무 내용 |
|---|---|
| Resend, Inc. | 이메일 발송 (인증 메일, 피드백 처리 알림) |
| Cloudflare, Inc. | 이메일 수신 라우팅 |
| Google LLC (Gmail) | 이메일 저장 및 처리 (운영진 대응) |

### 개인정보보호책임자 (제30조)

- 이름: Sean (ylee178)
- 연락처: `privacy@blackpick.io`

---

## Cost projection

| 구성 요소 | 무료 티어 한도 | BlackPick 예상 월간 | 비용 |
|---|---|---|---|
| Cloudflare Email Routing | 무제한 inbound | ~100 inbound | **$0** |
| Resend | 3000 emails/mo | ~600 (auth + feedback + alerts) | **$0** |
| Gmail | 15 GB storage | ~2 GB | **$0** |
| **Total** | — | — | **$0/mo** |

유저 5만 이상 / 월 3000+ 메일 넘어가면 Resend Pro ($20/mo, 50k emails)로 업그레이드. 그 구간까지는 완전 무료.

---

## Next steps after this guide is executed

1. `feature/feedback-email-relay` 브랜치 — Resend API 이용한 피드백 relay 구현
2. `feature/sentry-setup` 브랜치 — `@sentry/nextjs` 설치 + Sentry 네이티브 이메일 알림을 `admin@blackpick.io`로 설정
3. (optional) PIPA 처리방침 페이지 업데이트 커밋

---

## References

- Cloudflare Email Routing docs: https://developers.cloudflare.com/email-routing/
- Resend Node SDK: https://resend.com/docs/send-with-nodejs
- Resend SMTP: https://resend.com/docs/send-with-smtp
- Supabase Custom SMTP: https://supabase.com/docs/guides/auth/auth-smtp
- Gmail Send As: https://support.google.com/mail/answer/22370
- PIPA 개인정보보호법 원문: https://www.law.go.kr/법령/개인정보보호법
