"use client";

import Link from "next/link";
import { useI18n } from "@/lib/i18n-provider";

export default function MainNav() {
  const { t } = useI18n();

  const links = [
    { href: "/", label: t("nav.home") },
    { href: "/events", label: t("nav.events") },
    { href: "/ranking", label: t("nav.ranking") },
    { href: "/profile", label: t("nav.profile") },
    { href: "/login", label: t("nav.login") },
  ];

  return (
    <nav className="hidden items-center gap-1 md:flex">
      {links.map((link) => (
        <Link
          key={link.href}
          href={link.href}
          className="rounded-md px-3 py-2 text-sm font-medium text-gray-300 transition-colors hover:bg-gray-900 hover:text-amber-400"
        >
          {link.label}
        </Link>
      ))}
    </nav>
  );
}
