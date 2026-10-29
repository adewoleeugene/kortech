import type { SupplierCategory } from "@prisma/client";
import Image from "next/image";
import Link from "next/link";
import type { Translator } from "@/lib/i18n";
import { formatSle } from "@/lib/money";
import { ContactButtons } from "./contact-buttons";
import { Icon, type IconName } from "./icons";

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

export const CATEGORY_ICON: Record<SupplierCategory, IconName> = {
  SEEDS: "sprout",
  FERTILISER: "basket",
  AGROCHEMICALS: "alert",
  TOOLS: "store",
  MACHINERY: "building",
  EQUIPMENT_HIRE: "building",
  OTHER: "store",
};

export function priceLabel(t: Translator, locale: string, priceMinor: number | null, unit: string | null) {
  if (priceMinor === null) return t("suppliers.askForPrice");
  const price = formatSle(priceMinor, locale);
  return unit ? t("suppliers.pricePer", { price, unit }) : price;
}

export function servesLabel(t: Translator, districts: { name: string }[]) {
  if (districts.length >= TOTAL_DISTRICTS) return t("suppliers.servesAll");
  return t("suppliers.serves", { districts: districts.map((d) => d.name).join(", ") });
}

export function SponsoredTag({ label }: { label: string }) {
  return <span className="inline-block self-start rounded-md bg-sun px-2 py-0.5 text-[11px] font-bold uppercase tracking-wide text-sun-ink">{label}</span>;
}

export function ListingCard({ listing, t, locale }: { listing: ListingCardData; t: Translator; locale: string }) {
  const photo = listing.photos[0];
  return (
    <article className="flex h-full flex-col gap-3 rounded-[20px] border border-border bg-surface p-4 sm:p-5" aria-labelledby={`listing-${listing.id}`}>
      <div className="flex gap-3.5">
        {photo ? (
          <Image src={`/media/${photo}`} alt="" width={80} height={80} sizes="80px" loading="lazy" className="size-20 shrink-0 rounded-2xl bg-background object-cover" />
        ) : (
          <span aria-hidden="true" className="flex size-20 shrink-0 items-center justify-center rounded-2xl bg-brand-soft text-brand">
            <Icon name={CATEGORY_ICON[listing.category]} size={32} strokeWidth={1.8} />
          </span>
        )}
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          {listing.isSponsored && <SponsoredTag label={t("suppliers.sponsored")} />}
          <h2 id={`listing-${listing.id}`} className="font-sans text-lg leading-snug font-bold tracking-normal">
            <Link href={`/suppliers/${listing.id}`} className="text-foreground no-underline hover:underline">
              {listing.title}
            </Link>
          </h2>
          <p className="flex items-center gap-1.5 text-sm">
            <Icon name="shield" size={16} className="shrink-0 text-brand" />
            {listing.org.legalName}
            <span className="sr-only"> ({t("suppliers.verified")})</span>
          </p>
        </div>
      </div>
      <div className="mt-auto flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
        <span className="font-display text-xl font-bold">{priceLabel(t, locale, listing.priceMinor, listing.unit)}</span>
        <span className="text-[13px] text-muted">
          {t(`suppliers.category_${listing.category}`)} · {servesLabel(t, listing.districts)}
        </span>
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
