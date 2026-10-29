import type { Translator } from "@/lib/i18n";

export function SiteFooter({ t }: { t: Translator }) {
  return (
    <footer className="border-t border-border">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-2 px-4 py-6 text-sm text-muted sm:px-5">
        <span>{t("footer.copyright", { year: new Date().getFullYear() })}</span>
        <span>{t("footer.tagline")}</span>
      </div>
    </footer>
  );
}
