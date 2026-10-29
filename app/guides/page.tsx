import type { Metadata } from "next";
import Link from "next/link";
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
      <Link href={`/guides/${c.slug}`} className="flex min-h-14 items-center justify-between gap-3 px-4 py-2 hover:bg-surface">
        <span className="font-semibold">{c.name}</span>
        <span className="text-sm text-muted">{c.publishedSections ? t("guides.sections", { count: c.publishedSections }) : t("guides.comingSoon")}</span>
      </Link>
    </li>
  );
  const mine = crops.filter((c) => myCropIds.has(c.id));

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h1 className="text-2xl font-bold">{t("guides.title")}</h1>
        <p className="text-muted">{t("guides.intro")}</p>
      </div>
      {mine.length > 0 && (
        <section className="space-y-2">
          <h2 className="text-lg font-semibold">{t("guides.yourCrops")}</h2>
          <ul className="divide-y divide-border rounded-lg border-2 border-brand">{mine.map(cropLink)}</ul>
        </section>
      )}
      <section className="space-y-2">
        <h2 className="text-lg font-semibold">{t("guides.allCrops")}</h2>
        <ul className="divide-y divide-border rounded-lg border border-border">{crops.map(cropLink)}</ul>
      </section>
    </div>
  );
}
