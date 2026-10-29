import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { requireArea } from "@/lib/auth/server";
import { getCropGuidesForEditing } from "@/lib/guides/guides";
import { getTranslator } from "@/lib/i18n/server";

export const metadata: Metadata = { title: "Edit crop guide" };

export default async function AdminCropGuidePage({ params }: { params: Promise<{ crop: string }> }) {
  await requireArea("admin");
  const { crop: slug } = await params;
  const [{ t }, data] = await Promise.all([getTranslator(), getCropGuidesForEditing(slug)]);
  if (!data) notFound();

  return (
    <div className="space-y-6">
      <Link href="/admin/guides" className="inline-flex min-h-12 items-center text-brand underline underline-offset-4">← {t("adminGuides.title")}</Link>
      <h1 className="text-2xl font-bold">{data.crop.name}</h1>
      <ul className="divide-y divide-border rounded-lg border border-border">
        {data.sections.map(({ section, guide }) => {
          const status = !guide ? "missing" : guide.isSample ? "sample" : guide.published ? "published" : "draft";
          return (
            <li key={section} data-testid={`section-${section}`}>
              <Link href={`/admin/guides/${slug}/${section.toLowerCase()}`} className="flex min-h-14 items-center justify-between gap-3 px-4 py-2 hover:bg-surface">
                <span className="font-semibold">{t(`guides.section_${section}`)}</span>
                <span className="text-sm text-muted">{t(`adminGuides.status_${status}`)}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
