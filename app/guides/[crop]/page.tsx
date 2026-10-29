import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { GuideContent } from "@/components/guide-content";
import { getPublishedGuide } from "@/lib/guides/guides";
import { getTranslator } from "@/lib/i18n/server";

export async function generateMetadata({ params }: { params: Promise<{ crop: string }> }): Promise<Metadata> {
  const guide = await getPublishedGuide((await params).crop);
  return { title: guide ? `${guide.name} guide` : "Crop guide" };
}

export default async function CropGuidePage({ params }: { params: Promise<{ crop: string }> }) {
  const { crop: slug } = await params;
  const [{ t, locale }, guide] = await Promise.all([getTranslator(), getPublishedGuide(slug)]);
  if (!guide) notFound();
  const date = (d: Date) => new Intl.DateTimeFormat(locale, { dateStyle: "medium" }).format(d);

  return (
    <article className="space-y-6">
      <Link href="/guides" className="inline-flex min-h-12 items-center text-brand underline underline-offset-4">← {t("guides.back")}</Link>
      <h1 className="text-2xl font-bold">{guide.name}</h1>

      {guide.guides.length === 0 ? (
        <p className="rounded-lg bg-surface px-4 py-3">{t("guides.noneYet")}</p>
      ) : (
        <>
          <nav aria-label={t("guides.contents")} className="rounded-lg bg-surface px-4 py-3">
            <h2 className="mb-1 text-sm font-semibold uppercase tracking-wide text-muted">{t("guides.contents")}</h2>
            <ul className="flex flex-wrap gap-x-4">
              {guide.guides.map((g) => (
                <li key={g.section}>
                  <a href={`#${g.section.toLowerCase()}`} className="inline-flex min-h-10 items-center text-brand underline underline-offset-4">
                    {t(`guides.section_${g.section}`)}
                  </a>
                </li>
              ))}
            </ul>
          </nav>

          {guide.guides.map((g) => (
            <section key={g.section} id={g.section.toLowerCase()} className="scroll-mt-4 space-y-3" data-testid="guide-section">
              <h2 className="text-xl font-semibold">{t(`guides.section_${g.section}`)}</h2>
              {g.isSample && (
                <p role="note" className="rounded-lg border-2 border-amber-600 bg-amber-100 px-4 py-2 text-sm font-semibold text-amber-950 dark:bg-amber-950 dark:text-amber-100">
                  ⚠️ {t("guides.sampleBanner")}
                </p>
              )}
              <GuideContent content={g.content} />
              {g.reviewedAt && (
                <p className="text-sm text-muted">✅ {t("guides.reviewedBy", { name: g.reviewedBy?.name ?? "SmartFarm", date: date(g.reviewedAt) })}</p>
              )}
            </section>
          ))}
          <p className="text-sm text-muted">📥 {t("guides.savedOffline")}</p>
        </>
      )}
    </article>
  );
}
