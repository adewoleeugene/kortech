import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { findOrCreateUserByPhone } from "@/lib/auth/users";
import { db } from "@/lib/db";
import { getPublishedGuide, listCropsWithGuides, reviewAndPublishGuide, saveGuideSection, unpublishGuide } from "@/lib/guides/guides";
import { seedDraftGuides } from "@/prisma/seed-guides";
import { seedReferenceData } from "@/prisma/seed-reference";
import { clearAccountData, testPhone } from "../helpers/db";

let rice: { id: string };

beforeAll(async () => {
  await seedReferenceData(db);
  rice = await db.crop.findUniqueOrThrow({ where: { slug: "rice" } });
});
beforeEach(async () => {
  await db.cropGuide.deleteMany();
  await clearAccountData();
});
afterAll(() => db.$disconnect());

async function agronomist(name = "Dr. Fatu Kamara") {
  const user = (await findOrCreateUserByPhone(testPhone()))!;
  return db.user.update({ where: { id: user.id }, data: { role: "AGRONOMIST", name } });
}

describe("draft guides seed", () => {
  it("adds every section unpublished for production, and never overwrites edits", async () => {
    expect(await seedDraftGuides(db, { publishAsSample: false })).toEqual({ guideSectionsCreated: 72 });
    expect(await db.cropGuide.count({ where: { published: true } })).toBe(0);
    expect(await db.cropGuide.count({ where: { isSample: true } })).toBe(72);
    expect((await getPublishedGuide("rice"))?.guides).toEqual([]);

    const editor = await agronomist();
    await saveGuideSection(editor.id, rice.id, "OVERVIEW", "Edited by an agronomist, keep this.");
    expect(await seedDraftGuides(db, { publishAsSample: false })).toEqual({ guideSectionsCreated: 0 });
    expect((await db.cropGuide.findFirstOrThrow({ where: { cropId: rice.id, section: "OVERVIEW" } })).content).toBe(
      "Edited by an agronomist, keep this.",
    );
  });

  it("publishes drafts as labelled samples in development", async () => {
    await seedDraftGuides(db, { publishAsSample: true });
    const guide = await getPublishedGuide("rice");
    expect(guide?.guides).toHaveLength(8);
    expect(guide?.guides.every((g) => g.isSample && !g.reviewedAt)).toBe(true);
  });
});

describe("review workflow", () => {
  it("farmers only see sections after they are reviewed and published, in section order", async () => {
    const editor = await agronomist();
    const harvest = await saveGuideSection(editor.id, rice.id, "HARVEST", "Harvest when most grains are straw coloured.");
    const overview = await saveGuideSection(editor.id, rice.id, "OVERVIEW", "Rice is the main food crop in Sierra Leone.");
    if (!harvest.ok || !overview.ok) throw new Error("save failed");
    expect((await getPublishedGuide("rice"))?.guides).toEqual([]);

    const reviewedAt = new Date("2026-11-03T09:00:00Z");
    await reviewAndPublishGuide(editor.id, harvest.guideId, reviewedAt);
    await reviewAndPublishGuide(editor.id, overview.guideId, reviewedAt);
    const guide = await getPublishedGuide("rice");
    expect(guide?.guides.map((g) => g.section)).toEqual(["OVERVIEW", "HARVEST"]);
    expect(guide?.guides[0]).toMatchObject({ reviewedAt, isSample: false, reviewedBy: { name: "Dr. Fatu Kamara" } });
    expect((await listCropsWithGuides()).find((c) => c.slug === "rice")?.publishedSections).toBe(2);
  });

  it("editing a published section clears the review and takes it offline until re-reviewed", async () => {
    const editor = await agronomist();
    const saved = await saveGuideSection(editor.id, rice.id, "SOIL", "Build bunds so you can hold and drain water.");
    if (!saved.ok) throw new Error("save failed");
    await reviewAndPublishGuide(editor.id, saved.guideId);

    await saveGuideSection(editor.id, rice.id, "SOIL", "Build bunds and channels so you can hold and drain water.");
    const row = await db.cropGuide.findUniqueOrThrow({ where: { id: saved.guideId } });
    expect(row).toMatchObject({ published: false, reviewedAt: null, reviewedById: null, updatedById: editor.id });
    expect((await getPublishedGuide("rice"))?.guides).toEqual([]);
  });

  it("reviewing sample text turns it into reviewed content", async () => {
    await seedDraftGuides(db, { publishAsSample: true });
    const editor = await agronomist();
    const sample = await db.cropGuide.findFirstOrThrow({ where: { cropId: rice.id, section: "PESTS" } });
    await reviewAndPublishGuide(editor.id, sample.id);
    expect(await db.cropGuide.findUniqueOrThrow({ where: { id: sample.id } })).toMatchObject({ isSample: false, published: true, reviewedById: editor.id });
  });

  it("rejects too-short content and unknown crops; unpublish hides a section", async () => {
    const editor = await agronomist();
    expect(await saveGuideSection(editor.id, rice.id, "SOIL", "short")).toEqual({ ok: false, error: "invalid_content" });
    expect(await saveGuideSection(editor.id, "missing", "SOIL", "Long enough content here.")).toEqual({ ok: false, error: "not_found" });

    const saved = await saveGuideSection(editor.id, rice.id, "SOIL", "Long enough content here.");
    if (!saved.ok) throw new Error("save failed");
    await reviewAndPublishGuide(editor.id, saved.guideId);
    await unpublishGuide(editor.id, saved.guideId);
    expect((await getPublishedGuide("rice"))?.guides).toEqual([]);
  });

  it("every edit, review and unpublish is in the audit log", async () => {
    const editor = await agronomist();
    const saved = await saveGuideSection(editor.id, rice.id, "STORAGE", "Dry paddy well before storing it.");
    if (!saved.ok) throw new Error("save failed");
    await reviewAndPublishGuide(editor.id, saved.guideId);
    await unpublishGuide(editor.id, saved.guideId);
    const actions = (await db.auditLog.findMany({ where: { entityId: saved.guideId }, orderBy: { createdAt: "asc" } })).map((a) => a.action);
    expect(actions).toEqual(["guide.updated", "guide.reviewed", "guide.unpublished"]);
  });
});
