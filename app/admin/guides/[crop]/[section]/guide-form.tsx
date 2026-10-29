"use client";

import { useActionState } from "react";
import { FormMessage } from "@/components/form-message";
import { SubmitButton } from "@/components/submit-button";
import type { GuideFormState } from "./actions";

export function GuideForm({
  action,
  content,
  labels,
}: {
  action: (state: GuideFormState, formData: FormData) => Promise<GuideFormState>;
  content: string;
  labels: { contentLabel: string; contentHint: string; save: string };
}) {
  const [state, formAction] = useActionState(action, {});
  return (
    <form action={formAction} className="space-y-3">
      <label htmlFor="content" className="block font-semibold">{labels.contentLabel}</label>
      <textarea
        id="content"
        name="content"
        rows={14}
        defaultValue={content}
        aria-describedby="content-hint"
        className="w-full rounded-lg border-2 border-border bg-background px-4 py-3 font-mono text-sm"
      />
      <p id="content-hint" className="text-sm text-muted">{labels.contentHint}</p>
      <FormMessage error={state.error} notice={state.notice} />
      <SubmitButton>{labels.save}</SubmitButton>
    </form>
  );
}
