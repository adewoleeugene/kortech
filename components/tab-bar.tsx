import type { Translator } from "@/lib/i18n";
import { TabLink } from "./nav-link";

// App-style bottom navigation for farmers on phones (hidden on wide screens, where the header has the links).
export function TabBar({ t }: { t: Translator }) {
  return (
    <nav
      aria-label={t("nav.main")}
      className="sticky bottom-0 z-20 grid grid-cols-5 border-t border-border bg-surface px-1.5 pt-2 pb-[max(14px,env(safe-area-inset-bottom))] md:hidden"
    >
      <TabLink href="/farmer" label={t("nav.tabHome")} icon="home" exact />
      <TabLink href="/guides" label={t("nav.tabGuides")} icon="book" />
      <TabLink href="/farmer/assistant" label={t("nav.tabAsk")} icon="chat" />
      <TabLink href="/suppliers" label={t("nav.tabSuppliers")} icon="store" />
      <TabLink href="/weather" label={t("nav.tabWeather")} icon="rain" />
    </nav>
  );
}
