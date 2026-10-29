import type { Metadata } from "next";
import Link from "next/link";
import { homePathForRole } from "@/lib/auth/access";
import { getCurrentUser } from "@/lib/auth/server";
import { getTranslator } from "@/lib/i18n/server";

export const metadata: Metadata = { title: "No access" };

export default async function ForbiddenPage() {
  const [{ t }, user] = await Promise.all([getTranslator(), getCurrentUser()]);
  return (
    <div className="space-y-4 py-10 text-center">
      <h1 className="text-2xl font-bold">{t("forbidden.title")}</h1>
      <p className="text-muted">{t("forbidden.body")}</p>
      <Link
        href={user ? homePathForRole(user.role) : "/"}
        className="inline-flex min-h-12 items-center rounded-lg bg-brand px-6 font-semibold text-brand-foreground"
      >
        {user ? t("nav.myDashboard") : t("errors.backHome")}
      </Link>
    </div>
  );
}
