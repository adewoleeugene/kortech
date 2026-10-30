import { redirect } from "next/navigation";
import { requireArea } from "@/lib/auth/server";
import { db } from "@/lib/db";
import { needsFarmerPhotos } from "@/lib/farmer/verification";

export default async function FarmerLayout({ children }: { children: React.ReactNode }) {
  const user = await requireArea("farmer");
  const profile = await db.farmerProfile.findUnique({ where: { userId: user.id }, select: { verificationStatus: true } });
  if (!profile) redirect("/onboarding");
  if (needsFarmerPhotos(profile.verificationStatus)) redirect("/onboarding/photos");
  return children;
}
