import type { GuideSection } from "@prisma/client";
import type { Metadata } from "next";
import Link from "next/link";
import { GuideContent } from "@/components/guide-content";
import { type AnswerSource, type FlagReason, listReviewQueue } from "@/lib/ai/assistant";
import { requireArea } from "@/lib/auth/server";
import { getTranslator } from "@/lib/i18n/server";
import { formatPhoneForDisplay } from "@/lib/phone";
import { ReviewForm } from "./review-form";

export const metadata: Metadata = { title: "AI answer review" };

const TABS = ["OPEN", "RESOLVED"] as const;

export default async function AiReviewPage({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  await requireArea("admin");
  const raw = (await searchParams).status;
  const status = TABS.find((s) => s === raw) ?? "OPEN";
  const [{ t, locale }, items] = await Promise.all([getTranslator(), listReviewQueue(status)]);
  const date = (d: Date) => new Intl.DateTimeFormat(locale, { dateStyle: "medium", timeStyle: "short" }).format(d);

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h1 className="text-2xl font-bold">{t("adminAi.title")}</h1>
        <p className="text-muted">{t("adminAi.intro")}</p>
      </div>
      <nav aria-label={t("adminAi.title")} className="flex gap-2">
        {TABS.map((tab) => (
          <Link key={tab} href={`/admin/ai?status=${tab}`} aria-current={tab === status ? "page" : undefined}
            className="inline-flex min-h-12 items-center rounded-lg border-2 border-border px-4 font-semibold aria-[current=page]:border-brand aria-[current=page]:bg-brand-soft">
            {t(`adminAi.tab${tab}`)}
          </Link>
        ))}
      </nav>

      {items.length === 0 ? (
        <p className="text-muted">{t("adminAi.none")}</p>
      ) : (
        <ul className="space-y-4">
          {items.map(({ answer, question }) => {
            const sources = (answer.sources as AnswerSource[]) ?? [];
            return (
              <li key={answer.id} className="space-y-3 rounded-lg border border-border p-4" data-testid="review-item">
                <p className="inline-block rounded bg-amber-200 px-2 py-0.5 text-xs font-bold text-amber-950">
                  {t(`adminAi.reason_${(answer.flagReason ?? "low_confidence") as FlagReason}`)}
                </p>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted">{t("adminAi.question")}</p>
                  <p className="font-medium">{question}</p>
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted">{t("adminAi.answer")} · {answer.model}</p>
                  <GuideContent content={answer.content} />
                </div>
                <p className="text-sm text-muted">
                  {sources.length
                    ? t("adminAi.sources", { sources: sources.map((s) => `${s.crop}: ${t(`guides.section_${s.section as GuideSection}`)}`).join(", ") })
                    : t("adminAi.noSources")}
                </p>
                {answer.reportNote && <p className="text-sm">{t("adminAi.farmerNote", { note: answer.reportNote })}</p>}
                {answer.rating !== null && <p className="text-sm">{t("adminAi.rating", { rating: answer.rating > 0 ? t("assistant.helpful") : t("assistant.notHelpful") })}</p>}
                {status === "OPEN" ? (
                  <ReviewForm
                    messageId={answer.id}
                    labels={{ correction: t("adminAi.correctionLabel"), hint: t("adminAi.correctionHint"), resolve: t("adminAi.resolve") }}
                  />
                ) : (
                  <>
                    {answer.correction && (
                      <div className="rounded-lg border-2 border-brand bg-brand-soft px-3 py-2">
                        <p className="text-sm font-semibold">{t("assistant.corrected")}</p>
                        <GuideContent content={answer.correction} />
                      </div>
                    )}
                    {answer.reviewedAt && (
                      <p className="text-sm text-muted">
                        {t("adminAi.reviewedBy", {
                          name: answer.reviewedBy?.name ?? (answer.reviewedBy ? formatPhoneForDisplay(answer.reviewedBy.phone) : "—"),
                          date: date(answer.reviewedAt),
                        })}
                      </p>
                    )}
                  </>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
