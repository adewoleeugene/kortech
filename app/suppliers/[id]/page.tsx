import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ContactButtons } from "@/components/contact-buttons";
import { priceLabel, servesLabel } from "@/components/listing-card";
import { getTranslator } from "@/lib/i18n/server";
import { getPublicListing } from "@/lib/suppliers/listings";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const listing = await getPublicListing((await params).id);
  return { title: listing?.title ?? "Supplier" };
}

export default async function ListingPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [{ t, locale }, listing] = await Promise.all([getTranslator(), getPublicListing(id)]);
  if (!listing) notFound();

  const verifiedDate = listing.org.verifiedAt ? new Intl.DateTimeFormat(locale, { dateStyle: "medium" }).format(listing.org.verifiedAt) : null;

  return (
    <article className="space-y-6">
      <Link href="/suppliers" className="inline-flex min-h-12 items-center text-brand underline underline-offset-4">
        ← {t("suppliers.backToResults")}
      </Link>

      <header className="space-y-2">
        {listing.isSponsored && (
          <span className="inline-block rounded bg-amber-200 px-2 py-0.5 text-xs font-bold uppercase tracking-wide text-amber-950">
            {t("suppliers.sponsored")}
          </span>
        )}
        <h1 className="text-2xl font-bold">{listing.title}</h1>
        <p className="text-xl font-semibold">{priceLabel(t, locale, listing.priceMinor, listing.unit)}</p>
        <p className="text-muted">{t(`suppliers.category_${listing.category}`)} · {servesLabel(t, listing.districts)}</p>
      </header>

      <ContactButtons
        phone={listing.contactPhone}
        whatsapp={listing.whatsappNumber}
        labels={{ call: t("suppliers.call"), whatsapp: t("suppliers.whatsapp") }}
        whatsappText={t("suppliers.whatsappMessage", { title: listing.title })}
      />

      {listing.photos.length > 0 && (
        <ul className="grid grid-cols-3 gap-2">
          {listing.photos.map((key, i) => (
            <li key={key}>
              <a href={`/media/${key}`}>
                <Image
                  src={`/media/${key}`}
                  alt={t("suppliers.photoAlt", { n: i + 1, title: listing.title })}
                  width={320}
                  height={320}
                  sizes="(max-width: 768px) 33vw, 240px"
                  loading="lazy"
                  className="aspect-square w-full rounded-md bg-surface object-cover"
                />
              </a>
            </li>
          ))}
        </ul>
      )}

      <section className="space-y-2">
        <h2 className="text-lg font-semibold">{t("suppliers.description")}</h2>
        <p className="whitespace-pre-line">{listing.description}</p>
      </section>

      <section className="space-y-1 rounded-lg bg-surface px-4 py-3">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted">{t("suppliers.supplier")}</h2>
        <p className="font-semibold">✅ {listing.org.legalName}</p>
        <p className="text-sm">{listing.org.address}, {listing.org.district.name}</p>
        {verifiedDate && <p className="text-sm text-muted">{t("suppliers.verifiedOn", { date: verifiedDate })}</p>}
      </section>
    </article>
  );
}
