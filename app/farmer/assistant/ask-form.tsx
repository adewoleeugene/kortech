"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { FormMessage } from "@/components/form-message";
import { type AskState, askAction } from "./actions";

type Labels = { questionLabel: string; placeholder: string; ask: string; asking: string };

function AskButton({ labels }: { labels: Labels }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} aria-busy={pending} className="min-h-12 w-full rounded-lg bg-brand px-6 text-lg font-semibold text-brand-foreground disabled:opacity-60">
      {pending ? labels.asking : labels.ask}
    </button>
  );
}

export function AskForm({ conversationId, labels, disabled }: { conversationId?: string; labels: Labels; disabled: boolean }) {
  const [state, action] = useActionState<AskState, FormData>(askAction, {});
  return (
    <form action={action} className="space-y-3">
      {conversationId && <input type="hidden" name="conversationId" value={conversationId} />}
      <label htmlFor="question" className="block font-semibold">{labels.questionLabel}</label>
      <textarea
        id="question"
        name="question"
        rows={3}
        required
        minLength={3}
        maxLength={500}
        disabled={disabled}
        placeholder={labels.placeholder}
        className="w-full rounded-lg border-2 border-border bg-background px-4 py-3 text-lg disabled:opacity-60"
      />
      <FormMessage error={state.error} />
      {!disabled && <AskButton labels={labels} />}
    </form>
  );
}
