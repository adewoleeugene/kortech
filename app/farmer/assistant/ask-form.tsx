"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { FormMessage } from "@/components/form-message";
import { Icon } from "@/components/icons";
import { type AskState, askAction } from "./actions";

type Labels = { questionLabel: string; placeholder: string; ask: string; asking: string };

function AskButton({ labels }: { labels: Labels }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} aria-busy={pending} className="inline-flex min-h-13 items-center justify-center gap-2 rounded-2xl bg-brand px-6 text-lg font-bold text-white hover:bg-brand-dark disabled:opacity-60 sm:self-end">
      <Icon name="send" size={20} />
      {pending ? labels.asking : labels.ask}
    </button>
  );
}

export function AskForm({ conversationId, labels, disabled }: { conversationId?: string; labels: Labels; disabled: boolean }) {
  const [state, action] = useActionState<AskState, FormData>(askAction, {});
  return (
    <form action={action} className="flex flex-col gap-3">
      {conversationId && <input type="hidden" name="conversationId" value={conversationId} />}
      <label htmlFor="question" className="block font-bold">{labels.questionLabel}</label>
      <textarea
        id="question"
        name="question"
        rows={3}
        required
        minLength={3}
        maxLength={500}
        disabled={disabled}
        placeholder={labels.placeholder}
        className="w-full resize-none rounded-2xl border-[1.5px] border-border bg-surface px-4 py-3 text-lg focus:border-brand focus:outline-none disabled:opacity-60"
      />
      <FormMessage error={state.error} />
      {!disabled && <AskButton labels={labels} />}
    </form>
  );
}
