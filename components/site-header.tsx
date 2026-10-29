import Image from "next/image";
import Link from "next/link";
import { signOutAction } from "@/app/actions";
import { homePathForRole } from "@/lib/auth/access";
import { getCurrentUser } from "@/lib/auth/server";
import type { Translator } from "@/lib/i18n";

export async function SiteHeader({ t }: { t: Translator }) {
  const user = await getCurrentUser();
  return (
    <header className="border-b border-border bg-background">
      <div className="mx-auto flex h-14 w-full max-w-3xl items-center justify-between gap-2 px-4">
        <Link href="/" className="flex min-h-12 items-center gap-2 font-semibold text-brand">
          <Image src="/icons/icon-192.png" alt="" width={28} height={28} className="rounded" priority />
          <span>{t("app.shortName")}</span>
        </Link>
        <nav className="flex items-center gap-1 text-sm">
          {user ? (
            <>
              <Link href={homePathForRole(user.role)} className="inline-flex min-h-12 items-center px-3 font-medium">
                {t("nav.myDashboard")}
              </Link>
              <form action={signOutAction}>
                <button type="submit" className="min-h-12 px-3 font-medium text-muted">
                  {t("nav.signOut")}
                </button>
              </form>
            </>
          ) : (
            <Link href="/login" className="inline-flex min-h-12 items-center px-3 font-semibold text-brand">
              {t("nav.signIn")}
            </Link>
          )}
        </nav>
      </div>
    </header>
  );
}
