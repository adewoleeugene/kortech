import type { PrismaClient } from "@prisma/client";
import { crops } from "./data/crops";
import { districts } from "./data/districts";

// Idempotent: safe to run on every deploy and in tests.
export async function seedReferenceData(db: PrismaClient) {
  for (const d of districts) {
    const district = await db.district.upsert({
      where: { slug: d.slug },
      update: { name: d.name, province: d.province, latitude: d.latitude, longitude: d.longitude },
      create: { name: d.name, slug: d.slug, province: d.province, latitude: d.latitude, longitude: d.longitude },
    });
    for (const name of d.chiefdoms) {
      await db.chiefdom.upsert({
        where: { districtId_name: { districtId: district.id, name } },
        update: {},
        create: { districtId: district.id, name },
      });
    }
  }

  for (const c of crops) {
    await db.crop.upsert({
      where: { slug: c.slug },
      update: { name: c.name, group: c.group, isPriority: c.isPriority },
      create: c,
    });
  }

  return {
    districts: await db.district.count(),
    chiefdoms: await db.chiefdom.count(),
    crops: await db.crop.count(),
  };
}
