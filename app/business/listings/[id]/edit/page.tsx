import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { canPublishListings } from "@/lib/business/organisation";
import { requireSupplierOrganisation } from "@/lib/business/server";
import { getTranslator } from "@/lib/i18n/server";
import { minorToInput } from "@/lib/money";
import { formatPhoneForDisplay } from "@/lib/phone";
import { listDistricts } from "@/lib/reference";
import { categoryOptions, listingFormLabels } from "@/lib/suppliers/form-labels";
import { getOwnListing } from "@/lib/suppliers/listings";
import { updateListingAction } from "../../actions";
import { ListingForm } from "../../listing-form";

export const metadata: Metadata = { title: "Edit listing" };

export default async function EditListingPage({ params }: { params: Promise<{ id: string }> }) {
  const { org } = await requireSupplierOrganisation();
  if (org.type !== "SUPPLIER" || !canPublishListings(org)) redirect("/business/listings");
  const { id } = await params;
  const [{ t }, districts, listing] = await Promise.all([getTranslator(), listDistricts(), getOwnListing(org.id, id)]);
  if (!listing) notFound();

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">{t("listings.editTitle")}</h1>
      <ListingForm
        action={updateListingAction.bind(null, listing.id)}
        categories={categoryOptions(t)}
        districts={districts.map((d) => ({ id: d.id, name: d.name }))}
        defaults={{
          category: listing.category,
          title: listing.title,
          description: listing.description,
          price: minorToInput(listing.priceMinor),
          unit: listing.unit ?? "",
          districtIds: listing.districts.map((d) => d.id),
          contactPhone: formatPhoneForDisplay(listing.contactPhone),
          whatsappNumber: listing.whatsappNumber ? formatPhoneForDisplay(listing.whatsappNumber) : "",
        }}
        labels={listingFormLabels(t, true)}
      />
    </div>
  );
}
