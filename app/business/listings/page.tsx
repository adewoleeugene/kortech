import type { Metadata } from "next";
import Link from "next/link";
import { canPublishListings } from "@/lib/business/organisation";
import { requireSupplierOrganisation } from "@/lib/business/server";
import { getTranslator } from "@/lib/i18n/server";
import { formatSle } from "@/lib/money";
import { listOwnListings } from "@/lib/suppliers/listings";
import { setListingActiveAction } from "./actions";

export const metadata: Metadata = { title: "Product listings" };

const STATUS_STYLE = {
  ACTIVE: "bg-brand-soft",
  INACTIVE: "bg-surface",
  HIDDEN: "bg-red-100 text-red-950 dark:bg-red-950 dark:text-red-100",
} as const;

export default async function OwnListingsPage() {
  const { org } = await requireSupplierOrganisation();
  const { t, locale } = await getTranslator();

  if (org.type !== "SUPPLIER" || !canPublishListings(org)) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-bold">{t("listings.title")}</h1>
        <p className="rounded-lg bg-surface px-4 py-3">{org.type !== "SUPPLIER" ? t("listings.notSupplier") : t("listings.notApproved")}</p>
      </div>
    );
  }

  const listings = await listOwnListings(org.id);
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h1 className="text-2xl font-bold">{t("listings.title")}</h1>
        <p className="text-muted">{t("listings.intro")}</p>
      </div>
      <Link href="/business/listings/new" className="flex min-h-12 items-center justify-center rounded-lg bg-brand px-6 text-lg font-semibold text-brand-foreground">
        + {t("listings.new")}
      </Link>

      {listings.length === 0 ? (
        <p className="text-muted">{t("listings.none")}</p>
      ) : (
        <ul className="space-y-3">
          {listings.map((l) => (
            <li key={l.id} className="space-y-2 rounded-lg border border-border p-4" data-testid="own-listing">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-semibold">{l.title}</p>
                  <p className="text-sm text-muted">
                    {t(`suppliers.category_${l.category}`)} · {l.priceMinor === null ? t("suppliers.askForPrice") : formatSle(l.priceMinor, locale)}
                  </p>
                </div>
                <span className={`shrink-0 rounded-full px-3 py-1 text-sm font-semibold ${STATUS_STYLE[l.status]}`}>{t(`listings.status_${l.status}`)}</span>
              </div>
              {l.status === "HIDDEN" && <p className="text-sm">{t("listings.hiddenHelp")}</p>}
              <div className="flex flex-wrap gap-x-4">
                <Link href={`/business/listings/${l.id}/edit`} className="inline-flex min-h-12 items-center font-semibold text-brand underline underline-offset-4">
                  {t("listings.edit")}
                </Link>
                {l.status !== "HIDDEN" && (
                  <form action={setListingActiveAction}>
                    <input type="hidden" name="listingId" value={l.id} />
                    <input type="hidden" name="active" value={l.status === "ACTIVE" ? "false" : "true"} />
                    <button type="submit" className="min-h-12 font-semibold text-brand underline underline-offset-4">
                      {l.status === "ACTIVE" ? t("listings.turnOff") : t("listings.turnOn")}
                    </button>
                  </form>
                )}
                {l.status === "ACTIVE" && (
                  <Link href={`/suppliers/${l.id}`} className="inline-flex min-h-12 items-center text-muted underline underline-offset-4">
                    {t("listings.viewPublic")}
                  </Link>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
