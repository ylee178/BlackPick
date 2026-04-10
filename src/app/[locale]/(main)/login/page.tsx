"use client";

import { useSearchParams } from "next/navigation";
import { buildLocalizedAuthPath, getSafeAuthNext } from "@/lib/auth-next";
import { useI18n } from "@/lib/i18n-provider";
import SignInCard from "@/components/auth/SignInCard";

function mapLoginErrorCode(
  code: string | null,
  t: (key: string) => string,
): string | null {
  if (!code) return null;
  switch (code) {
    case "oauth_exchange_failed":
    case "oauth_callback_missing":
      return t("auth.oauthCallbackFailed");
    default:
      return t("auth.authUnexpected");
  }
}

export default function LoginPage() {
  const searchParams = useSearchParams();
  const { t, locale } = useI18n();
  const nextPath = getSafeAuthNext(searchParams.get("next"));
  const initialError = mapLoginErrorCode(searchParams.get("error"), t);

  return (
    <div className="flex w-full flex-1 items-center justify-center">
      <SignInCard
        eyebrow={t("auth.loginEyebrow")}
        title={t("auth.loginTitle")}
        description={t("auth.loginDescription")}
        redirectTo={nextPath}
        showSignupLink
        signupHref={buildLocalizedAuthPath("signup", locale, nextPath)}
        initialError={initialError}
        className="w-full max-w-md"
      />
    </div>
  );
}
