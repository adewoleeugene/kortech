import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { GuideContent } from "@/components/guide-content";
import { Icon } from "@/components/icons";
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
    <article className="wide space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="space-y-1.5">
          <p className="text-sm text-muted">
            <Link href="/guides" className="font-semibold">{t("guides.title")}</Link> / {guide.name}
          </p>
          <h1 className="text-4xl leading-none font-bold sm:text-5xl">{guide.name}</h1>
        </div>
        {guide.guides.length > 0 && (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-brand-soft px-3 py-2 text-sm font-semibold text-brand">
            <Icon name="download" size={16} strokeWidth={2.2} />
            {t("guides.savedOfflineShort")}
          </span>
        )}
      </div>

      {guide.guides.length === 0 ? (
        <p className="rounded-2xl border border-border bg-surface px-4 py-4">{t("guides.noneYet")}</p>
      ) : (
        <div className="flex flex-wrap items-start gap-7">
          <nav aria-label={t("guides.contents")} className="flex min-w-0 flex-[1_1_220px] flex-wrap content-start gap-2 lg:sticky lg:top-4">
            {guide.guides.map((g) => (
              <a
                key={g.section}
                href={`#${g.section.toLowerCase()}`}
                className="inline-flex min-h-11 items-center rounded-xl border border-border bg-surface px-3.5 text-[15px] font-semibold text-foreground no-underline hover:border-brand hover:text-brand"
              >
                {t(`guides.section_${g.section}`)}
              </a>
            ))}
          </nav>

          <div className="flex min-w-0 flex-[4_1_560px] flex-col gap-8">
            {guide.guides.map((g) => (
              <section key={g.section} id={g.section.toLowerCase()} className="scroll-mt-4 space-y-3" data-testid="guide-section">
                <h2 className="text-2xl font-bold sm:text-[26px]">{t(`guides.section_${g.section}`)}</h2>
                {g.isSample && (
                  <p role="note" className="flex items-start gap-2 rounded-2xl border-2 border-sun bg-sun-soft px-4 py-2.5 text-sm font-semibold text-sun-ink">
                    <Icon name="alert" size={18} className="mt-0.5 shrink-0" />
                    {t("guides.sampleBanner")}
                  </p>
                )}
                <div className="max-w-2xl text-[17px] leading-relaxed">
                  <GuideContent content={g.content} />
                </div>
                {g.reviewedAt && (
                  <p className="flex items-center gap-1.5 text-sm text-muted">
                    <Icon name="shield" size={16} className="text-brand" />
                    {t("guides.reviewedBy", { name: g.reviewedBy?.name ?? "Kortech", date: date(g.reviewedAt) })}
                  </p>
                )}
              </section>
            ))}

            <div className="flex flex-wrap gap-4">
              <Link href="/farmer/assistant" className="flex min-h-16 flex-[1_1_260px] items-center gap-3 rounded-[18px] bg-brand px-5 font-bold text-white no-underline hover:bg-brand-dark hover:text-white">
                <Icon name="chat" />
                {t("guides.askAbout", { crop: guide.name.toLowerCase() })}
              </Link>
              <Link href="/suppliers" className="flex min-h-16 flex-[1_1_260px] items-center gap-3 rounded-[18px] border border-border bg-surface px-5 font-bold text-foreground no-underline hover:border-brand hover:text-foreground">
                <Icon name="store" className="text-brand" />
                {t("guides.findInputs")}
              </Link>
            </div>
            <p className="text-sm text-muted">{t("guides.savedOffline")}</p>
          </div>
        </div>
      )}
    </article>
  );
}
