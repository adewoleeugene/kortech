import type { Metadata } from "next";
import Link from "next/link";
import { Icon } from "@/components/icons";
import { getCurrentUser } from "@/lib/auth/server";
import { db } from "@/lib/db";
import { listCropsWithGuides } from "@/lib/guides/guides";
import { getTranslator } from "@/lib/i18n/server";

export const metadata: Metadata = { title: "Crop guides" };

type Crop = Awaited<ReturnType<typeof listCropsWithGuides>>[number];

export default async function GuidesPage() {
  const [{ t }, crops, user] = await Promise.all([getTranslator(), listCropsWithGuides(), getCurrentUser()]);
  const myCropIds = user?.role === "FARMER"
    ? new Set((await db.farmerProfile.findUnique({ where: { userId: user.id }, select: { crops: { select: { id: true } } } }))?.crops.map((c) => c.id))
    : new Set<string>();

  const cropLink = (c: Crop) => (
    <li key={c.id}>
      <Link
        href={`/guides/${c.slug}`}
        className="flex h-full items-center gap-3 rounded-[20px] border border-border bg-surface p-4 text-foreground no-underline hover:border-brand hover:text-foreground"
      >
        <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-brand-soft text-brand">
          <Icon name="sprout" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-lg font-bold">{c.name}</span>
          <span className="block text-sm text-muted">{c.publishedSections ? t("guides.sections", { count: c.publishedSections }) : t("guides.comingSoon")}</span>
        </span>
        <Icon name="arrowRight" size={18} className="shrink-0 text-brand" />
      </Link>
    </li>
  );
  const mine = crops.filter((c) => myCropIds.has(c.id));

  return (
    <div className="wide space-y-6">
      <div className="space-y-1">
        <h1 className="text-3xl font-bold sm:text-4xl">{t("guides.title")}</h1>
        <p className="text-muted">{t("guides.intro")}</p>
      </div>
      {mine.length > 0 && (
        <section className="space-y-2">
          <h2 className="text-2xl font-bold">{t("guides.yourCrops")}</h2>
          <ul className="grid grid-cols-[repeat(auto-fill,minmax(min(100%,260px),1fr))] gap-3">{mine.map(cropLink)}</ul>
        </section>
      )}
      <section className="space-y-2">
        <h2 className="text-2xl font-bold">{t("guides.allCrops")}</h2>
        <ul className="grid grid-cols-[repeat(auto-fill,minmax(min(100%,260px),1fr))] gap-3">{crops.map(cropLink)}</ul>
      </section>
    </div>
  );
}
