import { requireArea } from "@/lib/auth/server";

export default async function BusinessLayout({ children }: { children: React.ReactNode }) {
  await requireArea("business");
  return children;
}
