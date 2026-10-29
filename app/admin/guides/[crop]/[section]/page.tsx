import type { Metadata } from "next";
import { Icon } from "@/components/icons";
import Link from "next/link";
import { notFound } from "next/navigation";
import { GuideContent } from "@/components/guide-content";
import { requireArea } from "@/lib/auth/server";
import { GUIDE_SECTIONS, getCropGuidesForEditing } from "@/lib/guides/guides";
import { getTranslator } from "@/lib/i18n/server";
import { formatPhoneForDisplay } from "@/lib/phone";
import { publishGuideAction, saveGuideAction } from "./actions";
import { GuideForm } from "./guide-form";

export const metadata: Metadata = { title: "Edit guide section" };

export default async function EditGuideSectionPage({ params }: { params: Promise<{ crop: string; section: string }> }) {
  await requireArea("admin");
  const { crop: slug, section: rawSection } = await params;
  const section = GUIDE_SECTIONS.find((s) => s.toLowerCase() === rawSection);
  const [{ t, locale }, data] = await Promise.all([getTranslator(), getCropGuidesForEditing(slug)]);
  if (!data || !section) notFound();

  const guide = data.sections.find((s) => s.section === section)?.guide ?? null;
  const date = (d: Date) => new Intl.DateTimeFormat(locale, { dateStyle: "medium", timeStyle: "short" }).format(d);
  const person = (p: { name: string | null; phone: string } | null) => (p ? p.name ?? formatPhoneForDisplay(p.phone) : "—");
  const status = !guide ? "missing" : guide.isSample ? "sample" : guide.published ? "published" : "draft";

  return (
    <div className="space-y-6">
      <Link href={`/admin/guides/${slug}`} className="inline-flex min-h-12 items-center text-brand underline underline-offset-4">
        ← {t("adminGuides.back", { crop: data.crop.name })}
      </Link>
      <div className="space-y-1">
        <h1 className="text-2xl font-bold">{data.crop.name}: {t(`guides.section_${section}`)}</h1>
        <p className="font-semibold" data-testid="guide-status">{t(`adminGuides.status_${status}`)}</p>
        {guide?.reviewedAt && <p className="text-sm text-muted">{t("guides.reviewedBy", { name: person(guide.reviewedBy), date: date(guide.reviewedAt) })}</p>}
        {guide?.updatedBy && <p className="text-sm text-muted">{t("adminGuides.lastEdited", { name: person(guide.updatedBy), date: date(guide.updatedAt) })}</p>}
      </div>

      <GuideForm
        action={saveGuideAction.bind(null, { cropId: data.crop.id, cropSlug: slug, section })}
        content={guide?.content ?? ""}
        labels={{ contentLabel: t("adminGuides.contentLabel"), contentHint: t("adminGuides.contentHint"), save: t("adminGuides.save") }}
      />

      {guide && (
        <form action={publishGuideAction} className="flex flex-wrap gap-2">
          <input type="hidden" name="guideId" value={guide.id} />
          <input type="hidden" name="cropSlug" value={slug} />
          {status !== "published" && (
            <button type="submit" name="change" value="publish" className="min-h-12 rounded-lg border-2 border-brand px-5 font-semibold text-brand">
              <Icon name="check" size={18} className="inline" /> {t("adminGuides.reviewPublish")}
            </button>
          )}
          {guide.published && (
            <button type="submit" name="change" value="unpublish" className="min-h-12 rounded-lg border-2 border-border px-5 font-semibold">
              {t("adminGuides.unpublish")}
            </button>
          )}
        </form>
      )}

      {guide && (
        <section className="space-y-2 rounded-lg border border-dashed border-border p-4">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted">{t("adminGuides.preview")}</h2>
          <GuideContent content={guide.content} />
        </section>
      )}
    </div>
  );
}
