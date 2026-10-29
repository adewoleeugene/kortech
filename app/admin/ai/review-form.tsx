"use client";

import { useActionState } from "react";
import { FormMessage } from "@/components/form-message";
import { SubmitButton } from "@/components/submit-button";
import { type ReviewState, resolveReviewAction } from "./actions";

export function ReviewForm({ messageId, labels }: { messageId: string; labels: { correction: string; hint: string; resolve: string } }) {
  const [state, action] = useActionState<ReviewState, FormData>(resolveReviewAction.bind(null, messageId), {});
  return (
    <form action={action} className="space-y-2">
      <label htmlFor={`correction-${messageId}`} className="block text-sm font-semibold">{labels.correction}</label>
      <textarea id={`correction-${messageId}`} name="correction" rows={3} maxLength={2000} aria-describedby={`hint-${messageId}`}
        className="w-full rounded-lg border-2 border-border bg-background px-3 py-2" />
      <p id={`hint-${messageId}`} className="text-sm text-muted">{labels.hint}</p>
      <FormMessage error={state.error} />
      <SubmitButton>{labels.resolve}</SubmitButton>
    </form>
  );
}
