"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createBrowserSupabaseClient } from "@/lib/supabase";
import { useI18n } from "@/lib/i18n-provider";
import { mapAuthErrorCode, mapAuthErrorMessage } from "@/lib/auth-error";

export default function SignupPage() {
  const router = useRouter();
  const supabase = createBrowserSupabaseClient();
  const { t } = useI18n();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSignup = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const normalizedEmail = email.trim().toLowerCase();

    const signupResponse = await fetch("/api/auth/signup", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        email: normalizedEmail,
        password,
      }),
    });

    const signupPayload = (await signupResponse.json().catch(() => null)) as
      | { code?: string }
      | null;

    if (!signupResponse.ok) {
      setLoading(false);
      setError(mapAuthErrorCode(signupPayload?.code, t));
      return;
    }

    const { error } = await supabase.auth.signInWithPassword({
      email: normalizedEmail,
      password,
    });

    setLoading(false);

    if (error) {
      setError(mapAuthErrorMessage(error.message, t));
      return;
    }

    router.push("/");
    router.refresh();
  };

  const handleGoogleSignup = async () => {
    setGoogleLoading(true);
    setError(null);

    const origin = window.location.origin;
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${origin}/`,
        queryParams: {
          access_type: "offline",
          prompt: "consent",
        },
      },
    });

    if (error) {
      setError(mapAuthErrorMessage(error.message, t));
      setGoogleLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-gray-950 px-4 py-8 text-white">
      <div className="mx-auto max-w-md rounded-2xl border border-gray-800 bg-gray-900/70 p-6 shadow-xl">
        <div className="mb-6 text-center">
          <p className="text-sm uppercase tracking-[0.2em] text-amber-400">
            {t("auth.signupEyebrow")}
          </p>
          <h1 className="mt-2 text-3xl font-extrabold">{t("auth.createAccount")}</h1>
          <p className="mt-2 text-sm text-gray-400">
            {t("auth.signupDescription")}
          </p>
        </div>

        <form onSubmit={handleSignup} className="space-y-4">
          <div>
            <label className="mb-2 block text-sm font-medium text-gray-300">
              {t("auth.email")}
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-xl border border-gray-800 bg-gray-950 px-4 py-3 text-white outline-none transition placeholder:text-gray-400 focus:border-amber-400"
              placeholder={t("auth.emailPlaceholder")}
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-gray-300">
              {t("auth.password")}
            </label>
            <input
              type="password"
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-xl border border-gray-800 bg-gray-950 px-4 py-3 text-white outline-none transition placeholder:text-gray-400 focus:border-amber-400"
              placeholder={t("auth.passwordHint")}
            />
          </div>

          {error ? (
            <div className="rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-300">
              {error}
            </div>
          ) : null}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-xl bg-amber-400 px-4 py-3 font-bold text-gray-950 transition hover:bg-amber-300 disabled:cursor-not-allowed disabled:opacity-70"
          >
            {loading ? t("auth.creatingAccount") : t("auth.signup")}
          </button>
        </form>

        <div className="my-5 flex items-center gap-3">
          <div className="h-px flex-1 bg-gray-800" />
          <span className="text-xs uppercase tracking-widest text-gray-400">{t("auth.or")}</span>
          <div className="h-px flex-1 bg-gray-800" />
        </div>

        <button
          type="button"
          onClick={handleGoogleSignup}
          disabled={googleLoading}
          className="w-full rounded-xl border border-gray-800 bg-gray-950 px-4 py-3 font-semibold text-white transition hover:border-gray-700 hover:bg-gray-900 disabled:cursor-not-allowed disabled:opacity-70"
        >
          {googleLoading ? t("auth.redirecting") : t("auth.googleLogin")}
        </button>

        <p className="mt-6 text-center text-sm text-gray-400">
          {t("auth.alreadyHaveAccount")}{" "}
          <Link href="/login" className="font-semibold text-amber-400 hover:text-amber-300">
            {t("auth.login")}
          </Link>
        </p>
      </div>
    </main>
  );
}
