import { redirect } from "next/navigation";
import { requireArea } from "@/lib/auth/server";
import { db } from "@/lib/db";

export default async function FarmerLayout({ children }: { children: React.ReactNode }) {
  const user = await requireArea("farmer");
  const hasProfile = await db.farmerProfile.count({ where: { userId: user.id } });
  if (!hasProfile) redirect("/onboarding");
  return children;
}
