import type { GuideSection } from "@prisma/client";
import type { Metadata } from "next";
import Link from "next/link";
import { GuideContent } from "@/components/guide-content";
import { type AnswerSource, dailyQuestionLimit, getConversation, questionsAskedToday } from "@/lib/ai/assistant";
import { requireArea } from "@/lib/auth/server";
import { getTranslator } from "@/lib/i18n/server";
import { rateAction, reportAction } from "./actions";
import { AskForm } from "./ask-form";

export const metadata: Metadata = { title: "Ask SmartFarm" };

export default async function AssistantPage({ searchParams }: { searchParams: Promise<{ c?: string; new?: string }> }) {
  const user = await requireArea("farmer");
  const { c, new: fresh } = await searchParams;
  const [{ t }, asked] = await Promise.all([getTranslator(), questionsAskedToday(user.id)]);
  const conversation = fresh ? null : await getConversation(user.id, c);
  const limit = dailyQuestionLimit();
  const left = Math.max(0, limit - asked);

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h1 className="text-2xl font-bold">{t("assistant.title")}</h1>
        <p className="text-muted">{t("assistant.intro")}</p>
        <p className="rounded-lg bg-surface px-4 py-2 text-sm">🔒 {t("assistant.consent")}</p>
      </div>

      {!conversation || conversation.messages.length === 0 ? (
        <p className="text-muted">{t("assistant.empty")}</p>
      ) : (
        <ol className="space-y-4" data-testid="conversation">
          {conversation.messages.map((m) =>
            m.role === "USER" ? (
              <li key={m.id} className="ml-8 rounded-lg bg-brand-soft px-4 py-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted">{t("assistant.you")}</p>
                <p className="whitespace-pre-line">{m.content}</p>
              </li>
            ) : (
              <li key={m.id} id={`a-${m.id}`} className="mr-4 space-y-3 rounded-lg border border-border px-4 py-3" data-testid="answer">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted">🌱 {t("assistant.smartfarm")}</p>
                <GuideContent content={m.content} />
                <Sources sources={m.sources as AnswerSource[]} label={t("assistant.sources")} sectionLabel={(s) => t(`guides.section_${s as GuideSection}`)} />
                {m.correction && (
                  <div className="rounded-lg border-2 border-brand bg-brand-soft px-3 py-2" data-testid="correction">
                    <p className="text-sm font-semibold">✅ {t("assistant.corrected")}</p>
                    <GuideContent content={m.correction} />
                  </div>
                )}
                <Feedback
                  messageId={m.id}
                  conversationId={conversation.id}
                  rating={m.rating}
                  reported={m.flagReason === "farmer_report"}
                  labels={{
                    helpful: t("assistant.helpful"),
                    notHelpful: t("assistant.notHelpful"),
                    rated: t("assistant.rated"),
                    report: t("assistant.report"),
                    reportNote: t("assistant.reportNote"),
                    reportSend: t("assistant.reportSend"),
                    reported: t("assistant.reported"),
                  }}
                />
              </li>
            ),
          )}
        </ol>
      )}

      <section className="space-y-2">
        <p className="text-sm font-semibold" data-testid="remaining">{t("assistant.remaining", { count: left, limit })}</p>
        <AskForm
          conversationId={conversation?.id}
          disabled={left === 0}
          labels={{
            questionLabel: t("assistant.questionLabel"),
            placeholder: t("assistant.questionPlaceholder"),
            ask: t("assistant.ask"),
            asking: t("assistant.asking"),
          }}
        />
        {left === 0 && <p role="status" className="rounded-lg bg-surface px-4 py-3">{t("assistant.errorDailyLimit", { limit })}</p>}
        {conversation && (
          <Link href="/farmer/assistant?new=1" className="inline-flex min-h-12 items-center text-brand underline underline-offset-4">
            {t("assistant.newConversation")}
          </Link>
        )}
      </section>

      <p className="text-sm text-muted">{t("assistant.disclaimer")}</p>
    </div>
  );
}

function Sources({ sources, label, sectionLabel }: { sources: AnswerSource[]; label: string; sectionLabel: (s: string) => string }) {
  if (!sources?.length) return null;
  return (
    <div className="text-sm" data-testid="sources">
      <p className="font-semibold">📖 {label}</p>
      <ul className="space-y-1">
        {sources.map((s) => (
          <li key={s.n}>
            <Link href={`/guides/${s.cropSlug}#${s.section.toLowerCase()}`} className="text-brand underline underline-offset-4">
              [{s.n}] {s.crop}: {sectionLabel(s.section)}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

type FeedbackLabels = Record<"helpful" | "notHelpful" | "rated" | "report" | "reportNote" | "reportSend" | "reported", string>;

// Plain forms: rating and reporting work without JavaScript.
function Feedback({ messageId, conversationId, rating, reported, labels }: {
  messageId: string; conversationId: string; rating: number | null; reported: boolean; labels: FeedbackLabels;
}) {
  const hidden = (
    <>
      <input type="hidden" name="messageId" value={messageId} />
      <input type="hidden" name="conversationId" value={conversationId} />
    </>
  );
  const button = (value: "1" | "-1", icon: string, label: string) => (
    <button type="submit" name="rating" value={value} aria-pressed={rating === Number(value)}
      className="inline-flex min-h-12 items-center gap-1 rounded-lg border-2 border-border px-3 text-sm font-semibold aria-pressed:border-brand aria-pressed:bg-brand-soft">
      <span aria-hidden>{icon}</span> {label}
    </button>
  );

  return (
    <div className="space-y-2">
      <form action={rateAction} className="flex flex-wrap items-center gap-2">
        {hidden}
        {button("1", "👍", labels.helpful)}
        {button("-1", "👎", labels.notHelpful)}
        {rating !== null && <span className="text-sm text-muted">{labels.rated}</span>}
      </form>
      {reported ? (
        <p className="text-sm text-muted">🚩 {labels.reported}</p>
      ) : (
        <details>
          <summary className="inline-flex min-h-12 cursor-pointer items-center text-sm text-muted underline underline-offset-4">🚩 {labels.report}</summary>
          <form action={reportAction} className="mt-2 space-y-2">
            {hidden}
            <label htmlFor={`note-${messageId}`} className="block text-sm font-semibold">{labels.reportNote}</label>
            <textarea id={`note-${messageId}`} name="note" rows={2} maxLength={500} className="w-full rounded-lg border-2 border-border bg-background px-3 py-2" />
            <button type="submit" className="min-h-12 rounded-lg border-2 border-red-700 px-4 text-sm font-semibold text-red-700 dark:border-red-300 dark:text-red-300">
              {labels.reportSend}
            </button>
          </form>
        </details>
      )}
    </div>
  );
}
