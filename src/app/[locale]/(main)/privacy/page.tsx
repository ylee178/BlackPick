import { retroPanelClassName } from "@/components/ui/retro";
import { getTranslations } from "@/lib/i18n-server";

export default async function PrivacyPage() {
  const { locale } = await getTranslations();
  const isKo = locale === "ko";

  return (
    <div className="mx-auto max-w-3xl flex flex-col gap-10">
      <h1 className="text-[32px] font-bold">
        {isKo ? "개인정보처리방침" : "Privacy Policy"}
      </h1>

      <div className={retroPanelClassName({ className: "flex flex-col gap-8 text-[var(--bp-muted)] text-[15px] leading-relaxed" })}>

        <p>
          {isKo
            ? "BlackPick(이하 \"서비스\")은 「개인정보 보호법」에 따라 이용자의 개인정보를 보호하고 이와 관련한 고충을 신속하게 처리하기 위하여 다음과 같이 개인정보처리방침을 수립·공개합니다."
            : "BlackPick (the \"Service\") establishes and discloses the following Privacy Policy to protect Users' personal information and promptly handle related grievances in accordance with applicable laws."}
        </p>

        <section>
          <h2 className="text-lg font-semibold text-[var(--bp-ink)] mb-3">
            {isKo ? "1. 수집하는 개인정보 항목" : "1. Personal Information Collected"}
          </h2>

          <h3 className="text-[15px] font-semibold text-[var(--bp-ink)] mb-2">
            {isKo ? "가. 회원가입 시 (필수)" : "a. Upon Registration (Required)"}
          </h3>
          <ul className="list-disc pl-5 flex flex-col gap-1 mb-4">
            <li>{isKo ? "이메일 주소" : "Email address"}</li>
            <li>{isKo ? "비밀번호 (암호화 저장)" : "Password (stored encrypted)"}</li>
            <li>{isKo ? "링네임 (닉네임)" : "Ring name (nickname)"}</li>
          </ul>

          <h3 className="text-[15px] font-semibold text-[var(--bp-ink)] mb-2">
            {isKo ? "나. Google 계정 연동 시" : "b. Google Account Authentication"}
          </h3>
          <ul className="list-disc pl-5 flex flex-col gap-1 mb-4">
            <li>{isKo ? "이메일 주소 (Google 프로필에서 제공)" : "Email address (from Google profile)"}</li>
          </ul>

          <h3 className="text-[15px] font-semibold text-[var(--bp-ink)] mb-2">
            {isKo ? "다. 서비스 이용 중 자동 생성" : "c. Automatically Generated During Use"}
          </h3>
          <ul className="list-disc pl-5 flex flex-col gap-1">
            <li>{isKo ? "예측 기록 (경기 결과 예측, 포인트, 전적)" : "Prediction records (match forecasts, points, record)"}</li>
            <li>{isKo ? "댓글 및 좋아요 내역" : "Comments and likes"}</li>
            <li>{isKo ? "MVP 투표 기록" : "MVP vote history"}</li>
            <li>{isKo ? "알림 수신 기록" : "Notification receipts"}</li>
          </ul>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-[var(--bp-ink)] mb-3">
            {isKo ? "2. 개인정보의 수집·이용 목적" : "2. Purpose of Collection and Use"}
          </h2>
          <ul className="list-disc pl-5 flex flex-col gap-2">
            <li>{isKo ? "회원 식별 및 가입 의사 확인" : "User identification and registration verification"}</li>
            <li>{isKo ? "예측 서비스 제공, 포인트·랭킹 산출" : "Prediction service delivery, point and ranking calculation"}</li>
            <li>{isKo ? "커뮤니티 기능 (댓글, 멘션, MVP 투표) 제공" : "Community features (comments, mentions, MVP voting)"}</li>
            <li>{isKo ? "서비스 개선 및 부정 이용 방지" : "Service improvement and abuse prevention"}</li>
          </ul>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-[var(--bp-ink)] mb-3">
            {isKo ? "3. 개인정보의 보유 및 이용 기간" : "3. Retention Period"}
          </h2>
          <ul className="list-disc pl-5 flex flex-col gap-2">
            <li>
              {isKo
                ? "회원 탈퇴 시 지체 없이 파기합니다. 단, 관계 법령에 따라 보존할 의무가 있는 경우 해당 기간 동안 보관합니다."
                : "Personal information is deleted without delay upon account deletion. However, data may be retained for the period required by applicable laws."}
            </li>
            <li>
              {isKo
                ? "부정 이용 방지를 위해 탈퇴 후 30일간 이메일 주소를 보관할 수 있습니다."
                : "Email addresses may be retained for 30 days after account deletion to prevent abuse."}
            </li>
          </ul>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-[var(--bp-ink)] mb-3">
            {isKo ? "4. 개인정보의 제3자 제공" : "4. Disclosure to Third Parties"}
          </h2>
          <p>
            {isKo
              ? "서비스는 이용자의 개인정보를 원칙적으로 외부에 제공하지 않습니다. 다만, 이용자가 동의한 경우 또는 법령에 의한 요청이 있는 경우에는 예외로 합니다."
              : "The Service does not disclose personal information to third parties in principle, except when the User consents or when required by law."}
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-[var(--bp-ink)] mb-3">
            {isKo ? "5. 개인정보 처리 위탁" : "5. Outsourced Processing"}
          </h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="border-b border-[var(--bp-line)]">
                  <th className="py-2 pr-4 text-left text-[var(--bp-ink)]">{isKo ? "위탁 업체" : "Service Provider"}</th>
                  <th className="py-2 text-left text-[var(--bp-ink)]">{isKo ? "위탁 업무" : "Purpose"}</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b border-[var(--bp-line)]">
                  <td className="py-2 pr-4">Supabase Inc.</td>
                  <td className="py-2">{isKo ? "인증, 데이터베이스 호스팅" : "Authentication, database hosting"}</td>
                </tr>
                <tr className="border-b border-[var(--bp-line)]">
                  <td className="py-2 pr-4">Google LLC</td>
                  <td className="py-2">{isKo ? "소셜 로그인 (OAuth)" : "Social login (OAuth)"}</td>
                </tr>
                <tr className="border-b border-[var(--bp-line)]">
                  <td className="py-2 pr-4">Resend, Inc.</td>
                  <td className="py-2">{isKo ? "피드백 이메일 발송" : "Feedback email delivery"}</td>
                </tr>
                <tr className="border-b border-[var(--bp-line)]">
                  <td className="py-2 pr-4">Cloudflare, Inc.</td>
                  <td className="py-2">{isKo ? "이메일 라우팅 (피드백 수신함)" : "Email routing (feedback inbox)"}</td>
                </tr>
                <tr className="border-b border-[var(--bp-line)]">
                  <td className="py-2 pr-4">Google LLC (Gmail)</td>
                  <td className="py-2">{isKo ? "피드백 이메일 보관함" : "Feedback email inbox storage"}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-[var(--bp-ink)] mb-3">
            {isKo ? "6. 쿠키 사용" : "6. Cookies"}
          </h2>
          <p>
            {isKo
              ? "서비스는 로그인 세션 유지를 위해 Supabase 인증 쿠키를 사용합니다. 광고·추적 목적의 쿠키는 사용하지 않습니다. 브라우저 설정에서 쿠키를 차단할 수 있으나, 이 경우 로그인 기능이 제한됩니다."
              : "The Service uses Supabase authentication cookies solely for session management. No advertising or tracking cookies are used. You may block cookies in your browser settings, but this may restrict login functionality."}
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-[var(--bp-ink)] mb-3">
            {isKo ? "7. 이용자의 권리" : "7. User Rights"}
          </h2>
          <ul className="list-disc pl-5 flex flex-col gap-2">
            <li>{isKo ? "개인정보 열람, 수정, 삭제 요청 권리" : "Right to access, modify, and delete personal information"}</li>
            <li>{isKo ? "회원 탈퇴를 통한 개인정보 처리 정지 요청 권리" : "Right to request cessation of processing through account deletion"}</li>
            <li>
              {isKo
                ? "프로필 페이지에서 링네임을 직접 수정할 수 있습니다."
                : "You can edit your ring name directly on your profile page."}
            </li>
          </ul>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-[var(--bp-ink)] mb-3">
            {isKo ? "8. 개인정보의 안전성 확보 조치" : "8. Security Measures"}
          </h2>
          <ul className="list-disc pl-5 flex flex-col gap-2">
            <li>{isKo ? "비밀번호 암호화 저장 (Supabase Auth)" : "Encrypted password storage (Supabase Auth)"}</li>
            <li>{isKo ? "HTTPS 암호화 통신" : "HTTPS encrypted communication"}</li>
            <li>{isKo ? "데이터베이스 접근 제어 (Row Level Security)" : "Database access control (Row Level Security)"}</li>
          </ul>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-[var(--bp-ink)] mb-3">
            {isKo ? "9. 개인정보 보호책임자" : "9. Data Protection Officer"}
          </h2>
          <p>
            {isKo
              ? "개인정보 관련 문의사항은 아래 이메일로 연락해 주시기 바랍니다."
              : "For inquiries regarding personal information, please contact us at the email below."}
          </p>
          <p className="mt-2 text-[var(--bp-ink)]">blackpick.official@gmail.com</p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-[var(--bp-ink)] mb-3">
            {isKo ? "10. 방침 변경" : "10. Policy Changes"}
          </h2>
          <p>
            {isKo
              ? "본 방침이 변경되는 경우 시행일 7일 전부터 서비스 내 공지를 통해 안내합니다."
              : "Any changes to this Policy will be announced within the Service at least 7 days before the effective date."}
          </p>
        </section>

        <p className="text-sm text-[var(--bp-muted)]">
          {isKo ? "시행일: 2026년 4월 18일" : "Effective: April 18, 2026"}
        </p>
      </div>
    </div>
  );
}
