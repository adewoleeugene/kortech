import type { Metadata } from "next";
import Link from "next/link";
import { requireArea } from "@/lib/auth/server";
import { getFarmerProfile } from "@/lib/farmer/profile";
import type { TranslationKey } from "@/lib/i18n";
import { getTranslator } from "@/lib/i18n/server";

export const metadata: Metadata = { title: "My farm" };

const upcoming: { key: TranslationKey; icon: string }[] = [
  { key: "home.featureAdvice", icon: "🌱" },
  { key: "home.featureWeather", icon: "🌦️" },
  { key: "home.featureSuppliers", icon: "🧰" },
  { key: "home.featureMarket", icon: "🧺" },
  { key: "home.featureFinance", icon: "🏦" },
];

export default async function FarmerDashboard() {
  // The layout already checked access; this re-check keeps the page safe on its own.
  const user = await requireArea("farmer");
  const [{ t }, profile] = await Promise.all([getTranslator(), getFarmerProfile(user.id)]);
  if (!profile) return null;

  const unit = profile.farmSizeUnit === "HECTARE" ? t("onboarding.unitHectare") : t("onboarding.unitAcre");
  const rows: [string, string][] = [
    [t("farmer.district"), profile.district.name],
    [t("farmer.chiefdom"), profile.chiefdom?.name ?? t("farmer.notSet")],
    [t("farmer.crops"), profile.crops.map((c) => c.name).join(", ")],
    [t("farmer.farmSize"), profile.farmSize ? t("farmer.farmSizeValue", { size: profile.farmSize.toString(), unit }) : t("farmer.notSet")],
  ];

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-bold">{t("farmer.welcome", { name: user.name ?? "" })}</h1>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">{t("farmer.yourFarm")}</h2>
        <dl className="divide-y divide-border rounded-lg border border-border">
          {rows.map(([label, value]) => (
            <div key={label} className="flex justify-between gap-4 px-4 py-3">
              <dt className="text-muted">{label}</dt>
              <dd className="text-right font-medium">{value}</dd>
            </div>
          ))}
        </dl>
        <Link href="/onboarding" className="inline-flex min-h-12 items-center font-semibold text-brand underline underline-offset-4">
          {t("farmer.editProfile")}
        </Link>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">{t("farmer.comingSoon")}</h2>
        <p className="text-muted">{t("farmer.comingSoonIntro")}</p>
        <ul className="divide-y divide-border rounded-lg border border-border">
          {upcoming.map((f) => (
            <li key={f.key} className="flex min-h-14 items-center gap-3 px-4">
              <span aria-hidden className="text-2xl">{f.icon}</span>
              <span>{t(f.key)}</span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
