"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Calendar, LayoutDashboard, Trophy, Users } from "lucide-react";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/admin", label: "Dashboard", icon: LayoutDashboard, exact: true },
  { href: "/admin/events", label: "Events", icon: Calendar },
  { href: "/admin/fighters", label: "Fighters", icon: Users },
  { href: "/admin/results", label: "Results", icon: Trophy },
];

export default function AdminNav() {
  const pathname = usePathname();

  return (
    <nav className="flex gap-2 overflow-x-auto px-4 py-4 md:flex-col md:overflow-visible">
      {navItems.map((item) => {
        const Icon = item.icon;
        const active = item.exact
          ? pathname === item.href
          : pathname?.startsWith(item.href) ?? false;
        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "inline-flex cursor-pointer items-center gap-2.5 rounded-[12px] border px-4 py-3 text-sm font-medium transition md:w-full",
              active
                ? "border-[var(--bp-accent-border)] bg-[var(--bp-accent-dim)] text-[var(--bp-accent)]"
                : "border-[var(--bp-line)] bg-[var(--bp-card)] text-[var(--bp-muted)] hover:border-[var(--bp-line-strong)] hover:text-[var(--bp-ink)]",
            )}
          >
            <Icon className="h-4 w-4 shrink-0" strokeWidth={2} />
            <span>{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
