import type { GuideSection, PrismaClient } from "@prisma/client";
import { guideSeeds } from "./data/guides";

// Adds the draft starter guides (prisma/data/guides.ts) for any section that doesn't exist yet.
// Never overwrites a section someone has edited or reviewed.
// publishAsSample: development only. Shows the drafts to farmers, labelled "Sample, not reviewed".
export async function seedDraftGuides(db: PrismaClient, { publishAsSample }: { publishAsSample: boolean }) {
  let created = 0;
  for (const [slug, sections] of Object.entries(guideSeeds)) {
    const crop = await db.crop.findUnique({ where: { slug } });
    if (!crop) throw new Error(`Unknown crop ${slug}; seed reference data first`);
    for (const [section, content] of Object.entries(sections) as [GuideSection, string][]) {
      const exists = await db.cropGuide.findUnique({ where: { cropId_section: { cropId: crop.id, section } } });
      if (exists) continue;
      await db.cropGuide.create({ data: { cropId: crop.id, section, content, isSample: true, published: publishAsSample } });
      created += 1;
    }
  }
  return { guideSectionsCreated: created };
}
