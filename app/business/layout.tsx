import { redirect } from "next/navigation";
import { requireArea } from "@/lib/auth/server";
import { db } from "@/lib/db";

export default async function BusinessLayout({ children }: { children: React.ReactNode }) {
  const user = await requireArea("business");
  const hasOrg = await db.orgMember.count({ where: { userId: user.id } });
  if (!hasOrg) redirect("/register-business");
  return children;
}
