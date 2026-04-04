"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useI18n } from "@/lib/i18n-provider";
import { retroNavLinkClassName, retroPanelClassName } from "@/components/ui/retro";

function HomeIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M3 10.5 12 3l9 7.5" />
      <path d="M5.25 9.75V21h13.5V9.75" />
    </svg>
  );
}

function CalendarIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M7 2.75v3.5M17 2.75v3.5M3 8.25h18" />
      <rect x="3" y="4.75" width="18" height="16.5" rx="2.5" />
    </svg>
  );
}

function TrophyIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M8 21h8M12 17v4M7 3h10v3a5 5 0 0 1-10 0V3Z" />
      <path d="M17 5h2a2 2 0 0 1 2 2c0 2.761-2.239 5-5 5M7 5H5a2 2 0 0 0-2 2c0 2.761 2.239 5 5 5" />
    </svg>
  );
}

function UserIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M12 12a4.25 4.25 0 1 0 0-8.5 4.25 4.25 0 0 0 0 8.5Z" />
      <path d="M4 20a8 8 0 0 1 16 0" />
    </svg>
  );
}

export default function MainNav({ mobile = false }: { mobile?: boolean }) {
  const pathname = usePathname();
  const { t } = useI18n();

  const desktopLinks = [
    { href: "/events", label: t("nav.events") || "Events" },
    { href: "/ranking", label: t("nav.ranking") || "Ranking" },
  ];

  const mobileLinks = [
    { href: "/", label: t("nav.home") || "Home", icon: <HomeIcon /> },
    { href: "/events", label: t("nav.events") || "Events", icon: <CalendarIcon /> },
    { href: "/ranking", label: t("nav.ranking") || "Ranking", icon: <TrophyIcon /> },
    { href: "/profile", label: t("nav.profile") || "Profile", icon: <UserIcon /> },
  ];

  if (mobile) {
    return (
      <div className={retroPanelClassName({ tone: "muted", className: "grid grid-cols-4 rounded-none border-x-0 border-b-0" })}>
        {mobileLinks.map((link) => {
          const active =
            link.href === "/"
              ? pathname === "/"
              : pathname === link.href || pathname.startsWith(`${link.href}/`);

          return (
            <Link
              key={link.href}
              href={link.href}
              className={retroNavLinkClassName({
                active,
                mobile: true,
                className: "border-y-0 border-l-0 first:border-l-0",
              })}
            >
              <span className={active ? "text-[var(--retro-ink)]" : "text-[var(--retro-muted)]"}>
                {link.icon}
              </span>
              <span className={active ? "text-[var(--retro-ink)]" : "text-[var(--retro-muted)]"}>
                {link.label}
              </span>
            </Link>
          );
        })}
      </div>
    );
  }

  return (
    <nav className={retroPanelClassName({ tone: "muted", className: "flex items-center gap-2 px-2 py-2" })}>
      {desktopLinks.map((link) => {
        const active = pathname === link.href || pathname.startsWith(`${link.href}/`);

        return (
          <Link
            key={link.href}
            href={link.href}
            className={retroNavLinkClassName({ active })}
          >
            {link.label}
          </Link>
        );
      })}
    </nav>
  );
}
