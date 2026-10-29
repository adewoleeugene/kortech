import type { Metadata } from "next";
import Link from "next/link";
import { requireArea } from "@/lib/auth/server";
import { db } from "@/lib/db";
import { GUIDE_SECTIONS } from "@/lib/guides/guides";
import { getTranslator } from "@/lib/i18n/server";

export const metadata: Metadata = { title: "Crop guide editor" };

export default async function AdminGuidesPage() {
  await requireArea("admin");
  const [{ t }, crops] = await Promise.all([
    getTranslator(),
    db.crop.findMany({ orderBy: { name: "asc" }, include: { guides: { select: { published: true, isSample: true } } } }),
  ]);

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h1 className="text-2xl font-bold">{t("adminGuides.title")}</h1>
        <p className="text-muted">{t("adminGuides.intro")}</p>
      </div>
      <ul className="divide-y divide-border rounded-lg border border-border">
        {crops.map((c) => {
          const reviewed = c.guides.filter((g) => g.published && !g.isSample).length;
          return (
            <li key={c.id}>
              <Link href={`/admin/guides/${c.slug}`} className="flex min-h-14 items-center justify-between gap-3 px-4 py-2 hover:bg-surface">
                <span className="font-semibold">{c.name}</span>
                <span className="text-sm text-muted">
                  {t("adminGuides.status_published")}: {reviewed}/{GUIDE_SECTIONS.length}
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
