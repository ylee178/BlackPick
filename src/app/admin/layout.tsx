import Link from 'next/link'
import type { ReactNode } from 'react'
import { requireAdminPage } from '@/lib/admin-auth'

const navItems = [
  { href: '/admin', label: 'Dashboard' },
  { href: '/admin/events', label: 'Events' },
  { href: '/admin/fighters', label: 'Fighters' },
  { href: '/admin/results', label: 'Results' },
]

export default async function AdminLayout({ children }: { children: ReactNode }) {
  await requireAdminPage()

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      <div className="mx-auto flex min-h-screen max-w-7xl flex-col md:flex-row">
        <aside className="border-b border-gray-800 bg-gray-900/80 md:min-h-screen md:w-72 md:border-b-0 md:border-r">
          <div className="border-b border-gray-800 px-6 py-5">
            <Link href="/admin" className="text-xl font-bold tracking-wide text-amber-400">
              Black Pick Admin
            </Link>
            <p className="mt-1 text-sm text-gray-400">Fight ops dashboard</p>
          </div>

          <nav className="flex gap-2 overflow-x-auto px-4 py-4 md:flex-col md:overflow-visible">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="rounded-lg border border-gray-800 bg-gray-900 px-4 py-3 text-sm font-medium text-gray-200 transition hover:border-amber-400 hover:text-amber-400 md:w-full"
              >
                {item.label}
              </Link>
            ))}
          </nav>
        </aside>

        <main className="flex-1 px-4 py-6 sm:px-6 lg:px-8">{children}</main>
      </div>
    </div>
  )
}
