"use client";

import { useActionState } from "react";
import { FormMessage } from "@/components/form-message";
import { SubmitButton } from "@/components/submit-button";
import { type FormState, requestOtpAction } from "./actions";

type Labels = { phoneLabel: string; phoneHint: string; sendCode: string };

export function PhoneForm({ labels, next }: { labels: Labels; next?: string }) {
  const [state, action] = useActionState<FormState, FormData>(requestOtpAction, {});
  return (
    <form action={action} className="space-y-4">
      {next && <input type="hidden" name="next" value={next} />}
      <div className="space-y-1">
        <label htmlFor="phone" className="block font-semibold">
          {labels.phoneLabel}
        </label>
        <input
          id="phone"
          name="phone"
          type="tel"
          inputMode="tel"
          autoComplete="tel"
          required
          aria-describedby="phone-hint"
          className="min-h-12 w-full rounded-lg border-2 border-border bg-background px-4 text-lg"
        />
        <p id="phone-hint" className="text-sm text-muted">
          {labels.phoneHint}
        </p>
      </div>
      <FormMessage error={state.error} />
      <SubmitButton>{labels.sendCode}</SubmitButton>
    </form>
  );
}
