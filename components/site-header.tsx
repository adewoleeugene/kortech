import type { User } from "@prisma/client";
import Link from "next/link";
import { signOutAction } from "@/app/actions";
import { canAccess, homePathForRole } from "@/lib/auth/access";
import type { Translator } from "@/lib/i18n";
import { Icon } from "./icons";
import { TopNavLink } from "./nav-link";

function initials(user: Pick<User, "name" | "phone">) {
  const parts = (user.name ?? "").trim().split(/\s+/).filter(Boolean);
  if (parts.length) return parts.slice(0, 2).map((p) => p[0]!.toUpperCase()).join("");
  return user.phone.slice(-2);
}

// Top navigation for wide screens. On phones, farmers get the bottom tab bar instead (components/tab-bar.tsx).
export function SiteHeader({ t, user }: { t: Translator; user: User | null }) {
  const links: { href: string; label: string; exact?: boolean }[] = !user
    ? [
        { href: "/suppliers", label: t("nav.suppliers") },
        { href: "/guides", label: t("nav.guides") },
        { href: "/weather", label: t("nav.weather") },
      ]
    : canAccess(user.role, "farmer")
      ? [
          { href: "/farmer", label: t("nav.home"), exact: true },
          { href: "/guides", label: t("nav.guides") },
          { href: "/farmer/assistant", label: t("nav.ask") },
          { href: "/suppliers", label: t("nav.suppliers") },
          { href: "/weather", label: t("nav.weather") },
        ]
      : canAccess(user.role, "business")
        ? [
            { href: "/business", label: t("nav.myBusiness") },
            { href: "/suppliers", label: t("nav.suppliers") },
          ]
        : [
            { href: "/admin", label: t("nav.admin") },
            { href: "/suppliers", label: t("nav.suppliers") },
          ];
  const isStaff = !!user && canAccess(user.role, "admin");

  return (
    <header className={isStaff ? "bg-brand-dark text-white" : "border-b border-border bg-surface"}>
      <div className="mx-auto flex max-w-6xl items-center gap-6 px-4 py-2.5 sm:px-5">
        <Link href={user ? homePathForRole(user.role) : "/"} className={`flex min-h-12 items-center gap-2.5 no-underline ${isStaff ? "text-white" : "text-foreground"}`}>
          <span className={`flex size-9 items-center justify-center rounded-[10px] ${isStaff ? "bg-white text-brand" : "bg-brand text-white"}`}>
            <Icon name="leaf" size={20} />
          </span>
          <span className="font-display text-[21px] font-bold">{t("app.shortName")}</span>
          {isStaff && <span className="rounded-md bg-sun px-2 py-0.5 text-xs font-bold uppercase tracking-wide text-sun-ink">{t("nav.adminBadge")}</span>}
        </Link>

        {!isStaff && (
          <nav aria-label={t("nav.main")} className="hidden flex-1 items-center gap-1 md:flex">
            {links.map((l) => (
              <TopNavLink key={l.href} {...l} />
            ))}
          </nav>
        )}

        <div className="ml-auto flex items-center gap-2">
          {user ? (
            <>
              <Link
                href={homePathForRole(user.role)}
                aria-label={t("nav.myDashboard")}
                className={`flex size-11 items-center justify-center rounded-full text-[15px] font-bold no-underline ${isStaff ? "bg-white/15 text-white" : "bg-brand-soft text-brand-dark"}`}
              >
                {initials(user)}
              </Link>
              <form action={signOutAction}>
                <button
                  type="submit"
                  className={`inline-flex min-h-11 items-center gap-1.5 rounded-xl px-2.5 text-sm font-semibold ${isStaff ? "text-brand-tint hover:text-white" : "text-muted hover:text-foreground"}`}
                >
                  <Icon name="logout" size={18} />
                  {t("nav.signOut")}
                </button>
              </form>
            </>
          ) : (
            <Link href="/login" className="inline-flex min-h-11 items-center rounded-xl bg-brand px-4 text-[15px] font-bold text-white no-underline hover:bg-brand-dark hover:text-white">
              {t("nav.signIn")}
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
