import type { Metadata } from "next";
import Link from "next/link";
import { requireVerifier } from "@/lib/auth/admin";
import { getTranslator } from "@/lib/i18n/server";
import { listAllListingsForAdmin } from "@/lib/suppliers/listings";
import { moderateListingAction } from "./actions";

export const metadata: Metadata = { title: "Listing moderation" };

function ActionButton({ listingId, change, label }: { listingId: string; change: string; label: string }) {
  return (
    <form action={moderateListingAction}>
      <input type="hidden" name="listingId" value={listingId} />
      <input type="hidden" name="change" value={change} />
      <button type="submit" className="min-h-12 rounded-lg border-2 border-border px-4 text-sm font-semibold">
        {label}
      </button>
    </form>
  );
}

export default async function AdminListingsPage() {
  await requireVerifier();
  const [{ t }, listings] = await Promise.all([getTranslator(), listAllListingsForAdmin()]);

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h1 className="text-2xl font-bold">{t("admin.listings")}</h1>
        <p className="text-muted">{t("admin.listingsIntro")}</p>
        <p className="text-sm text-muted">{t("admin.listingsCount", { count: listings.length })}</p>
      </div>
      <ul className="space-y-3">
        {listings.map((l) => (
          <li key={l.id} className="space-y-2 rounded-lg border border-border p-4" data-testid="admin-listing">
            <div className="space-y-1">
              <p className="font-semibold">
                {l.status === "ACTIVE" ? <Link href={`/suppliers/${l.id}`} className="underline underline-offset-4">{l.title}</Link> : l.title}
              </p>
              <p className="text-sm text-muted">
                {l.org.legalName} · {t(`suppliers.category_${l.category}`)} · {t(`listings.status_${l.status}`)}
                {l.isSponsored && ` · ${t("suppliers.sponsored")}`}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <ActionButton listingId={l.id} change={l.isSponsored ? "unsponsor" : "sponsor"} label={l.isSponsored ? t("admin.removeSponsored") : t("admin.makeSponsored")} />
              <ActionButton listingId={l.id} change={l.status === "HIDDEN" ? "restore" : "hide"} label={l.status === "HIDDEN" ? t("admin.restore") : t("admin.hide")} />
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
