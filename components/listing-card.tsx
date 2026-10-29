import type { SupplierCategory } from "@prisma/client";
import Image from "next/image";
import Link from "next/link";
import type { Translator } from "@/lib/i18n";
import { formatSle } from "@/lib/money";
import { ContactButtons } from "./contact-buttons";

export type ListingCardData = {
  id: string;
  title: string;
  category: SupplierCategory;
  priceMinor: number | null;
  unit: string | null;
  photos: string[];
  isSponsored: boolean;
  contactPhone: string;
  whatsappNumber: string | null;
  org: { legalName: string };
  districts: { name: string }[];
};

export const TOTAL_DISTRICTS = 16;

export function priceLabel(t: Translator, locale: string, priceMinor: number | null, unit: string | null) {
  if (priceMinor === null) return t("suppliers.askForPrice");
  const price = formatSle(priceMinor, locale);
  return unit ? t("suppliers.pricePer", { price, unit }) : price;
}

export function servesLabel(t: Translator, districts: { name: string }[]) {
  if (districts.length >= TOTAL_DISTRICTS) return t("suppliers.servesAll");
  return t("suppliers.serves", { districts: districts.map((d) => d.name).join(", ") });
}

export function ListingCard({ listing, t, locale }: { listing: ListingCardData; t: Translator; locale: string }) {
  const photo = listing.photos[0];
  return (
    <article className="space-y-3 rounded-lg border border-border p-4" aria-labelledby={`listing-${listing.id}`}>
      <div className="flex gap-3">
        {photo && (
          <Image
            src={`/media/${photo}`}
            alt=""
            width={96}
            height={96}
            sizes="96px"
            loading="lazy"
            className="size-24 shrink-0 rounded-md bg-surface object-cover"
          />
        )}
        <div className="min-w-0 flex-1 space-y-1">
          {listing.isSponsored && (
            <span className="inline-block rounded bg-amber-200 px-2 py-0.5 text-xs font-bold uppercase tracking-wide text-amber-950">
              {t("suppliers.sponsored")}
            </span>
          )}
          <h2 id={`listing-${listing.id}`} className="text-lg font-semibold leading-snug">
            <Link href={`/suppliers/${listing.id}`} className="underline-offset-4 hover:underline">
              {listing.title}
            </Link>
          </h2>
          <p className="text-sm">
            <span aria-hidden>✅ </span>
            {listing.org.legalName}
            <span className="sr-only"> ({t("suppliers.verified")})</span>
          </p>
          <p className="font-semibold">{priceLabel(t, locale, listing.priceMinor, listing.unit)}</p>
          <p className="text-sm text-muted">
            {t(`suppliers.category_${listing.category}`)} · {servesLabel(t, listing.districts)}
          </p>
        </div>
      </div>
      <ContactButtons
        phone={listing.contactPhone}
        whatsapp={listing.whatsappNumber}
        labels={{ call: t("suppliers.call"), whatsapp: t("suppliers.whatsapp") }}
        whatsappText={t("suppliers.whatsappMessage", { title: listing.title })}
      />
    </article>
  );
}
