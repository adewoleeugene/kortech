"use client";

import { useFormStatus } from "react-dom";

export function SubmitButton({ children, variant = "primary" }: { children: React.ReactNode; variant?: "primary" | "link" }) {
  const { pending } = useFormStatus();
  const className =
    variant === "primary"
      ? "min-h-12 w-full rounded-lg bg-brand px-6 text-lg font-semibold text-brand-foreground disabled:opacity-60"
      : "min-h-12 font-semibold text-brand underline underline-offset-4 disabled:opacity-60";
  return (
    <button type="submit" disabled={pending} aria-busy={pending} className={className}>
      {children}
    </button>
  );
}
