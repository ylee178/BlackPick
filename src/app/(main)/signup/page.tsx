"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createBrowserSupabaseClient } from "@/lib/supabase";

export default function SignupPage() {
  const router = useRouter();
  const supabase = createBrowserSupabaseClient();

  const [ringName, setRingName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSignup = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const origin = window.location.origin;

    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${origin}/profile`,
        data: {
          ring_name: ringName,
        },
      },
    });

    setLoading(false);

    if (error) {
      setError(error.message);
      return;
    }

    router.push("/profile");
    router.refresh();
  };

  const handleGoogleSignup = async () => {
    setGoogleLoading(true);
    setError(null);

    const origin = window.location.origin;
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${origin}/profile`,
        queryParams: {
          access_type: "offline",
          prompt: "consent",
        },
      },
    });

    if (error) {
      setError(error.message);
      setGoogleLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-gray-950 px-4 py-8 text-white">
      <div className="mx-auto max-w-md rounded-2xl border border-gray-800 bg-gray-900/70 p-6 shadow-xl">
        <div className="mb-6 text-center">
          <p className="text-sm uppercase tracking-[0.2em] text-amber-400">
            Join Black Pick
          </p>
          <h1 className="mt-2 text-3xl font-extrabold">Create Account</h1>
          <p className="mt-2 text-sm text-gray-400">
            Pick fights. Build streaks. Climb the rankings.
          </p>
        </div>

        <form onSubmit={handleSignup} className="space-y-4">
          <div>
            <label className="mb-2 block text-sm font-medium text-gray-300">
              Ring Name
            </label>
            <input
              type="text"
              required
              value={ringName}
              onChange={(e) => setRingName(e.target.value)}
              className="w-full rounded-xl border border-gray-800 bg-gray-950 px-4 py-3 text-white outline-none transition placeholder:text-gray-400 focus:border-amber-400"
              placeholder="The Underdog"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-gray-300">
              Email
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-xl border border-gray-800 bg-gray-950 px-4 py-3 text-white outline-none transition placeholder:text-gray-400 focus:border-amber-400"
              placeholder="you@example.com"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-gray-300">
              Password
            </label>
            <input
              type="password"
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-xl border border-gray-800 bg-gray-950 px-4 py-3 text-white outline-none transition placeholder:text-gray-400 focus:border-amber-400"
              placeholder="Minimum 6 characters"
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
            {loading ? "Creating Account..." : "Sign Up"}
          </button>
        </form>

        <div className="my-5 flex items-center gap-3">
          <div className="h-px flex-1 bg-gray-800" />
          <span className="text-xs uppercase tracking-widest text-gray-400">or</span>
          <div className="h-px flex-1 bg-gray-800" />
        </div>

        <button
          type="button"
          onClick={handleGoogleSignup}
          disabled={googleLoading}
          className="w-full rounded-xl border border-gray-800 bg-gray-950 px-4 py-3 font-semibold text-white transition hover:border-gray-700 hover:bg-gray-900 disabled:cursor-not-allowed disabled:opacity-70"
        >
          {googleLoading ? "Redirecting..." : "Continue with Google"}
        </button>

        <p className="mt-6 text-center text-sm text-gray-400">
          Already have an account?{" "}
          <Link href="/login" className="font-semibold text-amber-400 hover:text-amber-300">
            Sign in
          </Link>
        </p>
      </div>
    </main>
  );
}
