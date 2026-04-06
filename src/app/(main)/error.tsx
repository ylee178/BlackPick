"use client";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="flex min-h-[50vh] items-center justify-center">
      <div className="rounded-2xl border border-red-500/20 bg-red-500/10 p-8 text-center">
        <h2 className="text-xl font-bold text-red-400">Something went wrong</h2>
        <p className="mt-2 text-sm text-gray-400">{error.message}</p>
        <button
          onClick={reset}
          className="mt-4 rounded-xl bg-amber-400 px-4 py-2 text-sm font-bold text-gray-950 hover:bg-amber-300"
        >
          Try again
        </button>
      </div>
    </div>
  );
}
