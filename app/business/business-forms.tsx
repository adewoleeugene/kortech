"use client";

import { useActionState } from "react";
import { FormMessage } from "@/components/form-message";
import { SubmitButton } from "@/components/submit-button";
import { type ActionState, submitForVerificationAction, uploadDocumentAction } from "./actions";

export function DocumentUploadForm({
  type,
  label,
  chooseFileLabel,
  buttonLabel,
}: {
  type: "REGISTRATION_CERTIFICATE" | "LICENCE";
  label: string;
  chooseFileLabel: string;
  buttonLabel: string;
}) {
  const [state, action] = useActionState<ActionState, FormData>(uploadDocumentAction, {});
  const inputId = `file-${type}`;
  return (
    <form action={action} className="space-y-2">
      <input type="hidden" name="type" value={type} />
      <label htmlFor={inputId} className="sr-only">{`${label}: ${chooseFileLabel}`}</label>
      <input
        id={inputId}
        name="file"
        type="file"
        accept="application/pdf,image/jpeg,image/png"
        required
        className="block w-full text-sm file:mr-3 file:min-h-12 file:rounded-lg file:border-2 file:border-border file:bg-surface file:px-4 file:font-semibold"
      />
      <FormMessage error={state.error} notice={state.notice} />
      <SubmitButton variant="link">{buttonLabel}</SubmitButton>
    </form>
  );
}

export function SubmitForVerificationForm({ label }: { label: string }) {
  const [state, action] = useActionState<ActionState>(submitForVerificationAction, {});
  return (
    <form action={action} className="space-y-3">
      <FormMessage error={state.error} />
      <SubmitButton>{label}</SubmitButton>
    </form>
  );
}
