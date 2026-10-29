import { requireArea } from "@/lib/auth/server";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  await requireArea("admin");
  return children;
}
