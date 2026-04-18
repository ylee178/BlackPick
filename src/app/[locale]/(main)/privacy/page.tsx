import { Info } from "lucide-react";
import { retroPanelClassName } from "@/components/ui/retro";
import { getTranslations } from "@/lib/i18n-server";

const sectionClassName =
  "flex flex-col gap-3 text-[var(--bp-muted)] text-[15px] leading-relaxed";

const sectionHeadingClassName = "text-base font-semibold text-[var(--bp-ink)]";

const subHeadingClassName = "text-[15px] font-semibold text-[var(--bp-ink)] mt-1";

const sectionListClassName = "list-disc pl-5 flex flex-col gap-1";

const articleClassName =
  "mt-4 flex flex-col [&>section~section]:mt-10 [&>section~section]:border-t [&>section~section]:border-[var(--bp-line)] [&>section~section]:pt-10";

export default async function PrivacyPage() {
  const { locale, t } = await getTranslations();
  const isKo = locale === "ko";

  return (
    <div className="mx-auto max-w-3xl flex flex-col gap-4">
      <h1 className="text-[32px] font-bold mb-2">
        {isKo ? "개인정보처리방침" : "Privacy Policy"}
      </h1>

      <div
        role="note"
        className={retroPanelClassName({
          tone: "accent",
          className:
            "flex items-start gap-3 p-4 sm:p-5 text-[15px] text-[var(--bp-ink)] leading-relaxed",
        })}
      >
        <Info
          className="h-5 w-5 shrink-0 text-[var(--bp-accent)] mt-0.5"
          aria-hidden
        />
        <p>{t("legal.fanMadeDisclaimer")}</p>
      </div>

      <article className={articleClassName}>
      <section className={sectionClassName}>
        <p>
          {isKo
            ? "BlackPick(이하 \"서비스\")은 「개인정보 보호법」에 따라 이용자의 개인정보를 보호하고 이와 관련한 고충을 신속하게 처리하기 위하여 다음과 같이 개인정보처리방침을 수립·공개합니다."
            : "BlackPick (the \"Service\") establishes and discloses the following Privacy Policy to protect Users' personal information and promptly handle related grievances in accordance with applicable laws."}
        </p>
      </section>

      <section className={sectionClassName}>
        <h2 className={sectionHeadingClassName}>
          {isKo ? "제1조 (수집하는 개인정보 항목)" : "Article 1 (Personal Information Collected)"}
        </h2>

        <h3 className={subHeadingClassName}>
          {isKo ? "가. 회원가입 시 (필수)" : "a. Upon Registration (Required)"}
        </h3>
        <ul className={sectionListClassName}>
          <li>{isKo ? "이메일 주소" : "Email address"}</li>
          <li>{isKo ? "비밀번호 (암호화 저장)" : "Password (stored encrypted)"}</li>
          <li>{isKo ? "링네임 (닉네임)" : "Ring name (nickname)"}</li>
        </ul>

        <h3 className={subHeadingClassName}>
          {isKo ? "나. Google 계정 연동 시" : "b. Google Account Authentication"}
        </h3>
        <ul className={sectionListClassName}>
          <li>
            {isKo
              ? "이메일 주소 (Google 프로필에서 제공)"
              : "Email address (from Google profile)"}
          </li>
        </ul>

        <h3 className={subHeadingClassName}>
          {isKo ? "다. 서비스 이용 중 자동 생성" : "c. Automatically Generated During Use"}
        </h3>
        <ul className={sectionListClassName}>
          <li>
            {isKo
              ? "예측 기록 (경기 결과 예측, 포인트, 전적)"
              : "Prediction records (match forecasts, points, record)"}
          </li>
          <li>{isKo ? "댓글 및 좋아요 내역" : "Comments and likes"}</li>
          <li>{isKo ? "MVP 투표 기록" : "MVP vote history"}</li>
          <li>{isKo ? "알림 수신 기록" : "Notification receipts"}</li>
          <li>
            {isKo
              ? "IP 주소 및 접속 로그 (보안 및 부정 이용 방지 목적)"
              : "IP address and access logs (for security and abuse prevention)"}
          </li>
        </ul>

        <h3 className={subHeadingClassName}>
          {isKo ? "라. 피드백 제출 시 (선택)" : "d. Upon Feedback Submission (Optional)"}
        </h3>
        <ul className={sectionListClassName}>
          <li>{isKo ? "피드백 내용 및 카테고리" : "Feedback message and category"}</li>
          <li>
            {isKo
              ? "연락받을 이메일 주소 (비로그인 사용자가 입력한 경우에 한함)"
              : "Contact email address (only if entered by a non-logged-in user)"}
          </li>
          <li>
            {isKo
              ? "제출 시 페이지 URL 및 브라우저 User-Agent (운영자 문맥용)"
              : "Page URL and browser User-Agent at submission (for operator context)"}
          </li>
        </ul>
      </section>

      <section className={sectionClassName}>
        <h2 className={sectionHeadingClassName}>
          {isKo ? "제2조 (개인정보의 수집·이용 목적)" : "Article 2 (Purpose of Collection and Use)"}
        </h2>
        <p>
          {isKo
            ? "서비스는 이용자의 동의 및 서비스 이용계약의 이행을 법적 근거로 하여 다음 목적에 한정하여 개인정보를 처리합니다."
            : "The Service processes personal information based on user consent and for the performance of the service contract, limited to the following purposes."}
        </p>
        <ul className="list-disc pl-5 flex flex-col gap-2">
          <li>
            {isKo
              ? "회원 식별 및 가입 의사 확인"
              : "User identification and registration verification"}
          </li>
          <li>
            {isKo
              ? "예측 서비스 제공, 포인트·랭킹 산출"
              : "Prediction service delivery, point and ranking calculation"}
          </li>
          <li>
            {isKo
              ? "커뮤니티 기능 (댓글, 멘션, MVP 투표) 제공"
              : "Community features (comments, mentions, MVP voting)"}
          </li>
          <li>
            {isKo
              ? "서비스 개선 및 부정 이용 방지"
              : "Service improvement and abuse prevention"}
          </li>
        </ul>
      </section>

      <section className={sectionClassName}>
        <h2 className={sectionHeadingClassName}>
          {isKo ? "제3조 (개인정보의 보유 및 이용 기간)" : "Article 3 (Retention Period)"}
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
          <li>
            {isKo
              ? "탈퇴 이후에도 예측 기록, 댓글 등 서비스 무결성 유지에 필요한 비식별 데이터는 이용자를 식별할 수 없도록 익명화된 형태로 계속 보관될 수 있습니다."
              : "After account deletion, non-identifiable data such as prediction records and comments may be retained in anonymized form to preserve service integrity."}
          </li>
          <li>
            {isKo
              ? "구체적 보관 기간은 법령상 의무 및 서비스 운영 필요에 따라 달라질 수 있습니다."
              : "Retention periods may vary depending on legal obligations and operational needs."}
          </li>
        </ul>
      </section>

      <section className={sectionClassName}>
        <h2 className={sectionHeadingClassName}>
          {isKo ? "제4조 (개인정보의 제3자 제공)" : "Article 4 (Disclosure to Third Parties)"}
        </h2>
        <p>
          {isKo
            ? "서비스는 이용자의 개인정보를 원칙적으로 외부에 제공하지 않습니다. 다만, 이용자가 동의한 경우 또는 법령에 의한 요청이 있는 경우에는 예외로 합니다."
            : "The Service does not disclose personal information to third parties in principle, except when the User consents or when required by law."}
        </p>
      </section>

      <section className={sectionClassName}>
        <h2 className={sectionHeadingClassName}>
          {isKo ? "제5조 (개인정보 처리 위탁)" : "Article 5 (Outsourced Processing)"}
        </h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="border-b border-[var(--bp-line)]">
                <th className="py-2 pr-4 text-left text-[var(--bp-ink)]">
                  {isKo ? "위탁 업체" : "Service Provider"}
                </th>
                <th className="py-2 text-left text-[var(--bp-ink)]">
                  {isKo ? "위탁 업무" : "Purpose"}
                </th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b border-[var(--bp-line)]">
                <td className="py-2 pr-4">Supabase Inc.</td>
                <td className="py-2">
                  {isKo ? "인증, 데이터베이스 호스팅" : "Authentication, database hosting"}
                </td>
              </tr>
              <tr className="border-b border-[var(--bp-line)]">
                <td className="py-2 pr-4">Google LLC</td>
                <td className="py-2">
                  {isKo ? "소셜 로그인 (OAuth)" : "Social login (OAuth)"}
                </td>
              </tr>
              <tr className="border-b border-[var(--bp-line)]">
                <td className="py-2 pr-4">Resend, Inc.</td>
                <td className="py-2">
                  {isKo ? "피드백 이메일 발송" : "Feedback email delivery"}
                </td>
              </tr>
              <tr className="border-b border-[var(--bp-line)]">
                <td className="py-2 pr-4">Cloudflare, Inc.</td>
                <td className="py-2">
                  {isKo ? "이메일 라우팅 (피드백 수신함)" : "Email routing (feedback inbox)"}
                </td>
              </tr>
              <tr className="border-b border-[var(--bp-line)]">
                <td className="py-2 pr-4">Google LLC (Gmail)</td>
                <td className="py-2">
                  {isKo ? "피드백 이메일 보관함" : "Feedback email inbox storage"}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      <section className={sectionClassName}>
        <h2 className={sectionHeadingClassName}>
          {isKo ? "제6조 (개인정보의 국외 이전)" : "Article 6 (International Data Transfer)"}
        </h2>
        <p>
          {isKo
            ? "서비스의 일부 위탁업체(Supabase, Google, Cloudflare, Resend 등)는 해외에 소재하므로, 이용자의 개인정보가 미국 등 이용자 관할 외 국가로 이전되어 처리될 수 있습니다. 이전되는 정보 항목, 이전 목적, 보유·이용 기간은 제5조 처리 위탁 표와 동일하며, 이용자의 개인정보는 동일한 수준의 안전성 확보 조치 하에 처리됩니다."
            : "Some service providers (Supabase, Google, Cloudflare, Resend) are located outside the user's jurisdiction, so personal information may be transferred to and processed in countries including the United States. The items transferred, the purpose, and the retention period match Article 5 above, and personal information is handled with equivalent security safeguards."}
        </p>
      </section>

      <section className={sectionClassName}>
        <h2 className={sectionHeadingClassName}>
          {isKo ? "제7조 (쿠키 사용)" : "Article 7 (Cookies)"}
        </h2>
        <p>
          {isKo
            ? "서비스는 로그인 세션 유지 및 보안을 위해 필수적인 Supabase 인증 쿠키를 사용합니다. 광고·추적 목적의 쿠키는 사용하지 않습니다. 브라우저 설정에서 쿠키를 차단할 수 있으나, 이 경우 로그인 기능이 제한됩니다."
            : "The Service uses Supabase authentication cookies that are essential for session management and security. No advertising or tracking cookies are used. You may block cookies in your browser settings, but this may restrict login functionality."}
        </p>
      </section>

      <section className={sectionClassName}>
        <h2 className={sectionHeadingClassName}>
          {isKo ? "제8조 (이용자의 권리)" : "Article 8 (User Rights)"}
        </h2>
        <ul className="list-disc pl-5 flex flex-col gap-2">
          <li>
            {isKo
              ? "개인정보 열람, 수정, 삭제 요청 권리"
              : "Right to access, modify, and delete personal information"}
          </li>
          <li>
            {isKo
              ? "회원 탈퇴를 통한 개인정보 처리 정지 요청 권리"
              : "Right to request cessation of processing through account deletion"}
          </li>
          <li>
            {isKo
              ? "관련 법령이 정한 범위 내에서 본인 개인정보의 사본 제공을 요청할 수 있는 권리"
              : "Where applicable, the right to request a copy (data export) of personal information"}
          </li>
          <li>
            {isKo
              ? "프로필 페이지에서 링네임을 직접 수정할 수 있습니다."
              : "You can edit your ring name directly on your profile page."}
          </li>
        </ul>
      </section>

      <section className={sectionClassName}>
        <h2 className={sectionHeadingClassName}>
          {isKo ? "제9조 (개인정보의 안전성 확보 조치)" : "Article 9 (Security Measures)"}
        </h2>
        <ul className="list-disc pl-5 flex flex-col gap-2">
          <li>
            {isKo
              ? "비밀번호 암호화 저장 (Supabase Auth)"
              : "Encrypted password storage (Supabase Auth)"}
          </li>
          <li>{isKo ? "HTTPS 암호화 통신" : "HTTPS encrypted communication"}</li>
          <li>
            {isKo
              ? "데이터베이스 접근 제어 (Row Level Security)"
              : "Database access control (Row Level Security)"}
          </li>
        </ul>
      </section>

      <section className={sectionClassName}>
        <h2 className={sectionHeadingClassName}>
          {isKo ? "제10조 (개인정보 보호책임자)" : "Article 10 (Data Protection Officer)"}
        </h2>
        <p>
          {isKo
            ? "개인정보 관련 문의사항은 아래 이메일로 연락해 주시기 바랍니다."
            : "For inquiries regarding personal information, please contact us at the email below."}
        </p>
        <p className="text-[var(--bp-ink)]">privacy@blackpick.io</p>
      </section>

      <section className={sectionClassName}>
        <h2 className={sectionHeadingClassName}>
          {isKo ? "제11조 (방침 변경)" : "Article 11 (Policy Changes)"}
        </h2>
        <p>
          {isKo
            ? "본 방침이 변경되는 경우 시행일 7일 전부터 서비스 내 공지를 통해 안내합니다."
            : "Any changes to this Policy will be announced within the Service at least 7 days before the effective date."}
        </p>
      </section>
      </article>

      <p className="text-sm text-[var(--bp-muted)] mt-6">
        {isKo ? "시행일: 2026년 4월 18일" : "Effective: April 18, 2026"}
      </p>
    </div>
  );
}
