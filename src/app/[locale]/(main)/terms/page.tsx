import { retroPanelClassName } from "@/components/ui/retro";
import { getTranslations } from "@/lib/i18n-server";

export default async function TermsPage() {
  const { locale } = await getTranslations();
  const isKo = locale === "ko";

  return (
    <div className="mx-auto max-w-3xl flex flex-col gap-10">
      <h1 className="text-[32px] font-bold">
        {isKo ? "이용약관" : "Terms of Service"}
      </h1>

      <div className={retroPanelClassName({ className: "flex flex-col gap-8 text-[var(--bp-muted)] text-[15px] leading-relaxed" })}>

        <section>
          <h2 className="text-lg font-semibold text-[var(--bp-ink)] mb-3">
            {isKo ? "제1조 (목적)" : "Article 1 (Purpose)"}
          </h2>
          <p>
            {isKo
              ? "이 약관은 BlackPick(이하 \"서비스\")이 제공하는 격투기 경기 예측 서비스의 이용 조건 및 절차, 서비스와 이용자의 권리·의무·책임사항을 규정합니다."
              : "These Terms govern the conditions, procedures, rights, obligations, and responsibilities related to the use of the combat sports prediction service provided by BlackPick (the \"Service\")."}
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-[var(--bp-ink)] mb-3">
            {isKo ? "제2조 (정의)" : "Article 2 (Definitions)"}
          </h2>
          <ul className="list-disc pl-5 flex flex-col gap-2">
            <li>
              {isKo
                ? "\"이용자\"란 이 약관에 동의하고 서비스를 이용하는 회원을 말합니다."
                : "\"User\" refers to a member who agrees to these Terms and uses the Service."}
            </li>
            <li>
              {isKo
                ? "\"예측\"이란 이용자가 격투기 경기 결과를 예상하여 입력하는 행위를 말합니다."
                : "\"Prediction\" refers to the act of a User submitting their forecast of a combat sports match result."}
            </li>
            <li>
              {isKo
                ? "\"포인트\"란 예측 결과에 따라 부여되는 서비스 내 가상 점수를 말합니다."
                : "\"Points\" refer to the virtual score awarded within the Service based on prediction outcomes."}
            </li>
          </ul>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-[var(--bp-ink)] mb-3">
            {isKo ? "제3조 (약관의 효력 및 변경)" : "Article 3 (Effect and Amendments)"}
          </h2>
          <p>
            {isKo
              ? "본 약관은 서비스 화면에 게시하거나 기타의 방법으로 이용자에게 공지함으로써 효력이 발생합니다. 서비스는 합리적인 사유가 발생할 경우 약관을 변경할 수 있으며, 변경된 약관은 공지 후 7일이 경과한 날부터 적용됩니다."
              : "These Terms take effect when posted on the Service or otherwise notified to Users. The Service may amend these Terms for reasonable cause, and amendments take effect 7 days after notice."}
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-[var(--bp-ink)] mb-3">
            {isKo ? "제4조 (회원가입 및 계정)" : "Article 4 (Registration and Accounts)"}
          </h2>
          <ul className="list-disc pl-5 flex flex-col gap-2">
            <li>
              {isKo
                ? "회원가입은 이메일/비밀번호 또는 Google 계정 연동을 통해 이루어집니다."
                : "Registration is completed via email/password or Google account authentication."}
            </li>
            <li>
              {isKo
                ? "이용자는 하나의 계정만 사용해야 하며, 다중 계정 사용 시 서비스 이용이 제한될 수 있습니다."
                : "Users must use only one account. Use of multiple accounts may result in service restrictions."}
            </li>
            <li>
              {isKo
                ? "이용자는 자신의 계정 정보를 안전하게 관리할 책임이 있습니다."
                : "Users are responsible for keeping their account credentials secure."}
            </li>
          </ul>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-[var(--bp-ink)] mb-3">
            {isKo ? "제5조 (서비스의 내용)" : "Article 5 (Service Description)"}
          </h2>
          <ul className="list-disc pl-5 flex flex-col gap-2">
            <li>
              {isKo
                ? "격투기(UFC 등) 경기 결과 예측 및 포인트 랭킹 시스템"
                : "Combat sports (UFC, etc.) match result prediction and point ranking system"}
            </li>
            <li>
              {isKo
                ? "선수 정보 열람, 경기 댓글 및 커뮤니티 기능"
                : "Fighter information, match comments, and community features"}
            </li>
            <li>
              {isKo
                ? "개인 전적 분석 및 통계 제공"
                : "Personal record analysis and statistics"}
            </li>
            <li>
              {isKo
                ? "본 서비스는 도박 또는 금전적 보상과 무관한 순수 예측 게임입니다."
                : "This Service is a purely predictive game unrelated to gambling or monetary rewards."}
            </li>
          </ul>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-[var(--bp-ink)] mb-3">
            {isKo ? "제6조 (이용자의 의무)" : "Article 6 (User Obligations)"}
          </h2>
          <p className="mb-2">{isKo ? "이용자는 다음 행위를 해서는 안 됩니다:" : "Users must not:"}</p>
          <ul className="list-disc pl-5 flex flex-col gap-2">
            <li>{isKo ? "타인의 계정을 도용하거나 개인정보를 부정하게 수집하는 행위" : "Steal or misuse another person's account or personal information"}</li>
            <li>{isKo ? "서비스의 운영을 방해하거나 시스템에 부하를 주는 행위" : "Interfere with service operations or cause excessive system load"}</li>
            <li>{isKo ? "욕설, 혐오 표현, 스팸 등 다른 이용자에게 불쾌감을 주는 행위" : "Post profanity, hate speech, spam, or other content that offends other Users"}</li>
            <li>{isKo ? "자동화 도구(봇)를 이용한 예측 조작 행위" : "Manipulate predictions using automated tools (bots)"}</li>
          </ul>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-[var(--bp-ink)] mb-3">
            {isKo ? "제7조 (서비스 이용 제한)" : "Article 7 (Service Restrictions)"}
          </h2>
          <p>
            {isKo
              ? "서비스는 이용자가 본 약관을 위반하거나 서비스의 정상적인 운영을 방해하는 경우 사전 통지 없이 서비스 이용을 제한하거나 계정을 정지할 수 있습니다."
              : "The Service may restrict usage or suspend accounts without prior notice if a User violates these Terms or disrupts normal service operations."}
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-[var(--bp-ink)] mb-3">
            {isKo ? "제8조 (면책 조항)" : "Article 8 (Disclaimer)"}
          </h2>
          <ul className="list-disc pl-5 flex flex-col gap-2">
            <li>
              {isKo
                ? "서비스는 경기 결과의 정확성을 보증하지 않으며, 이용자의 예측으로 인한 어떠한 손실에 대해서도 책임을 지지 않습니다."
                : "The Service does not guarantee the accuracy of match results and bears no responsibility for any losses arising from User predictions."}
            </li>
            <li>
              {isKo
                ? "천재지변, 시스템 장애 등 불가항력적 사유로 인한 서비스 중단에 대해 책임을 지지 않습니다."
                : "The Service is not liable for interruptions caused by force majeure such as natural disasters or system failures."}
            </li>
            <li>
              {isKo
                ? "서비스 내 포인트 및 랭킹은 현금 가치가 없으며, 환전·양도가 불가합니다."
                : "Points and rankings within the Service have no monetary value and cannot be exchanged or transferred."}
            </li>
          </ul>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-[var(--bp-ink)] mb-3">
            {isKo ? "제9조 (지적재산권)" : "Article 9 (Intellectual Property)"}
          </h2>
          <p>
            {isKo
              ? "서비스에 포함된 픽셀 아트, 디자인, 소프트웨어 등 모든 콘텐츠의 저작권은 서비스 운영자에게 있습니다. 이용자가 작성한 댓글 및 예측 데이터는 서비스 운영 목적으로 사용될 수 있습니다."
              : "All content including pixel art, design, and software within the Service is owned by the Service operator. Comments and prediction data submitted by Users may be used for service operation purposes."}
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-[var(--bp-ink)] mb-3">
            {isKo ? "제10조 (준거법 및 관할)" : "Article 10 (Governing Law and Jurisdiction)"}
          </h2>
          <p>
            {isKo
              ? "본 약관은 대한민국 법률에 따라 해석되며, 서비스 관련 분쟁은 서울중앙지방법원을 제1심 관할법원으로 합니다."
              : "These Terms shall be governed by the laws of the Republic of Korea, and the Seoul Central District Court shall have exclusive jurisdiction over any disputes."}
          </p>
        </section>

        <p className="text-sm text-[var(--bp-muted)]">
          {isKo ? "시행일: 2026년 4월 8일" : "Effective: April 8, 2026"}
        </p>
      </div>
    </div>
  );
}
