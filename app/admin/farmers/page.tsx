import type { FarmerVerificationStatus } from "@prisma/client";
import type { Metadata } from "next";
import Link from "next/link";
import { requireVerifier } from "@/lib/auth/admin";
import { listFarmersByStatus } from "@/lib/farmer/verification";
import { getTranslator } from "@/lib/i18n/server";
import { formatPhoneForDisplay } from "@/lib/phone";

export const metadata: Metadata = { title: "Farmer verification" };

const TABS = ["PENDING", "APPROVED", "REJECTED"] as const satisfies readonly FarmerVerificationStatus[];

export default async function FarmerQueue({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  await requireVerifier();
  const { status: raw } = await searchParams;
  const status = TABS.find((s) => s === raw) ?? "PENDING";
  const [{ locale, t }, farmers] = await Promise.all([getTranslator(), listFarmersByStatus(status)]);
  const dateFormat = new Intl.DateTimeFormat(locale, { dateStyle: "medium" });

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">{t("adminFarmers.queue")}</h1>

      <nav aria-label={t("adminFarmers.queue")} className="flex gap-2">
        {TABS.map((tab) => (
          <Link
            key={tab}
            href={`/admin/farmers?status=${tab}`}
            aria-current={tab === status ? "page" : undefined}
            className="inline-flex min-h-12 items-center rounded-lg border-2 border-border px-4 font-semibold aria-[current=page]:border-brand aria-[current=page]:bg-brand-soft"
          >
            {t(`admin.tab${tab}`)}
          </Link>
        ))}
      </nav>

      {farmers.length === 0 ? (
        <p className="text-muted">{t("adminFarmers.none")}</p>
      ) : (
        <ul className="divide-y divide-border rounded-lg border border-border">
          {farmers.map((f) => (
            <li key={f.userId}>
              <Link href={`/admin/farmers/${f.userId}`} className="block min-h-14 px-4 py-3 hover:bg-surface">
                <span className="block font-semibold">{f.user.name ?? formatPhoneForDisplay(f.user.phone)}</span>
                <span className="block text-sm text-muted">
                  {f.district.name}
                  {f.verificationSubmittedAt && ` · ${t("admin.submitted", { date: dateFormat.format(f.verificationSubmittedAt) })}`}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
