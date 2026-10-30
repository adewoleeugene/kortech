"use client";

import { useActionState } from "react";
import { FormMessage } from "@/components/form-message";
import { SubmitButton } from "@/components/submit-button";
import { type DecisionState, approveFarmerAction, rejectFarmerAction } from "./actions";

type Labels = { approve: string; reject: string; reason: string; reasonHint: string };

export function FarmerDecisionForms({ userId, labels }: { userId: string; labels: Labels }) {
  const [approveState, approve] = useActionState<DecisionState>(approveFarmerAction.bind(null, userId), {});
  const [rejectState, reject] = useActionState<DecisionState, FormData>(rejectFarmerAction.bind(null, userId), {});

  return (
    <div className="grid gap-6 sm:grid-cols-2">
      <form action={approve} className="space-y-3">
        <FormMessage error={approveState.error} />
        <SubmitButton>{labels.approve}</SubmitButton>
      </form>
      <form action={reject} className="space-y-3">
        <label htmlFor="reason" className="block font-semibold">{labels.reason}</label>
        <textarea
          id="reason"
          name="reason"
          rows={3}
          required
          minLength={10}
          maxLength={500}
          aria-describedby="reason-hint"
          className="w-full rounded-lg border-2 border-border bg-background px-4 py-3"
        />
        <p id="reason-hint" className="text-sm text-muted">{labels.reasonHint}</p>
        <FormMessage error={rejectState.error} />
        <button type="submit" className="min-h-12 w-full rounded-lg border-2 border-red-700 px-6 font-semibold text-red-700 dark:border-red-300 dark:text-red-300">
          {labels.reject}
        </button>
      </form>
    </div>
  );
}
