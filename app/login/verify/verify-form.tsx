"use client";

import { useActionState } from "react";
import { FormMessage } from "@/components/form-message";
import { SubmitButton } from "@/components/submit-button";
import { type FormState, resendOtpAction, verifyOtpAction } from "../actions";

type Labels = { codeLabel: string; verify: string; resend: string };

export function VerifyForm({ labels, next }: { labels: Labels; next?: string }) {
  const [state, verify] = useActionState<FormState, FormData>(verifyOtpAction, {});
  const [resendState, resend] = useActionState<FormState>(resendOtpAction, {});
  return (
    <div className="space-y-6">
      <form action={verify} className="space-y-4">
        {next && <input type="hidden" name="next" value={next} />}
        <div className="space-y-1">
          <label htmlFor="code" className="block font-semibold">
            {labels.codeLabel}
          </label>
          <input
            id="code"
            name="code"
            inputMode="numeric"
            autoComplete="one-time-code"
            pattern="[0-9 ]*"
            maxLength={7}
            required
            className="min-h-12 w-full rounded-lg border-2 border-border bg-background px-4 text-center text-2xl tracking-[0.4em]"
          />
        </div>
        <FormMessage error={state.error} />
        <SubmitButton>{labels.verify}</SubmitButton>
      </form>
      <form action={resend} className="space-y-2 text-center">
        <FormMessage error={resendState.error} notice={resendState.notice} />
        <SubmitButton variant="link">{labels.resend}</SubmitButton>
      </form>
    </div>
  );
}
