import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { canPublishListings } from "@/lib/business/organisation";
import { requireSupplierOrganisation } from "@/lib/business/server";
import { getTranslator } from "@/lib/i18n/server";
import { formatPhoneForDisplay } from "@/lib/phone";
import { listDistricts } from "@/lib/reference";
import { categoryOptions, listingFormLabels } from "@/lib/suppliers/form-labels";
import { createListingAction } from "../actions";
import { ListingForm } from "../listing-form";

export const metadata: Metadata = { title: "New listing" };

export default async function NewListingPage() {
  const { org } = await requireSupplierOrganisation();
  if (org.type !== "SUPPLIER" || !canPublishListings(org)) redirect("/business/listings");
  const [{ t }, districts] = await Promise.all([getTranslator(), listDistricts()]);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">{t("listings.newTitle")}</h1>
      <ListingForm
        action={createListingAction}
        categories={categoryOptions(t)}
        districts={districts.map((d) => ({ id: d.id, name: d.name }))}
        defaults={{
          category: "",
          title: "",
          description: "",
          price: "",
          unit: "",
          districtIds: [org.districtId],
          contactPhone: formatPhoneForDisplay(org.phone),
          whatsappNumber: "",
        }}
        labels={listingFormLabels(t, false)}
      />
    </div>
  );
}
