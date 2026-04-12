"use client";

import { useMemo, useState, type ReactNode } from "react";
import { mapAuthErrorMessage } from "@/lib/auth-error";
import { buildOAuthCallbackPath } from "@/lib/auth/oauth-redirect";
import { buildAuthRedirectUrl } from "@/lib/auth-redirect";
import { useI18n } from "@/lib/i18n-provider";
import { createBrowserSupabaseClient } from "@/lib/supabase";
import { retroButtonClassName } from "@/components/ui/retro";
import LoadingButtonContent from "@/components/ui/LoadingButtonContent";

type SocialProvider = "google" | "facebook";

type SocialAuthButtonsProps = {
  redirectTo: string;
  onError?: (message: string | null) => void;
  onStart?: () => void;
};

function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-[18px] w-[18px]" aria-hidden="true">
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4" />
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
    </svg>
  );
}

function FacebookIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-[18px] w-[18px]" aria-hidden="true">
      <path
        fill="#1877F2"
        d="M24 12.073C24 5.405 18.627 0 12 0S0 5.405 0 12.073c0 6.026 4.388 11.022 10.125 11.927v-8.437H7.078v-3.49h3.047V9.414c0-3.03 1.792-4.705 4.533-4.705 1.313 0 2.686.235 2.686.235v2.975H15.83c-1.49 0-1.955.93-1.955 1.886v2.268h3.328l-.532 3.49h-2.796V24C19.612 23.095 24 18.099 24 12.073z"
      />
    </svg>
  );
}

const ALL_PROVIDERS: Array<{
  provider: SocialProvider;
  icon: ReactNode;
  labelKey: "auth.googleLogin" | "auth.facebookLogin";
}> = [
  { provider: "google", icon: <GoogleIcon />, labelKey: "auth.googleLogin" },
  { provider: "facebook", icon: <FacebookIcon />, labelKey: "auth.facebookLogin" },
];

export default function SocialAuthButtons({
  redirectTo,
  onError,
  onStart,
}: SocialAuthButtonsProps) {
  const supabase = useMemo(() => createBrowserSupabaseClient(), []);
  const { t } = useI18n();
  const [loadingProvider, setLoadingProvider] = useState<SocialProvider | null>(null);

  // Facebook is hidden until Meta App Review is approved and the provider
  // credentials are wired into Supabase. To reveal the button, set
  // NEXT_PUBLIC_ENABLE_FACEBOOK_LOGIN=true in Vercel env (no code redeploy
  // needed — the var is baked into the client bundle at build time, so a
  // redeploy IS required, but no code change).
  //
  // The flag is read inside the component (not at module scope) so that
  // vi.stubEnv in unit tests actually takes effect before the component
  // renders; module-level reads run before any test setup.
  const providers = useMemo(() => {
    const facebookEnabled =
      process.env.NEXT_PUBLIC_ENABLE_FACEBOOK_LOGIN === "true";
    return ALL_PROVIDERS.filter(
      (p) => p.provider !== "facebook" || facebookEnabled,
    );
  }, []);

  async function handleOAuth(provider: SocialProvider) {
    // Top-of-handler guard prevents racing a second click before React
    // commits the disabled state from a previous click.
    if (loadingProvider !== null) return;

    setLoadingProvider(provider);
    onStart?.();
    onError?.(null);

    // The contract for this URL — must hit /api/auth/callback (PKCE), must
    // not double-prefix locale, must reject open redirects — is enforced by
    // src/lib/auth/oauth-redirect.ts and its accompanying unit tests.
    const callbackPath = buildOAuthCallbackPath(redirectTo);

    const options: Parameters<typeof supabase.auth.signInWithOAuth>[0]["options"] = {
      redirectTo: buildAuthRedirectUrl(callbackPath, {
        fallbackOrigin: window.location.origin,
        localize: false,
        preferFallbackOrigin: true,
      }),
    };

    if (provider === "google") {
      options.queryParams = {
        access_type: "offline",
        prompt: "consent",
      };
    }

    const { error } = await supabase.auth.signInWithOAuth({
      provider,
      options,
    });

    if (error) {
      onError?.(mapAuthErrorMessage(error.message, t));
      setLoadingProvider(null);
    }
  }

  return (
    <div className="space-y-2">
      {providers.map(({ provider, icon, labelKey }) => (
        <button
          key={provider}
          type="button"
          onClick={() => void handleOAuth(provider)}
          disabled={loadingProvider !== null}
          aria-busy={loadingProvider === provider}
          className={retroButtonClassName({ variant: "secondary", block: true })}
        >
          <LoadingButtonContent
            loading={loadingProvider === provider}
            loadingLabel={t("auth.redirecting")}
            icon={icon}
          >
            {t(labelKey)}
          </LoadingButtonContent>
        </button>
      ))}
    </div>
  );
}
