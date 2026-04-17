import Link from "next/link";
import type { ReactNode } from "react";
import AdminNav from "@/components/AdminNav";
import { requireAdminPage } from "@/lib/admin-auth";

export default async function AdminLayout({ children }: { children: ReactNode }) {
  await requireAdminPage();

  return (
    <div className="min-h-screen bg-[var(--bp-bg)] text-[var(--bp-ink)]">
      <div className="mx-auto flex min-h-screen max-w-7xl flex-col md:flex-row">
        <aside className="border-b border-[var(--bp-line)] bg-[var(--bp-card)] md:min-h-screen md:w-72 md:border-b-0 md:border-r">
          <div className="border-b border-[var(--bp-line)] px-6 py-5">
            <Link
              href="/admin"
              className="text-xl font-bold tracking-wide text-[var(--bp-accent)]"
            >
              Black Pick Admin
            </Link>
            <p className="mt-1 text-sm text-[var(--bp-muted)]">Fight ops dashboard</p>
          </div>

          <AdminNav />
        </aside>

        <main className="flex-1 px-4 py-6 sm:px-6 lg:px-8">{children}</main>
      </div>
    </div>
  );
}
