import { afterAll, describe, expect, it } from "vitest";
import { GET as health } from "@/app/api/health/route";
import { db } from "@/lib/db";
import { listChiefdoms, listCrops, listDistricts } from "@/lib/reference";
import { crops } from "@/prisma/data/crops";
import { districts } from "@/prisma/data/districts";
import { seedReferenceData } from "@/prisma/seed-reference";

const expectedChiefdoms = districts.reduce((n, d) => n + d.chiefdoms.length, 0);

afterAll(() => db.$disconnect());

describe("reference data seed (test database)", () => {
  it("loads districts, chiefdoms and crops", async () => {
    const counts = await seedReferenceData(db);
    expect(counts).toEqual({ districts: 16, chiefdoms: expectedChiefdoms, crops: crops.length });
  });

  it("is idempotent when run again", async () => {
    const counts = await seedReferenceData(db);
    expect(counts).toEqual({ districts: 16, chiefdoms: expectedChiefdoms, crops: crops.length });
  });

  it("links chiefdoms to the right district", async () => {
    const bo = (await listDistricts()).find((d) => d.slug === "bo");
    expect(bo).toBeDefined();
    const names = (await listChiefdoms(bo!.id)).map((c) => c.name);
    expect(names).toEqual(["Badjia", "Kakua", "Tikonko"]);
  });

  it("stores coordinates used for weather", async () => {
    const freetown = await db.district.findUnique({ where: { slug: "western-area-urban" } });
    expect(freetown).toMatchObject({ latitude: 8.4844, longitude: -13.2344 });
  });

  it("lists crops in name order", async () => {
    const names = (await listCrops()).map((c) => c.name);
    expect(names).toEqual([...names].sort());
  });
});

describe("GET /api/health", () => {
  it("reports ok when the database is reachable", async () => {
    const res = await health();
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ status: "ok", database: "ok" });
  });
});
