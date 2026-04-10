import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// Enable the Facebook button for every test in this suite. In production
// this flag is off until the Meta App Review is approved; the test file
// covers both providers because the button wiring is the same regardless
// of the current deployment's environment state.
vi.stubEnv("NEXT_PUBLIC_ENABLE_FACEBOOK_LOGIN", "true");

// Mock the i18n provider so the component can render without an I18nProvider
// wrapper. We return the key as the translation so assertions can match by key.
vi.mock("@/lib/i18n-provider", () => ({
  useI18n: () => ({ t: (key: string) => key, locale: "en" }),
}));

// Mock auth-redirect to a deterministic absolute URL so we don't depend on
// process.env or window.location specifics inside this unit test.
vi.mock("@/lib/auth-redirect", () => ({
  buildAuthRedirectUrl: (path: string) => `https://test.invalid${path}`,
}));

// Mock the Supabase browser client so we can intercept signInWithOAuth and
// assert exactly how the component calls it. This is the core of the contract.
const signInWithOAuthMock = vi.fn();
vi.mock("@/lib/supabase", () => ({
  createBrowserSupabaseClient: () => ({
    auth: {
      signInWithOAuth: signInWithOAuthMock,
    },
  }),
}));

// Stub LoadingButtonContent to render its children for predictable querying.
vi.mock("@/components/ui/LoadingButtonContent", () => ({
  default: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

import SocialAuthButtons from "./SocialAuthButtons";

beforeEach(() => {
  signInWithOAuthMock.mockReset();
  signInWithOAuthMock.mockResolvedValue({ data: { url: "ignored" }, error: null });
});

afterEach(() => {
  vi.clearAllMocks();
});

describe("<SocialAuthButtons /> contract", () => {
  it("renders both Google and Facebook buttons", () => {
    render(<SocialAuthButtons redirectTo="/" />);
    expect(screen.getByRole("button", { name: /auth\.googleLogin/ })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /auth\.facebookLogin/ })).toBeInTheDocument();
  });

  it("clicking Google calls signInWithOAuth with provider=google and a callback URL", async () => {
    const user = userEvent.setup();
    render(<SocialAuthButtons redirectTo="/" />);

    await user.click(screen.getByRole("button", { name: /auth\.googleLogin/ }));

    expect(signInWithOAuthMock).toHaveBeenCalledTimes(1);
    const arg = signInWithOAuthMock.mock.calls[0][0];
    expect(arg.provider).toBe("google");
    // Regression guard: must hit /api/auth/callback, NOT a destination page directly.
    expect(arg.options.redirectTo).toContain("/api/auth/callback");
    // Google must request offline access + consent prompt (refresh token).
    expect(arg.options.queryParams).toEqual({
      access_type: "offline",
      prompt: "consent",
    });
  });

  it("clicking Facebook calls signInWithOAuth with provider=facebook and NO Google query params", async () => {
    const user = userEvent.setup();
    render(<SocialAuthButtons redirectTo="/" />);

    await user.click(screen.getByRole("button", { name: /auth\.facebookLogin/ }));

    expect(signInWithOAuthMock).toHaveBeenCalledTimes(1);
    const arg = signInWithOAuthMock.mock.calls[0][0];
    expect(arg.provider).toBe("facebook");
    expect(arg.options.redirectTo).toContain("/api/auth/callback");
    expect(arg.options.queryParams).toBeUndefined();
  });

  it("preserves the original destination as the next query parameter", async () => {
    const user = userEvent.setup();
    render(<SocialAuthButtons redirectTo="/en/dashboard" />);

    await user.click(screen.getByRole("button", { name: /auth\.googleLogin/ }));

    const arg = signInWithOAuthMock.mock.calls[0][0];
    // The next param should round-trip to /en/dashboard, NOT /en/en/dashboard.
    // This is the regression guard for the locale double-prefix bug.
    expect(arg.options.redirectTo).toContain("next=%2Fen%2Fdashboard");
    expect(arg.options.redirectTo).not.toContain("/en/en/");
  });

  it("does not double-prefix when starting from a locale-prefixed homepage", async () => {
    const user = userEvent.setup();
    render(<SocialAuthButtons redirectTo="/en" />);

    await user.click(screen.getByRole("button", { name: /auth\.googleLogin/ }));

    const arg = signInWithOAuthMock.mock.calls[0][0];
    expect(arg.options.redirectTo).toContain("next=%2Fen");
    expect(arg.options.redirectTo).not.toContain("next=%2Fen%2Fen");
  });

  it("falls back to '/' when given an unsafe redirectTo (open redirect protection)", async () => {
    const user = userEvent.setup();
    render(<SocialAuthButtons redirectTo="//evil.com" />);

    await user.click(screen.getByRole("button", { name: /auth\.googleLogin/ }));

    const arg = signInWithOAuthMock.mock.calls[0][0];
    expect(arg.options.redirectTo).toContain("next=%2F");
    expect(arg.options.redirectTo).not.toContain("evil.com");
  });

  it("ignores rapid double-clicks (one provider call only)", async () => {
    const user = userEvent.setup();
    render(<SocialAuthButtons redirectTo="/" />);

    const button = screen.getByRole("button", { name: /auth\.googleLogin/ });
    await user.click(button);
    await user.click(button); // second click should be a no-op

    // Note: this asserts the top-of-handler guard. Even if React hasn't
    // committed the disabled state yet, handleOAuth should bail.
    expect(signInWithOAuthMock).toHaveBeenCalledTimes(1);
  });

  it("calls onError with a mapped message when the SDK errors", async () => {
    signInWithOAuthMock.mockResolvedValue({
      data: null,
      error: { message: "Provider is not enabled" },
    });
    const onError = vi.fn();
    const user = userEvent.setup();
    render(<SocialAuthButtons redirectTo="/" onError={onError} />);

    await user.click(screen.getByRole("button", { name: /auth\.googleLogin/ }));

    // mapAuthErrorMessage maps "provider is not enabled" → t("auth.providerUnavailable")
    expect(onError).toHaveBeenCalledWith("auth.providerUnavailable");
  });
});

describe("<SocialAuthButtons /> Facebook feature flag", () => {
  it("hides the Facebook button when NEXT_PUBLIC_ENABLE_FACEBOOK_LOGIN is not 'true'", () => {
    vi.stubEnv("NEXT_PUBLIC_ENABLE_FACEBOOK_LOGIN", "");
    render(<SocialAuthButtons redirectTo="/" />);
    expect(screen.getByRole("button", { name: /auth\.googleLogin/ })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /auth\.facebookLogin/ })).not.toBeInTheDocument();
    vi.stubEnv("NEXT_PUBLIC_ENABLE_FACEBOOK_LOGIN", "true"); // restore for other suites
  });

  it("hides the Facebook button when the env var is the literal string 'false'", () => {
    vi.stubEnv("NEXT_PUBLIC_ENABLE_FACEBOOK_LOGIN", "false");
    render(<SocialAuthButtons redirectTo="/" />);
    expect(screen.queryByRole("button", { name: /auth\.facebookLogin/ })).not.toBeInTheDocument();
    vi.stubEnv("NEXT_PUBLIC_ENABLE_FACEBOOK_LOGIN", "true");
  });
});
