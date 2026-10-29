import type { Translator } from "@/lib/i18n";

export function SiteFooter({ t }: { t: Translator }) {
  return (
    <footer className="border-t border-border py-6 text-center text-sm text-muted">
      {t("footer.copyright", { year: new Date().getFullYear() })}
    </footer>
  );
}
