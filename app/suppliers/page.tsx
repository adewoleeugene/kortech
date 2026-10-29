import type { Metadata } from "next";
import Link from "next/link";
import { ListingCard } from "@/components/listing-card";
import { getCurrentUser } from "@/lib/auth/server";
import { db } from "@/lib/db";
import { getTranslator } from "@/lib/i18n/server";
import { listDistricts } from "@/lib/reference";
import { SUPPLIER_CATEGORIES, searchListings, searchSchema } from "@/lib/suppliers/listings";

export const metadata: Metadata = { title: "Find suppliers" };

type RawParams = { q?: string; category?: string; district?: string; page?: string };

const inputClass = "min-h-12 w-full rounded-lg border-2 border-border bg-background px-3 text-base";

// Public: anyone can browse verified suppliers. Plain GET form so filters work without JavaScript.
export default async function SuppliersPage({ searchParams }: { searchParams: Promise<RawParams> }) {
  const raw = await searchParams;
  const [{ t, locale }, user, districts] = await Promise.all([getTranslator(), getCurrentUser(), listDistricts()]);

  // A signed-in farmer starts on their own district; "all" means all districts.
  let districtParam = raw.district;
  if (districtParam === undefined && user?.role === "FARMER") {
    const profile = await db.farmerProfile.findUnique({ where: { userId: user.id }, select: { districtId: true } });
    districtParam = profile?.districtId;
  }
  const params = searchSchema.parse({
    q: raw.q || undefined,
    category: raw.category || undefined,
    districtId: districtParam && districtParam !== "all" ? districtParam : undefined,
    page: raw.page,
  });
  const result = await searchListings(params);

  const pageHref = (page: number) => {
    const qs = new URLSearchParams();
    if (params.q) qs.set("q", params.q);
    if (params.category) qs.set("category", params.category);
    qs.set("district", params.districtId ?? "all");
    qs.set("page", String(page));
    return `/suppliers?${qs}`;
  };

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h1 className="text-2xl font-bold">{t("suppliers.title")}</h1>
        <p className="text-muted">{t("suppliers.intro")}</p>
      </div>

      <form method="get" action="/suppliers" className="grid gap-3 rounded-lg bg-surface p-4 sm:grid-cols-2" role="search">
        <div className="space-y-1 sm:col-span-2">
          <label htmlFor="q" className="block font-semibold">{t("suppliers.searchLabel")}</label>
          <input id="q" name="q" type="search" defaultValue={params.q ?? ""} placeholder={t("suppliers.searchPlaceholder")} className={inputClass} />
        </div>
        <div className="space-y-1">
          <label htmlFor="category" className="block font-semibold">{t("suppliers.categoryLabel")}</label>
          <select id="category" name="category" defaultValue={params.category ?? ""} className={inputClass}>
            <option value="">{t("suppliers.allCategories")}</option>
            {SUPPLIER_CATEGORIES.map((c) => (
              <option key={c} value={c}>{t(`suppliers.category_${c}`)}</option>
            ))}
          </select>
        </div>
        <div className="space-y-1">
          <label htmlFor="district" className="block font-semibold">{t("suppliers.districtLabel")}</label>
          <select id="district" name="district" defaultValue={params.districtId ?? "all"} className={inputClass}>
            <option value="all">{t("suppliers.allDistricts")}</option>
            {districts.map((d) => (
              <option key={d.id} value={d.id}>{d.name}</option>
            ))}
          </select>
        </div>
        <button type="submit" className="min-h-12 rounded-lg bg-brand px-6 font-semibold text-brand-foreground sm:col-span-2">
          {t("suppliers.apply")}
        </button>
      </form>

      <p role="status" className="font-semibold" data-testid="result-count">
        {result.total === 1 ? t("suppliers.resultsOne") : t("suppliers.results", { count: result.total })}
      </p>

      {result.listings.length === 0 ? (
        <p className="text-muted">{t("suppliers.noResults")}</p>
      ) : (
        <ul className="space-y-3">
          {result.listings.map((listing) => (
            <li key={listing.id}>
              <ListingCard listing={listing} t={t} locale={locale} />
            </li>
          ))}
        </ul>
      )}

      {result.pageCount > 1 && (
        <nav className="flex items-center justify-between gap-2" aria-label={t("suppliers.pageOf", { page: result.page, pages: result.pageCount })}>
          {result.page > 1 ? (
            <Link href={pageHref(result.page - 1)} className="inline-flex min-h-12 items-center font-semibold text-brand">← {t("suppliers.previous")}</Link>
          ) : <span />}
          <span className="text-sm text-muted">{t("suppliers.pageOf", { page: result.page, pages: result.pageCount })}</span>
          {result.page < result.pageCount ? (
            <Link href={pageHref(result.page + 1)} className="inline-flex min-h-12 items-center font-semibold text-brand">{t("suppliers.next")} →</Link>
          ) : <span />}
        </nav>
      )}
    </div>
  );
}
