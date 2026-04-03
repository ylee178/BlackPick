import Link from "next/link";
import { ReactNode } from "react";

export default function MainLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-gray-950 text-white">
      <header className="sticky top-0 z-40 border-b border-gray-800 bg-gray-950/90 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4">
          <Link href="/" className="text-lg font-black tracking-wide text-amber-400">
            BLACK PICK
          </Link>

          <nav className="flex items-center gap-4 text-sm text-gray-300">
            <Link href="/" className="transition hover:text-amber-400">
              Events
            </Link>
            <Link href="/ranking" className="transition hover:text-amber-400">
              Ranking
            </Link>
            <Link href="/profile" className="transition hover:text-amber-400">
              Profile
            </Link>
          </nav>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-6">{children}</main>
    </div>
  );
}
