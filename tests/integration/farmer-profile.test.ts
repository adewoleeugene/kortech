import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { findOrCreateUserByPhone } from "@/lib/auth/users";
import { db } from "@/lib/db";
import { getFarmerProfile, saveFarmerProfile } from "@/lib/farmer/profile";
import { seedReferenceData } from "@/prisma/seed-reference";
import { clearAccountData, testPhone } from "../helpers/db";

let bo: { id: string; chiefdomId: string };
let kenemaChiefdomId: string;
let riceId: string;
let cassavaId: string;

beforeAll(async () => {
  await seedReferenceData(db);
  const boRow = await db.district.findUniqueOrThrow({ where: { slug: "bo" }, include: { chiefdoms: true } });
  bo = { id: boRow.id, chiefdomId: boRow.chiefdoms[0].id };
  const kenema = await db.district.findUniqueOrThrow({ where: { slug: "kenema" }, include: { chiefdoms: true } });
  kenemaChiefdomId = kenema.chiefdoms[0].id;
  riceId = (await db.crop.findUniqueOrThrow({ where: { slug: "rice" } })).id;
  cassavaId = (await db.crop.findUniqueOrThrow({ where: { slug: "cassava" } })).id;
});
beforeEach(clearAccountData);
afterAll(() => db.$disconnect());

async function newFarmer() {
  return (await findOrCreateUserByPhone(testPhone()))!;
}

describe("saveFarmerProfile", () => {
  it("saves district, chiefdom, crops and farm size", async () => {
    const user = await newFarmer();
    const result = await saveFarmerProfile(user.id, {
      name: "Aminata Sesay",
      districtId: bo.id,
      chiefdomId: bo.chiefdomId,
      cropIds: [riceId, cassavaId],
      farmSize: "2.5",
      farmSizeUnit: "ACRE",
    });
    expect(result).toEqual({ ok: true });

    const profile = await getFarmerProfile(user.id);
    expect(profile?.districtId).toBe(bo.id);
    expect(profile?.chiefdomId).toBe(bo.chiefdomId);
    expect(profile?.crops.map((c) => c.slug)).toEqual(["cassava", "rice"]);
    expect(profile?.farmSize?.toString()).toBe("2.5");
    expect((await db.user.findUnique({ where: { id: user.id } }))?.name).toBe("Aminata Sesay");
  });

  it("allows chiefdom and farm size to be left empty", async () => {
    const user = await newFarmer();
    const result = await saveFarmerProfile(user.id, {
      name: "Musa",
      districtId: bo.id,
      chiefdomId: "",
      cropIds: [riceId],
      farmSize: "",
      farmSizeUnit: "HECTARE",
    });
    expect(result).toEqual({ ok: true });
    const profile = await getFarmerProfile(user.id);
    expect(profile?.chiefdomId).toBeNull();
    expect(profile?.farmSize).toBeNull();
  });

  it("updates crops when the profile is edited", async () => {
    const user = await newFarmer();
    const base = { name: "Musa", districtId: bo.id, farmSizeUnit: "ACRE" as const };
    await saveFarmerProfile(user.id, { ...base, cropIds: [riceId, cassavaId] });
    await saveFarmerProfile(user.id, { ...base, cropIds: [cassavaId] });
    expect((await getFarmerProfile(user.id))?.crops.map((c) => c.slug)).toEqual(["cassava"]);
  });

  it("rejects a chiefdom from another district", async () => {
    const user = await newFarmer();
    const result = await saveFarmerProfile(user.id, {
      name: "Musa",
      districtId: bo.id,
      chiefdomId: kenemaChiefdomId,
      cropIds: [riceId],
      farmSizeUnit: "ACRE",
    });
    expect(result).toEqual({ ok: false, fieldErrors: ["chiefdomId"] });
    expect(await getFarmerProfile(user.id)).toBeNull();
  });

  it("rejects missing required fields and bad values", async () => {
    const user = await newFarmer();
    const result = await saveFarmerProfile(user.id, {
      name: "",
      districtId: "",
      cropIds: [],
      farmSize: "-3",
      farmSizeUnit: "ACRE",
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.fieldErrors.sort()).toEqual(["cropIds", "districtId", "farmSize", "name"]);
    }
  });

  it("rejects unknown district and crop ids", async () => {
    const user = await newFarmer();
    const result = await saveFarmerProfile(user.id, {
      name: "Musa",
      districtId: "nope",
      cropIds: ["nope"],
      farmSizeUnit: "ACRE",
    });
    expect(result).toEqual({ ok: false, fieldErrors: ["districtId", "cropIds"] });
  });
});
