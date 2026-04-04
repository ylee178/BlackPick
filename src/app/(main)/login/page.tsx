"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createBrowserSupabaseClient } from "@/lib/supabase";
import { useI18n } from "@/lib/i18n-provider";
import { mapAuthErrorMessage } from "@/lib/auth-error";

export default function LoginPage() {
  const router = useRouter();
  const supabase = createBrowserSupabaseClient();
  const { t } = useI18n();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleLogin = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const { error } = await supabase.auth.signInWithPassword({
      email,
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

  const handleGoogleLogin = async () => {
    setGoogleLoading(true);
    setError(null);

    const origin = window.location.origin;
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${origin}/`,
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
            {t("auth.loginEyebrow")}
          </p>
          <h1 className="mt-2 text-3xl font-extrabold">{t("auth.loginTitle")}</h1>
          <p className="mt-2 text-sm text-gray-400">
            {t("auth.loginDescription")}
          </p>
        </div>

        <form onSubmit={handleLogin} className="space-y-4">
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
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-xl border border-gray-800 bg-gray-950 px-4 py-3 text-white outline-none transition placeholder:text-gray-400 focus:border-amber-400"
              placeholder={t("auth.passwordPlaceholder")}
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
            {loading ? t("auth.signingIn") : t("auth.login")}
          </button>
        </form>

        <div className="my-5 flex items-center gap-3">
          <div className="h-px flex-1 bg-gray-800" />
          <span className="text-xs uppercase tracking-widest text-gray-400">{t("auth.or")}</span>
          <div className="h-px flex-1 bg-gray-800" />
        </div>

        <button
          type="button"
          onClick={handleGoogleLogin}
          disabled={googleLoading}
          className="w-full rounded-xl border border-gray-800 bg-gray-950 px-4 py-3 font-semibold text-white transition hover:border-gray-700 hover:bg-gray-900 disabled:cursor-not-allowed disabled:opacity-70"
        >
          {googleLoading ? t("auth.redirecting") : t("auth.googleLogin")}
        </button>

        <p className="mt-6 text-center text-sm text-gray-400">
          {t("auth.noAccount")}{" "}
          <Link href="/signup" className="font-semibold text-amber-400 hover:text-amber-300">
            {t("auth.signup")}
          </Link>
        </p>
      </div>
    </main>
  );
}
