"use client";

import { useActionState } from "react";
import { FormMessage } from "@/components/form-message";
import { SubmitButton } from "@/components/submit-button";
import { type FormState, requestOtpAction } from "./actions";

type Labels = { phoneLabel: string; phoneHint: string; sendCode: string };

export function PhoneForm({ labels, next, accountType }: { labels: Labels; next?: string; accountType?: string }) {
  const [state, action] = useActionState<FormState, FormData>(requestOtpAction, {});
  return (
    <form action={action} className="space-y-4">
      {next && <input type="hidden" name="next" value={next} />}
      {accountType && <input type="hidden" name="as" value={accountType} />}
      <div className="space-y-1">
        <label htmlFor="phone" className="block font-bold">
          {labels.phoneLabel}
        </label>
        <div className="flex min-h-14 items-stretch overflow-hidden rounded-2xl border-2 border-brand bg-surface focus-within:ring-4 focus-within:ring-brand/20">
          <span aria-hidden="true" className="flex items-center bg-brand-soft px-3.5 text-[17px] font-bold text-brand-dark">+232</span>
          <input
            id="phone"
            name="phone"
            type="tel"
            inputMode="tel"
            autoComplete="tel-national"
            required
            aria-describedby="phone-hint"
            placeholder="76 123 456"
            className="min-w-0 flex-1 bg-transparent px-3.5 text-lg tracking-wide outline-none"
          />
        </div>
        <p id="phone-hint" className="text-sm text-muted">
          {labels.phoneHint}
        </p>
      </div>
      <FormMessage error={state.error} />
      <SubmitButton>{labels.sendCode}</SubmitButton>
    </form>
  );
}
