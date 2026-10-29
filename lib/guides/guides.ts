import type { GuideSection } from "@prisma/client";
import { z } from "zod";
import { writeAudit } from "@/lib/audit";
import { db } from "@/lib/db";

// Display order of guide sections (PRD 6.3).
export const GUIDE_SECTIONS = [
  "OVERVIEW",
  "PLANTING_CALENDAR",
  "SOIL",
  "FERTILISER",
  "PESTS",
  "DISEASES",
  "HARVEST",
  "STORAGE",
] as const satisfies readonly GuideSection[];

const sectionOrder = (s: GuideSection) => GUIDE_SECTIONS.indexOf(s);

// ---------- Content format: paragraphs separated by blank lines, "- " bullets ----------

export type GuideBlock = { type: "p"; text: string } | { type: "ul"; items: string[] };

export function parseGuideContent(content: string): GuideBlock[] {
  return content
    .replace(/\r\n/g, "\n")
    .split(/\n\s*\n/)
    .map((chunk) => chunk.split("\n").map((l) => l.trim()).filter(Boolean))
    .filter((lines) => lines.length > 0)
    .map((lines): GuideBlock =>
      lines.every((l) => l.startsWith("- "))
        ? { type: "ul", items: lines.map((l) => l.slice(2).trim()) }
        : { type: "p", text: lines.join(" ") },
    );
}

// ---------- Public (farmers) ----------

export async function listCropsWithGuides() {
  const crops = await db.crop.findMany({
    orderBy: { name: "asc" },
    include: { _count: { select: { guides: { where: { published: true } } } } },
  });
  return crops.map((c) => ({ id: c.id, name: c.name, slug: c.slug, group: c.group, publishedSections: c._count.guides }));
}

export async function getPublishedGuide(cropSlug: string) {
  const crop = await db.crop.findUnique({
    where: { slug: cropSlug },
    include: { guides: { where: { published: true }, include: { reviewedBy: { select: { name: true } } } } },
  });
  if (!crop) return null;
  return { ...crop, guides: [...crop.guides].sort((a, b) => sectionOrder(a.section) - sectionOrder(b.section)) };
}

// ---------- Editors (admins and agronomists) ----------

export const guideContentSchema = z.string().trim().min(10).max(5000);

export async function getCropGuidesForEditing(cropSlug: string) {
  const crop = await db.crop.findUnique({
    where: { slug: cropSlug },
    include: {
      guides: { include: { reviewedBy: { select: { name: true, phone: true } }, updatedBy: { select: { name: true, phone: true } } } },
    },
  });
  if (!crop) return null;
  const bySection = new Map(crop.guides.map((g) => [g.section, g]));
  return { crop, sections: GUIDE_SECTIONS.map((section) => ({ section, guide: bySection.get(section) ?? null })) };
}

export type GuideEditResult = { ok: true; guideId: string } | { ok: false; error: "invalid_content" | "not_found" };

// Saving new text always clears the review and unpublishes the section until it is reviewed again,
// so farmers never see text no one has checked.
export async function saveGuideSection(editorId: string, cropId: string, section: GuideSection, content: string): Promise<GuideEditResult> {
  const parsed = guideContentSchema.safeParse(content);
  if (!parsed.success) return { ok: false, error: "invalid_content" };
  if (!(await db.crop.findUnique({ where: { id: cropId } }))) return { ok: false, error: "not_found" };

  const data = { content: parsed.data, published: false, isSample: false, reviewedById: null, reviewedAt: null, updatedById: editorId };
  return db.$transaction(async (tx) => {
    const guide = await tx.cropGuide.upsert({
      where: { cropId_section: { cropId, section } },
      create: { cropId, section, ...data },
      update: data,
    });
    await writeAudit(tx, { actorId: editorId, action: "guide.updated", entity: "CropGuide", entityId: guide.id, metadata: { section } });
    return { ok: true as const, guideId: guide.id };
  });
}

export async function reviewAndPublishGuide(reviewerId: string, guideId: string, now: Date = new Date()): Promise<GuideEditResult> {
  return db.$transaction(async (tx) => {
    const guide = await tx.cropGuide.findUnique({ where: { id: guideId } });
    if (!guide) return { ok: false as const, error: "not_found" as const };
    // Once an agronomist has reviewed it, it is no longer sample text.
    await tx.cropGuide.update({ where: { id: guideId }, data: { published: true, isSample: false, reviewedById: reviewerId, reviewedAt: now } });
    await writeAudit(tx, { actorId: reviewerId, action: "guide.reviewed", entity: "CropGuide", entityId: guideId });
    return { ok: true as const, guideId };
  });
}

export async function unpublishGuide(editorId: string, guideId: string): Promise<GuideEditResult> {
  return db.$transaction(async (tx) => {
    const guide = await tx.cropGuide.findUnique({ where: { id: guideId } });
    if (!guide) return { ok: false as const, error: "not_found" as const };
    await tx.cropGuide.update({ where: { id: guideId }, data: { published: false } });
    await writeAudit(tx, { actorId: editorId, action: "guide.unpublished", entity: "CropGuide", entityId: guideId });
    return { ok: true as const, guideId };
  });
}
