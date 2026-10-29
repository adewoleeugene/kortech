import type { GuideSection } from "@prisma/client";
import type { Metadata } from "next";
import Link from "next/link";
import { GuideContent } from "@/components/guide-content";
import { Icon } from "@/components/icons";
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
    <div className="wide flex flex-wrap items-start gap-6">
      <section aria-labelledby="chat-heading" className="flex min-w-0 flex-[2_1_520px] flex-col gap-4">
        <div className="flex flex-wrap items-end justify-between gap-2">
          <div className="space-y-1">
            <h1 id="chat-heading" className="text-3xl font-bold">{t("assistant.title")}</h1>
            <p className="text-muted">{t("assistant.intro")}</p>
          </div>
          <p className="rounded-full bg-brand-soft px-3 py-1.5 text-sm font-bold text-brand-dark" data-testid="remaining">
            {t("assistant.remaining", { count: left, limit })}
          </p>
        </div>

        <div className="flex flex-col gap-4 rounded-3xl border border-border bg-surface p-4 sm:p-5">
          <p className="flex items-center gap-2 text-[13px] text-muted">
            <Icon name="lock" size={14} />
            {t("assistant.consent")}
          </p>

          {!conversation || conversation.messages.length === 0 ? (
            <p className="rounded-2xl bg-background px-4 py-6 text-center text-muted">{t("assistant.empty")}</p>
          ) : (
            <ol className="flex flex-col gap-4" data-testid="conversation">
              {conversation.messages.map((m) =>
                m.role === "USER" ? (
                  <li key={m.id} className="max-w-[min(100%,460px)] self-end rounded-[20px_20px_6px_20px] bg-brand px-4 py-3 text-white">
                    <p className="sr-only">{t("assistant.you")}</p>
                    <p className="whitespace-pre-line">{m.content}</p>
                  </li>
                ) : (
                  <li
                    key={m.id}
                    id={`a-${m.id}`}
                    className="flex max-w-[min(100%,640px)] flex-col gap-3 self-start rounded-[20px_20px_20px_6px] bg-background p-4"
                    data-testid="answer"
                  >
                    <p className="flex items-center gap-2 text-[13px] font-bold text-brand">
                      <span className="flex size-6 items-center justify-center rounded-[7px] bg-brand text-white">
                        <Icon name="leaf" size={14} strokeWidth={2.4} />
                      </span>
                      {t("assistant.smartfarm")}
                    </p>
                    <GuideContent content={m.content} />
                    <Sources sources={m.sources as AnswerSource[]} label={t("assistant.sources")} sectionLabel={(s) => t(`guides.section_${s as GuideSection}`)} />
                    {m.correction && (
                      <div className="rounded-2xl border-2 border-brand bg-brand-soft px-3 py-2" data-testid="correction">
                        <p className="flex items-center gap-1.5 text-sm font-bold">
                          <Icon name="check" size={16} /> {t("assistant.corrected")}
                        </p>
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

          <div className="border-t border-border pt-4">
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
            {left === 0 && <p role="status" className="mt-3 rounded-2xl bg-sun-soft px-4 py-3 text-sun-ink">{t("assistant.errorDailyLimit", { limit })}</p>}
          </div>
        </div>

        {conversation && (
          <Link href="/farmer/assistant?new=1" className="inline-flex min-h-11 items-center self-start font-semibold">
            {t("assistant.newConversation")}
          </Link>
        )}
      </section>

      <aside className="flex min-w-0 flex-[1_1_280px] flex-col gap-4 lg:pt-20">
        <div className="flex flex-col gap-2.5 rounded-[20px] border border-border bg-surface p-5">
          <h2 className="font-sans text-base font-bold tracking-normal">{t("assistant.tryAsking")}</h2>
          {(["assistant.example1", "assistant.example2", "assistant.example3"] as const).map((k) => (
            <p key={k} className="rounded-xl bg-background px-3.5 py-2.5 text-[15px]">{t(k)}</p>
          ))}
        </div>
        <div className="flex gap-3 rounded-[20px] bg-sun-soft p-5 text-sun-ink">
          <Icon name="shield" className="shrink-0" />
          <p className="text-sm leading-relaxed">{t("assistant.disclaimer")}</p>
        </div>
      </aside>
    </div>
  );
}

function Sources({ sources, label, sectionLabel }: { sources: AnswerSource[]; label: string; sectionLabel: (s: string) => string }) {
  if (!sources?.length) return null;
  return (
    <div className="flex flex-wrap items-center gap-2 border-t border-border pt-3 text-sm" data-testid="sources">
      <p className="mr-1 text-xs font-bold uppercase tracking-wide text-muted">{label}</p>
      <ul className="contents">
        {sources.map((s) => (
          <li key={s.n}>
            <Link
              href={`/guides/${s.cropSlug}#${s.section.toLowerCase()}`}
              className="inline-flex min-h-9 items-center rounded-full border border-border bg-surface px-3 font-semibold no-underline"
            >
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
  const button = (value: "1" | "-1", label: string) => (
    <button
      type="submit"
      name="rating"
      value={value}
      aria-pressed={rating === Number(value)}
      className="inline-flex min-h-11 items-center gap-1.5 rounded-xl border-[1.5px] border-border bg-surface px-3 text-sm font-semibold text-muted aria-pressed:border-brand aria-pressed:bg-brand-soft aria-pressed:text-brand"
    >
      <Icon name="thumbUp" size={18} className={value === "-1" ? "rotate-180" : undefined} /> {label}
    </button>
  );

  return (
    <div className="flex flex-wrap items-start gap-2">
      <form action={rateAction} className="flex flex-wrap items-center gap-2">
        {hidden}
        {button("1", labels.helpful)}
        {button("-1", labels.notHelpful)}
        {rating !== null && <span className="text-sm text-muted">{labels.rated}</span>}
      </form>
      {reported ? (
        <p className="ml-auto inline-flex min-h-11 items-center gap-1.5 text-sm text-muted">
          <Icon name="flag" size={16} /> {labels.reported}
        </p>
      ) : (
        <details className="ml-auto">
          <summary className="inline-flex min-h-11 cursor-pointer items-center gap-1.5 text-sm font-semibold text-muted">
            <Icon name="flag" size={16} /> {labels.report}
          </summary>
          <form action={reportAction} className="mt-2 space-y-2">
            {hidden}
            <label htmlFor={`note-${messageId}`} className="block text-sm font-bold">{labels.reportNote}</label>
            <textarea id={`note-${messageId}`} name="note" rows={2} maxLength={500} className="w-full rounded-xl border-2 border-border bg-surface px-3 py-2" />
            <button type="submit" className="min-h-11 rounded-xl border-2 border-red-700 px-4 text-sm font-semibold text-red-700">
              {labels.reportSend}
            </button>
          </form>
        </details>
      )}
    </div>
  );
}
