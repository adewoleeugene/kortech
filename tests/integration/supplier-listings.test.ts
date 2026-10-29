import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import type { OrgStatus, OrgType } from "@prisma/client";
import { MemoryStorage, setPublicMediaStorage } from "@/lib/adapters/storage";
import { findOrCreateUserByPhone } from "@/lib/auth/users";
import { db } from "@/lib/db";
import {
  type ListingInput,
  MAX_PHOTO_BYTES,
  createListing,
  getPublicListing,
  searchListings,
  setListingActive,
  setListingHidden,
  setListingSponsored,
  updateListing,
} from "@/lib/suppliers/listings";
import { seedReferenceData } from "@/prisma/seed-reference";
import { clearAccountData, testPhone } from "../helpers/db";
import { JPEG_BYTES, PDF_BYTES, PNG_BYTES } from "../helpers/files";

let media: MemoryStorage;
let kenema: string;
let bo: string;
let kono: string;

beforeAll(async () => {
  await seedReferenceData(db);
  const id = async (slug: string) => (await db.district.findUniqueOrThrow({ where: { slug } })).id;
  [kenema, bo, kono] = await Promise.all([id("kenema"), id("bo"), id("kono")]);
});
beforeEach(async () => {
  await clearAccountData();
  media = new MemoryStorage();
  setPublicMediaStorage(media);
});
afterAll(async () => {
  setPublicMediaStorage(null);
  await db.$disconnect();
});

// A business user with an organisation in the given state (bypasses the verification flow).
async function business(opts: { type?: OrgType; status?: OrgStatus; agrochemicals?: boolean; name?: string } = {}) {
  const user = (await findOrCreateUserByPhone(testPhone()))!;
  const type = opts.type ?? "SUPPLIER";
  await db.user.update({ where: { id: user.id }, data: { role: type } });
  const org = await db.organisation.create({
    data: {
      type,
      legalName: opts.name ?? "Kenema Agro Inputs",
      regNumber: "SL-1",
      address: "Hangha Road",
      districtId: kenema,
      contactName: "Ibrahim",
      phone: "+23276555111",
      status: opts.status ?? "APPROVED",
      sellsAgrochemicals: opts.agrochemicals ?? false,
      members: { create: { userId: user.id } },
    },
  });
  return { user, org };
}

function input(overrides: Partial<ListingInput> = {}): ListingInput {
  return {
    category: "SEEDS",
    title: "NERICA rice seed",
    description: "Certified upland rice seed, 25 kg bags.",
    price: "450",
    unit: "bag",
    districtIds: [kenema, bo],
    contactPhone: "076 555 111",
    whatsappNumber: "",
    ...overrides,
  };
}

async function created(userId: string, overrides: Partial<ListingInput> = {}) {
  const result = await createListing(userId, input(overrides));
  if (!result.ok) throw new Error(`create failed: ${JSON.stringify(result)}`);
  return result.listingId;
}

describe("creating listings", () => {
  it("an approved supplier can create a listing; price is stored in minor units", async () => {
    const { user, org } = await business();
    const id = await created(user.id, { price: "1,250.50", whatsappNumber: "077 123 456" });
    const listing = await db.supplierListing.findUniqueOrThrow({ where: { id }, include: { districts: true } });
    expect(listing).toMatchObject({
      orgId: org.id,
      priceMinor: 125050,
      unit: "bag",
      contactPhone: "+23276555111",
      whatsappNumber: "+23277123456",
      status: "ACTIVE",
      isSponsored: false,
    });
    expect(listing.districts.map((d) => d.id).sort()).toEqual([kenema, bo].sort());
  });

  it("an empty price means 'ask for price'", async () => {
    const { user } = await business();
    const id = await created(user.id, { price: "", unit: "" });
    expect(await db.supplierListing.findUnique({ where: { id } })).toMatchObject({ priceMinor: null, unit: null });
  });

  it.each(["DRAFT", "PENDING", "REJECTED"] as const)("a %s supplier can't create listings", async (status) => {
    const { user } = await business({ status });
    expect(await createListing(user.id, input())).toEqual({ ok: false, error: "not_approved" });
    expect(await db.supplierListing.count()).toBe(0);
  });

  it("buyers and lenders can't create supplier listings", async () => {
    const { user } = await business({ type: "BUYER" });
    expect(await createListing(user.id, input())).toEqual({ ok: false, error: "no_organisation" });
  });

  it("only suppliers licensed for agrochemicals can list them", async () => {
    const unlicensed = await business();
    expect(await createListing(unlicensed.user.id, input({ category: "AGROCHEMICALS" }))).toEqual({
      ok: false,
      error: "agrochemicals_not_licensed",
    });
    const licensed = await business({ agrochemicals: true });
    expect((await createListing(licensed.user.id, input({ category: "AGROCHEMICALS" }))).ok).toBe(true);
  });

  it("reports invalid fields", async () => {
    const { user } = await business();
    const result = await createListing(user.id, input({ title: "", price: "abc", districtIds: [], contactPhone: "123", whatsappNumber: "999" }));
    expect(result.ok).toBe(false);
    if (!result.ok && result.error === "invalid") {
      expect(result.fields.sort()).toEqual(["contactPhone", "districtIds", "price", "title", "whatsappNumber"]);
    }
  });

  it("refuses unknown districts", async () => {
    const { user } = await business();
    expect(await createListing(user.id, input({ districtIds: ["nope"] }))).toEqual({ ok: false, error: "invalid", fields: ["districtIds"] });
  });
});

describe("photos", () => {
  it("stores up to 3 JPG/PNG photos in public media storage", async () => {
    const { user } = await business();
    const result = await createListing(user.id, input(), [
      { name: "a.jpg", bytes: JPEG_BYTES },
      { name: "b.png", bytes: PNG_BYTES },
    ]);
    if (!result.ok) throw new Error("create failed");
    const listing = await db.supplierListing.findUniqueOrThrow({ where: { id: result.listingId } });
    expect(listing.photos).toHaveLength(2);
    expect(listing.photos[0]).toMatch(/^listing-photos\/\w+\/[0-9a-f]{24}\.jpg$/);
    expect(media.files.get(listing.photos[1])?.contentType).toBe("image/png");
  });

  it("refuses more than 3 photos, non-images and photos over 2 MB", async () => {
    const { user } = await business();
    const big = new Uint8Array(MAX_PHOTO_BYTES + 1);
    big.set(PNG_BYTES);
    for (const photos of [
      Array.from({ length: 4 }, () => ({ name: "x.png", bytes: PNG_BYTES })),
      [{ name: "doc.pdf", bytes: PDF_BYTES }],
      [{ name: "big.png", bytes: big }],
    ]) {
      expect(await createListing(user.id, input(), photos)).toEqual({ ok: false, error: "invalid", fields: ["photos"] });
    }
    expect(media.files.size).toBe(0);
  });

  it("new photos on edit replace the old ones; no photos keeps them", async () => {
    const { user } = await business();
    const result = await createListing(user.id, input(), [{ name: "a.jpg", bytes: JPEG_BYTES }]);
    if (!result.ok) throw new Error("create failed");
    const [oldKey] = (await db.supplierListing.findUniqueOrThrow({ where: { id: result.listingId } })).photos;

    await updateListing(user.id, result.listingId, input({ title: "Renamed" }));
    expect((await db.supplierListing.findUniqueOrThrow({ where: { id: result.listingId } })).photos).toEqual([oldKey]);

    await updateListing(user.id, result.listingId, input(), [{ name: "b.png", bytes: PNG_BYTES }]);
    const photos = (await db.supplierListing.findUniqueOrThrow({ where: { id: result.listingId } })).photos;
    expect(photos).toHaveLength(1);
    expect(photos[0]).not.toBe(oldKey);
    expect(media.files.has(oldKey)).toBe(false);
  });
});

describe("editing and turning listings off", () => {
  it("a supplier can edit its own listing but not someone else's", async () => {
    const a = await business();
    const b = await business({ name: "Other Supplier" });
    const id = await created(a.user.id);
    expect(await updateListing(a.user.id, id, input({ title: "Better rice seed", districtIds: [kono] }))).toEqual({ ok: true, listingId: id });
    const listing = await db.supplierListing.findUniqueOrThrow({ where: { id }, include: { districts: true } });
    expect(listing.title).toBe("Better rice seed");
    expect(listing.districts.map((d) => d.id)).toEqual([kono]);

    expect(await updateListing(b.user.id, id, input({ title: "Hijacked" }))).toEqual({ ok: false, error: "not_found" });
    expect(await setListingActive(b.user.id, id, false)).toEqual({ ok: false, error: "not_found" });
  });

  it("turned-off listings disappear from the directory and can come back", async () => {
    const { user } = await business();
    const id = await created(user.id);
    await setListingActive(user.id, id, false);
    expect(await getPublicListing(id)).toBeNull();
    await setListingActive(user.id, id, true);
    expect(await getPublicListing(id)).not.toBeNull();
  });

  it("a supplier can't un-hide a listing an admin hid", async () => {
    const { user } = await business();
    const admin = await findOrCreateUserByPhone(testPhone());
    const id = await created(user.id);
    await setListingHidden(admin!.id, id, true);
    expect(await setListingActive(user.id, id, true)).toEqual({ ok: false, error: "not_found" });
    expect((await db.supplierListing.findUniqueOrThrow({ where: { id } })).status).toBe("HIDDEN");
  });
});

describe("public directory: farmers see only approved, active listings", () => {
  it("excludes listings from organisations that are not approved, and inactive or hidden listings", async () => {
    const approved = await business({ name: "Approved Supplier" });
    const visible = await created(approved.user.id, { title: "Visible seed" });
    const off = await created(approved.user.id, { title: "Turned off seed" });
    await setListingActive(approved.user.id, off, false);
    const hidden = await created(approved.user.id, { title: "Hidden seed" });
    await setListingHidden(approved.user.id, hidden, true);

    // A listing whose organisation later lost approval (e.g. set back to PENDING by staff).
    const lapsed = await business({ name: "Lapsed Supplier" });
    const lapsedId = await created(lapsed.user.id, { title: "Lapsed seed" });
    await db.organisation.update({ where: { id: lapsed.org.id }, data: { status: "PENDING" } });

    const result = await searchListings({});
    expect(result.listings.map((l) => l.id)).toEqual([visible]);
    expect(result.total).toBe(1);
    for (const id of [off, hidden, lapsedId]) expect(await getPublicListing(id)).toBeNull();
  });

  it("filters by category, district and keyword", async () => {
    const { user } = await business({ name: "Kenema Agro Inputs" });
    const seed = await created(user.id, { title: "NERICA rice seed", category: "SEEDS", districtIds: [kenema] });
    const fert = await created(user.id, { title: "NPK fertiliser", category: "FERTILISER", districtIds: [bo], description: "Balanced fertiliser for maize." });
    const tool = await created(user.id, { title: "Cutlass", category: "TOOLS", districtIds: [kenema, bo] });

    const ids = async (p: Parameters<typeof searchListings>[0]) => (await searchListings(p)).listings.map((l) => l.id).sort();
    expect(await ids({ category: "SEEDS" })).toEqual([seed]);
    expect(await ids({ districtId: bo })).toEqual([fert, tool].sort());
    expect(await ids({ districtId: kono })).toEqual([]);
    expect(await ids({ q: "nerica" })).toEqual([seed]);
    expect(await ids({ q: "MAIZE" })).toEqual([fert]);
    expect(await ids({ q: "kenema agro" })).toEqual([fert, seed, tool].sort());
    expect(await ids({ category: "TOOLS", districtId: kenema, q: "cut" })).toEqual([tool]);
  });

  it("shows sponsored listings first", async () => {
    const { user } = await business();
    const first = await created(user.id, { title: "Older" });
    const second = await created(user.id, { title: "Newer" });
    expect((await searchListings({})).listings.map((l) => l.id)).toEqual([second, first]);

    const admin = (await findOrCreateUserByPhone(testPhone()))!;
    await setListingSponsored(admin.id, first, true);
    const result = await searchListings({});
    expect(result.listings.map((l) => [l.id, l.isSponsored])).toEqual([[first, true], [second, false]]);
  });

  it("pages results 20 at a time", async () => {
    const { user, org } = await business();
    await created(user.id);
    await db.supplierListing.createMany({
      data: Array.from({ length: 24 }, (_, i) => ({ orgId: org.id, category: "TOOLS" as const, title: `Tool ${i}`, description: "A good tool for farming.", contactPhone: "+23276555111" })),
    });
    const page1 = await searchListings({ page: 1 });
    const page2 = await searchListings({ page: 2 });
    expect([page1.total, page1.pageCount, page1.listings.length, page2.listings.length]).toEqual([25, 2, 20, 5]);
  });
});

describe("admin moderation", () => {
  it("sponsoring and hiding are written to the audit log", async () => {
    const { user } = await business();
    const admin = (await findOrCreateUserByPhone(testPhone()))!;
    const id = await created(user.id);
    await setListingSponsored(admin.id, id, true);
    await setListingHidden(admin.id, id, true);
    await setListingHidden(admin.id, id, false);
    const actions = (await db.auditLog.findMany({ where: { entityId: id }, orderBy: { createdAt: "asc" } })).map((a) => [a.action, a.actorId]);
    expect(actions).toEqual([
      ["listing.sponsored", admin.id],
      ["listing.hidden", admin.id],
      ["listing.restored", admin.id],
    ]);
    expect(await setListingHidden(admin.id, "missing", true)).toEqual({ ok: false, error: "not_found" });
  });
});
