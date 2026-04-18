import { Info } from "lucide-react";
import { retroPanelClassName } from "@/components/ui/retro";
import { getTranslations } from "@/lib/i18n-server";

const sectionClassName =
  "flex flex-col gap-3 text-[var(--bp-muted)] text-[15px] leading-relaxed";

const sectionHeadingClassName = "text-base font-semibold text-[var(--bp-ink)]";

const sectionListClassName = "list-disc pl-5 flex flex-col gap-2";

const articleClassName =
  "mt-4 flex flex-col [&>section~section]:mt-10 [&>section~section]:border-t [&>section~section]:border-[var(--bp-line)] [&>section~section]:pt-10";

export default async function TermsPage() {
  const { locale, t } = await getTranslations();
  const isKo = locale === "ko";

  return (
    <div className="mx-auto max-w-3xl flex flex-col gap-4">
      <h1 className="text-[32px] font-bold mb-2">
        {isKo ? "이용약관" : "Terms of Service"}
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
        <h2 className={sectionHeadingClassName}>
          {isKo ? "제1조 (목적)" : "Article 1 (Purpose)"}
        </h2>
        <p>
          {isKo
            ? "이 약관은 BlackPick(이하 \"서비스\")이 제공하는 격투기 경기 예측 서비스의 이용 조건 및 절차, 서비스와 이용자의 권리·의무·책임사항을 규정합니다."
            : "These Terms govern the conditions, procedures, rights, obligations, and responsibilities related to the use of the combat sports prediction service provided by BlackPick (the \"Service\")."}
        </p>
      </section>

      <section className={sectionClassName}>
        <h2 className={sectionHeadingClassName}>
          {isKo ? "제2조 (정의)" : "Article 2 (Definitions)"}
        </h2>
        <ul className={sectionListClassName}>
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

      <section className={sectionClassName}>
        <h2 className={sectionHeadingClassName}>
          {isKo ? "제3조 (약관 및 서비스의 변경)" : "Article 3 (Changes to the Terms and the Service)"}
        </h2>
        <p>
          {isKo
            ? "본 약관은 서비스 화면에 게시하거나 기타의 방법으로 이용자에게 공지함으로써 효력이 발생합니다. 서비스는 합리적인 사유가 발생할 경우 약관을 변경할 수 있으며, 변경된 약관은 공지 후 7일이 경과한 날부터 적용됩니다."
            : "These Terms take effect when posted on the Service or otherwise notified to Users. The Service may amend these Terms for reasonable cause, and amendments take effect 7 days after notice."}
        </p>
        <p>
          {isKo
            ? "서비스는 운영상 또는 기술상의 사유로 서비스의 일부 또는 전부를 사전 통지 없이 언제든지 변경하거나 종료할 수 있습니다."
            : "The Service may modify or discontinue the Service, in whole or in part, at any time without prior notice for operational or technical reasons."}
        </p>
      </section>

      <section className={sectionClassName}>
        <h2 className={sectionHeadingClassName}>
          {isKo ? "제4조 (회원가입 및 계정)" : "Article 4 (Registration and Accounts)"}
        </h2>
        <ul className={sectionListClassName}>
          <li>
            {isKo
              ? "이용자는 만 18세 이상이거나 거주 관할의 법정 성인 연령 이상이어야 합니다."
              : "Users must be at least 18 years old or the legal age of majority in their jurisdiction."}
          </li>
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

      <section className={sectionClassName}>
        <h2 className={sectionHeadingClassName}>
          {isKo ? "제5조 (서비스의 내용)" : "Article 5 (Service Description)"}
        </h2>
        <ul className={sectionListClassName}>
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

      <section className={sectionClassName}>
        <h2 className={sectionHeadingClassName}>
          {isKo ? "제6조 (이용자의 의무)" : "Article 6 (User Obligations)"}
        </h2>
        <p>{isKo ? "이용자는 다음 행위를 해서는 안 됩니다:" : "Users must not:"}</p>
        <ul className={sectionListClassName}>
          <li>
            {isKo
              ? "타인의 계정을 도용하거나 개인정보를 부정하게 수집하는 행위"
              : "Steal or misuse another person's account or personal information"}
          </li>
          <li>
            {isKo
              ? "서비스의 운영을 방해하거나 시스템에 부하를 주는 행위"
              : "Interfere with service operations or cause excessive system load"}
          </li>
          <li>
            {isKo
              ? "욕설, 혐오 표현, 스팸 등 다른 이용자에게 불쾌감을 주는 행위"
              : "Post profanity, hate speech, spam, or other content that offends other Users"}
          </li>
          <li>
            {isKo
              ? "자동화 도구(봇)를 이용한 예측 조작 행위"
              : "Manipulate predictions using automated tools (bots)"}
          </li>
        </ul>
      </section>

      <section className={sectionClassName}>
        <h2 className={sectionHeadingClassName}>
          {isKo ? "제7조 (서비스 이용 제한 및 계정 종료)" : "Article 7 (Service Restrictions and Account Termination)"}
        </h2>
        <p>
          {isKo
            ? "서비스는 이용자가 본 약관을 위반하거나 서비스의 정상적인 운영을 방해하는 경우 사전 통지 없이 서비스 이용을 제한하거나 계정을 정지·종료할 수 있습니다."
            : "The Service may restrict usage or suspend or terminate accounts without prior notice if a User violates these Terms or disrupts normal service operations."}
        </p>
        <p>
          {isKo
            ? "이용자는 언제든지 계정 삭제를 요청할 수 있으며, 삭제 절차 및 데이터 처리 범위는 개인정보처리방침에 따릅니다."
            : "Users may request account deletion at any time; the deletion procedure and scope of data handling are governed by the Privacy Policy."}
        </p>
      </section>

      <section className={sectionClassName}>
        <h2 className={sectionHeadingClassName}>
          {isKo ? "제8조 (면책 조항)" : "Article 8 (Disclaimer)"}
        </h2>
        <ul className={sectionListClassName}>
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
          <li>
            {isKo
              ? "서비스는 관련 법령이 허용하는 최대 범위 내에서, 이용자 또는 제3자가 입은 간접적·부수적·결과적·특별 손해에 대해 어떠한 책임도 지지 않습니다."
              : "To the maximum extent permitted by applicable law, the Service shall not be liable for any indirect, incidental, consequential, or special damages incurred by Users or third parties."}
          </li>
        </ul>
      </section>

      <section className={sectionClassName}>
        <h2 className={sectionHeadingClassName}>
          {isKo ? "제9조 (지적재산권)" : "Article 9 (Intellectual Property)"}
        </h2>
        <p>
          {isKo
            ? "서비스에 포함된 픽셀 아트, 디자인, 소프트웨어 등 모든 콘텐츠의 저작권은 서비스 운영자에게 있습니다. 이용자가 작성한 댓글 및 예측 데이터는 서비스 운영 목적으로 사용될 수 있습니다."
            : "All content including pixel art, design, and software within the Service is owned by the Service operator. Comments and prediction data submitted by Users may be used for service operation purposes."}
        </p>
      </section>

      <section className={sectionClassName}>
        <h2 className={sectionHeadingClassName}>
          {isKo ? "제10조 (개인정보의 보호)" : "Article 10 (Protection of Personal Information)"}
        </h2>
        <p>
          {isKo
            ? "이용자의 개인정보는 별도의 개인정보처리방침에 따라 수집·이용·보관·파기됩니다. 개인정보 관련 권리 및 처리 내역은 해당 방침에서 확인할 수 있습니다."
            : "User personal information is collected, used, retained, and deleted in accordance with the separate Privacy Policy. Related rights and processing details are set out in that Policy."}
        </p>
      </section>

      <section className={sectionClassName}>
        <h2 className={sectionHeadingClassName}>
          {isKo ? "제11조 (준거법 및 관할)" : "Article 11 (Governing Law and Jurisdiction)"}
        </h2>
        <p>
          {isKo
            ? "본 약관은 대한민국 법률에 따라 해석되며, 서비스 관련 분쟁은 서울중앙지방법원을 제1심 관할법원으로 합니다."
            : "These Terms shall be governed by the laws of the Republic of Korea, and the Seoul Central District Court shall have exclusive jurisdiction over any disputes."}
        </p>
      </section>
      </article>

      <p className="text-sm text-[var(--bp-muted)] mt-6">
        {isKo ? "시행일: 2026년 4월 18일" : "Effective: April 18, 2026"}
      </p>
    </div>
  );
}
