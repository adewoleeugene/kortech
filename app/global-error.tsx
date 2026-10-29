"use client";

import { useEffect } from "react";
import { createTranslator, defaultLocale } from "@/lib/i18n";
import { reportClientError } from "@/lib/observability/client-error";

const t = createTranslator(defaultLocale);

// Replaces the root layout when the layout itself fails, so it renders its own <html>.
export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    reportClientError(error);
  }, [error]);

  return (
    <html lang={defaultLocale}>
      <body style={{ fontFamily: "system-ui, sans-serif", padding: 24, textAlign: "center" }}>
        <h1>{t("errors.title")}</h1>
        <p>{t("errors.body")}</p>
        <button type="button" onClick={reset} style={{ minHeight: 48, padding: "0 24px" }}>
          {t("errors.retry")}
        </button>
      </body>
    </html>
  );
}
