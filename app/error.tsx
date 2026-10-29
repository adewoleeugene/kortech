"use client";

import { useEffect } from "react";
import { createTranslator, defaultLocale } from "@/lib/i18n";
import { reportClientError } from "@/lib/observability/client-error";

// Client components can't read the locale cookie server-side; English until Krio lands.
const t = createTranslator(defaultLocale);

export default function ErrorPage({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    reportClientError(error);
  }, [error]);

  return (
    <div className="space-y-4 py-10 text-center">
      <h1 className="text-2xl font-bold">{t("errors.title")}</h1>
      <p className="text-muted">{t("errors.body")}</p>
      <button
        type="button"
        onClick={reset}
        className="min-h-12 rounded-lg bg-brand px-6 font-semibold text-brand-foreground"
      >
        {t("errors.retry")}
      </button>
    </div>
  );
}
