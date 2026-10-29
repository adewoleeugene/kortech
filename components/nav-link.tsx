"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Icon, type IconName } from "./icons";

// Marks itself as the current page (aria-current + highlight) when the path matches.
function isActive(pathname: string, href: string, exact: boolean) {
  return exact ? pathname === href : pathname === href || pathname.startsWith(`${href}/`);
}

export function TopNavLink({ href, label, exact = false }: { href: string; label: string; exact?: boolean }) {
  const active = isActive(usePathname(), href, exact);
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={`inline-flex min-h-11 items-center rounded-xl px-3.5 text-[15px] no-underline ${
        active ? "bg-brand-soft font-bold text-brand-dark" : "font-semibold text-foreground hover:bg-background"
      }`}
    >
      {label}
    </Link>
  );
}

export function TabLink({ href, label, icon, exact = false }: { href: string; label: string; icon: IconName; exact?: boolean }) {
  const active = isActive(usePathname(), href, exact);
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={`flex min-h-12 flex-col items-center justify-center gap-0.5 text-xs no-underline ${
        active ? "font-bold text-brand" : "font-medium text-muted"
      }`}
    >
      <Icon name={icon} strokeWidth={active ? 2.2 : 2} />
      {label}
    </Link>
  );
}
