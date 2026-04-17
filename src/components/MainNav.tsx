"use client";

import { Link } from "@/i18n/navigation";
import { usePathname } from "next/navigation";
import { useI18n } from "@/lib/i18n-provider";
import { retroNavLinkClassName } from "@/components/ui/retro";
import { Target, ClipboardList, Trophy, User, BarChart3, Users } from "lucide-react";

const iconClass = "h-5 w-5";
function PicksIcon() { return <Target className={iconClass} strokeWidth={1.8} />; }
function MyRecordIcon() { return <ClipboardList className={iconClass} strokeWidth={1.8} />; }
function TrophyIcon() { return <Trophy className={iconClass} strokeWidth={1.8} />; }
function DashboardIcon() { return <BarChart3 className={iconClass} strokeWidth={1.8} />; }
function FightersIcon() { return <Users className={iconClass} strokeWidth={1.8} />; }
function UserIcon() { return <User className={iconClass} strokeWidth={1.8} />; }

export default function MainNav({ mobile = false }: { mobile?: boolean }) {
  const rawPathname = usePathname();
  const { t, locale } = useI18n();
  // Strip locale prefix: /en/dashboard → /dashboard
  const pathname = rawPathname.replace(new RegExp(`^/${locale}`), "") || "/";

  const desktopLinks = [
    { href: "/", label: t("nav.picks") || "Picks" },
    { href: "/my-record", label: t("nav.myRecord") || "My Record" },
    { href: "/dashboard", label: t("myRecord.dashboard") || "Dashboard" },
    { href: "/ranking", label: t("nav.ranking") || "Ranking" },
    { href: "/fighters", label: t("nav.fighters") || "Fighters" },
  ];

  const mobileLinks = [
    { href: "/", label: t("nav.picks") || "Picks", icon: <PicksIcon /> },
    { href: "/my-record", label: t("nav.myRecord") || "My Record", icon: <MyRecordIcon /> },
    { href: "/dashboard", label: t("myRecord.dashboard") || "Dashboard", icon: <DashboardIcon /> },
    { href: "/ranking", label: t("nav.ranking") || "Ranking", icon: <TrophyIcon /> },
    { href: "/fighters", label: t("nav.fighters") || "Fighters", icon: <FightersIcon /> },
  ];

  if (mobile) {
    return (
      <nav className="grid grid-cols-5" aria-label="Navigation">
        {mobileLinks.map((link) => {
          const active =
            link.href === "/"
              ? pathname === "/"
              : link.href === "/my-record"
                ? pathname === "/my-record"
                : pathname === link.href || pathname.startsWith(`${link.href}/`);

          return (
            <Link
              key={link.href}
              href={link.href}
              aria-current={active ? "page" : undefined}
              className={retroNavLinkClassName({
                active,
                mobile: true,
              })}
            >
              <span className={active ? "text-[var(--bp-accent)]" : "text-[var(--bp-muted)]"} aria-hidden="true">
                {link.icon}
              </span>
              <span className={active ? "text-[var(--bp-accent)]" : "text-[var(--bp-muted)]"}>
                {link.label}
              </span>
            </Link>
          );
        })}
      </nav>
    );
  }

  return (
    <nav className="flex items-center gap-1" aria-label="Main navigation">
      {desktopLinks.map((link) => {
        const active =
          link.href === "/"
            ? pathname === "/"
            : link.href === "/my-record"
              ? pathname === "/my-record"
              : pathname === link.href || pathname.startsWith(`${link.href}/`);

        return (
          <Link
            key={link.href}
            href={link.href}
            aria-current={active ? "page" : undefined}
            className={retroNavLinkClassName({ active })}
          >
            {link.label}
          </Link>
        );
      })}
    </nav>
  );
}
