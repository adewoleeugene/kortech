import Link from "next/link";
import { redirect } from "next/navigation";
import { Icon, type IconName } from "@/components/icons";
import { homePathForRole } from "@/lib/auth/access";
import { getCurrentUser } from "@/lib/auth/server";
import type { TranslationKey } from "@/lib/i18n";
import { getTranslator } from "@/lib/i18n/server";
import { PhoneForm } from "./login/phone-form";

export const dynamic = "force-dynamic";

const features: { title: TranslationKey; body: TranslationKey; icon: IconName; href?: string }[] = [
  { title: "home.featureAdvice", body: "home.featureAdviceBody", icon: "book", href: "/guides" },
  { title: "home.featureWeather", body: "home.featureWeatherBody", icon: "rain", href: "/weather" },
  { title: "home.featureSuppliers", body: "home.featureSuppliersBody", icon: "shield", href: "/suppliers" },
  { title: "home.featureMarketTitle", body: "home.featureMarketBody", icon: "basket" },
];

export default async function HomePage() {
  const [{ t }, user] = await Promise.all([getTranslator(), getCurrentUser()]);
  // Signed in: the app opens on your own dashboard.
  if (user) redirect(homePathForRole(user.role));

  return (
    <div className="bleed">
      <section className="relative overflow-hidden bg-brand text-white">
        <div aria-hidden="true" className="absolute -top-36 -right-32 size-[520px] rounded-full bg-brand-dark" />
        <div aria-hidden="true" className="absolute -bottom-56 -left-20 size-[420px] rounded-full bg-sun/90" />
        <div className="relative mx-auto flex max-w-6xl flex-wrap items-center gap-10 px-4 pt-10 pb-16 sm:px-5 lg:pt-16 lg:pb-20">
          <div className="flex min-w-0 flex-[1_1_420px] flex-col gap-5">
            <p className="text-sm font-bold uppercase tracking-[0.08em] text-sun">{t("home.kicker")}</p>
            <h1 className="whitespace-pre-line text-5xl leading-none font-bold tracking-tight sm:text-6xl">{t("home.title")}</h1>
            <p className="max-w-xl text-lg leading-relaxed text-brand-tint sm:text-xl">{t("home.intro")}</p>
          </div>

          <div className="flex w-full min-w-0 max-w-md flex-[1_1_340px] flex-col gap-4 rounded-[28px] bg-surface px-6 py-7 text-foreground shadow-xl shadow-brand-dark/20">
            <div className="space-y-1">
              <h2 className="text-[26px] leading-tight font-bold">{t("login.title")}</h2>
              <p className="text-[15px] text-muted">{t("login.intro")}</p>
            </div>
            <PhoneForm labels={{ phoneLabel: t("login.phoneLabel"), phoneHint: t("login.phoneHint"), sendCode: t("login.sendCode") }} />
            <p className="text-center text-sm text-muted">
              {t("home.businessLine")}{" "}
              <Link href="/login" className="font-bold">
                {t("home.businessCta")}
              </Link>
            </p>
          </div>
        </div>
      </section>

      <section className="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-10 sm:px-5">
        <h2 className="text-[28px] font-bold">{t("home.featuresTitle")}</h2>
        <ul className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,250px),1fr))] gap-4">
          {features.map((f) => {
            const body = (
              <>
                <span className="flex size-11 items-center justify-center rounded-xl bg-brand-soft text-brand">
                  <Icon name={f.icon} />
                </span>
                <span className="font-display text-lg font-bold text-foreground">{t(f.title)}</span>
                <span className="text-[15px] leading-relaxed text-muted">{t(f.body)}</span>
              </>
            );
            return (
              <li key={f.title}>
                {f.href ? (
                  <Link href={f.href} className="flex h-full flex-col gap-2.5 rounded-[20px] border border-border bg-surface p-5 no-underline transition-colors hover:border-brand">
                    {body}
                  </Link>
                ) : (
                  <div className="flex h-full flex-col gap-2.5 rounded-[20px] border border-border bg-surface p-5">{body}</div>
                )}
              </li>
            );
          })}
        </ul>
        <div className="flex flex-col gap-2 text-[15px] text-muted">
          <p className="flex items-center gap-2.5">
            <Icon name="phone" size={20} className="shrink-0 text-brand" />
            {t("home.ussd")}
          </p>
          <p className="flex items-center gap-2.5">
            <Icon name="download" size={20} className="shrink-0 text-brand" />
            {t("home.installHint")}
          </p>
        </div>
      </section>
    </div>
  );
}
