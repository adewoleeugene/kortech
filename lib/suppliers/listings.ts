import { randomBytes } from "node:crypto";
import type { Organisation, Prisma, SupplierCategory } from "@prisma/client";
import { z } from "zod";
import { getPublicMediaStorage } from "@/lib/adapters/storage";
import { writeAudit } from "@/lib/audit";
import { detectFileType } from "@/lib/business/documents";
import { requireApprovedOrganisation } from "@/lib/business/organisation";
import { db } from "@/lib/db";
import { parseSleToMinor } from "@/lib/money";
import { normalizeSierraLeonePhone } from "@/lib/phone";

export const SUPPLIER_CATEGORIES = [
  "SEEDS",
  "FERTILISER",
  "AGROCHEMICALS",
  "TOOLS",
  "MACHINERY",
  "EQUIPMENT_HIRE",
  "OTHER",
] as const satisfies readonly SupplierCategory[];

export const MAX_PHOTOS = 3;
export const MAX_PHOTO_BYTES = 2 * 1024 * 1024;
export const PAGE_SIZE = 20;

// ---------- Input ----------

const optionalPhone = z
  .string()
  .trim()
  .transform((v, ctx) => {
    if (!v) return null;
    const phone = normalizeSierraLeonePhone(v);
    if (!phone) ctx.addIssue({ code: "custom" });
    return phone;
  });

export const listingSchema = z.object({
  category: z.enum(SUPPLIER_CATEGORIES),
  title: z.string().trim().min(3).max(100),
  description: z.string().trim().min(10).max(2000),
  price: z.string().transform((v, ctx) => {
    const minor = parseSleToMinor(v);
    if (minor === undefined) ctx.addIssue({ code: "custom" });
    return minor ?? null;
  }),
  unit: z.string().trim().max(40).transform((v) => v || null),
  districtIds: z.array(z.string().min(1)).min(1).max(16),
  contactPhone: optionalPhone.refine((v): v is string => v !== null),
  whatsappNumber: optionalPhone,
});

export type ListingInput = z.input<typeof listingSchema>;
export type ListingField = keyof ListingInput | "photos";
export type PhotoUpload = { name: string; bytes: Uint8Array };

export type SaveListingResult =
  | { ok: true; listingId: string }
  | { ok: false; error: "invalid"; fields: ListingField[] }
  | { ok: false; error: "no_organisation" | "not_approved" | "not_found" | "agrochemicals_not_licensed" };

function validatePhotos(photos: PhotoUpload[]) {
  if (photos.length > MAX_PHOTOS) return null;
  const checked = photos.map((p) => ({ ...p, type: detectFileType(p.bytes) }));
  const ok = checked.every((p) => p.bytes.length <= MAX_PHOTO_BYTES && (p.type?.ext === "png" || p.type?.ext === "jpg"));
  return ok ? checked : null;
}

async function storePhotos(orgId: string, photos: NonNullable<ReturnType<typeof validatePhotos>>) {
  const storage = getPublicMediaStorage();
  const keys: string[] = [];
  for (const p of photos) {
    const key = `listing-photos/${orgId}/${randomBytes(12).toString("hex")}.${p.type!.ext}`;
    await storage.put(key, p.bytes, p.type!.contentType);
    keys.push(key);
  }
  return keys;
}

async function deletePhotos(keys: string[]) {
  const storage = getPublicMediaStorage();
  await Promise.all(keys.map((k) => storage.delete(k).catch(() => {})));
}

type Prepared =
  | { ok: false; result: SaveListingResult }
  | {
      ok: true;
      org: Organisation;
      data: z.output<typeof listingSchema>;
      photos: NonNullable<ReturnType<typeof validatePhotos>>;
    };

// Parses input and checks the rules shared by create and update.
async function prepare(userId: string, input: ListingInput, photos: PhotoUpload[]): Promise<Prepared> {
  const gate = await requireApprovedOrganisation(userId, "SUPPLIER");
  if (!gate.ok) return { ok: false, result: { ok: false, error: gate.error } };

  const parsed = listingSchema.safeParse(input);
  const fields = new Set<ListingField>(parsed.success ? [] : parsed.error.issues.map((i) => i.path[0] as ListingField));
  const checkedPhotos = validatePhotos(photos);
  if (!checkedPhotos) fields.add("photos");
  if (parsed.success) {
    const found = await db.district.count({ where: { id: { in: parsed.data.districtIds } } });
    if (found !== new Set(parsed.data.districtIds).size) fields.add("districtIds");
  }
  if (!parsed.success || fields.size) return { ok: false, result: { ok: false, error: "invalid", fields: [...fields] } };

  // Only suppliers verified with an agrochemical dealer licence may list agrochemicals.
  if (parsed.data.category === "AGROCHEMICALS" && !gate.org.sellsAgrochemicals) {
    return { ok: false, result: { ok: false, error: "agrochemicals_not_licensed" } };
  }
  return { ok: true, org: gate.org, data: parsed.data, photos: checkedPhotos! };
}

export async function createListing(userId: string, input: ListingInput, photos: PhotoUpload[] = []): Promise<SaveListingResult> {
  const prepared = await prepare(userId, input, photos);
  if (!prepared.ok) return prepared.result;
  const { org, data } = prepared;

  const photoKeys = await storePhotos(org.id, prepared.photos);
  const { districtIds, price, ...rest } = data;
  const listing = await db.supplierListing.create({
    data: {
      ...rest,
      priceMinor: price,
      orgId: org.id,
      photos: photoKeys,
      districts: { connect: districtIds.map((id) => ({ id })) },
    },
  });
  return { ok: true, listingId: listing.id };
}

// New photos, if any, replace the old ones; otherwise the old photos stay.
export async function updateListing(
  userId: string,
  listingId: string,
  input: ListingInput,
  photos: PhotoUpload[] = [],
): Promise<SaveListingResult> {
  const prepared = await prepare(userId, input, photos);
  if (!prepared.ok) return prepared.result;
  const { org, data } = prepared;

  const existing = await db.supplierListing.findFirst({ where: { id: listingId, orgId: org.id } });
  if (!existing) return { ok: false, error: "not_found" };

  const newKeys = prepared.photos.length ? await storePhotos(org.id, prepared.photos) : null;
  const { districtIds, price, ...rest } = data;
  await db.supplierListing.update({
    where: { id: listingId },
    data: {
      ...rest,
      priceMinor: price,
      ...(newKeys ? { photos: newKeys } : {}),
      districts: { set: districtIds.map((id) => ({ id })) },
    },
  });
  if (newKeys) await deletePhotos(existing.photos);
  return { ok: true, listingId };
}

// Supplier turns a listing on or off. Hidden listings stay hidden until an admin restores them.
export async function setListingActive(userId: string, listingId: string, active: boolean) {
  const gate = await requireApprovedOrganisation(userId, "SUPPLIER");
  if (!gate.ok) return { ok: false as const, error: gate.error };
  const updated = await db.supplierListing.updateMany({
    where: { id: listingId, orgId: gate.org.id, status: { not: "HIDDEN" } },
    data: { status: active ? "ACTIVE" : "INACTIVE" },
  });
  return updated.count ? { ok: true as const } : { ok: false as const, error: "not_found" as const };
}

export function listOwnListings(orgId: string) {
  return db.supplierListing.findMany({
    where: { orgId },
    orderBy: { updatedAt: "desc" },
    include: { districts: { select: { name: true }, orderBy: { name: "asc" } } },
  });
}

export function getOwnListing(orgId: string, listingId: string) {
  return db.supplierListing.findFirst({ where: { id: listingId, orgId }, include: { districts: { select: { id: true } } } });
}

// ---------- Public directory (PRD 6.5) ----------

// Public = active listing from an approved (verified) supplier. Nothing else is ever shown.
const PUBLIC_WHERE: Prisma.SupplierListingWhereInput = { status: "ACTIVE", org: { status: "APPROVED" } };

export const searchSchema = z.object({
  category: z.enum(SUPPLIER_CATEGORIES).optional().catch(undefined),
  districtId: z.string().max(50).optional().catch(undefined),
  q: z.string().trim().max(80).optional().catch(undefined),
  page: z.coerce.number().int().min(1).max(500).optional().catch(1),
});

export type SearchParams = z.infer<typeof searchSchema>;

export async function searchListings(params: SearchParams) {
  const page = params.page ?? 1;
  const where: Prisma.SupplierListingWhereInput = {
    ...PUBLIC_WHERE,
    ...(params.category ? { category: params.category } : {}),
    ...(params.districtId ? { districts: { some: { id: params.districtId } } } : {}),
    ...(params.q
      ? {
          OR: [
            { title: { contains: params.q, mode: "insensitive" } },
            { description: { contains: params.q, mode: "insensitive" } },
            { org: { legalName: { contains: params.q, mode: "insensitive" } } },
          ],
        }
      : {}),
  };
  const [total, listings] = await Promise.all([
    db.supplierListing.count({ where }),
    db.supplierListing.findMany({
      where,
      // Sponsored first (always labelled), then most recently updated.
      orderBy: [{ isSponsored: "desc" }, { updatedAt: "desc" }],
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      select: {
        id: true,
        title: true,
        category: true,
        priceMinor: true,
        unit: true,
        photos: true,
        isSponsored: true,
        contactPhone: true,
        whatsappNumber: true,
        org: { select: { legalName: true } },
        districts: { select: { name: true }, orderBy: { name: "asc" } },
      },
    }),
  ]);
  return { total, page, pageCount: Math.max(1, Math.ceil(total / PAGE_SIZE)), listings };
}

export function getPublicListing(listingId: string) {
  return db.supplierListing.findFirst({
    where: { id: listingId, ...PUBLIC_WHERE },
    include: {
      org: { select: { legalName: true, address: true, district: { select: { name: true } }, verifiedAt: true } },
      districts: { select: { name: true }, orderBy: { name: "asc" } },
    },
  });
}

// ---------- Admin moderation ----------

export function listAllListingsForAdmin() {
  return db.supplierListing.findMany({
    orderBy: [{ status: "asc" }, { updatedAt: "desc" }],
    take: 200,
    include: { org: { select: { legalName: true } } },
  });
}

export async function setListingSponsored(adminId: string, listingId: string, sponsored: boolean) {
  return moderate(adminId, listingId, { isSponsored: sponsored }, sponsored ? "listing.sponsored" : "listing.unsponsored");
}

export async function setListingHidden(adminId: string, listingId: string, hidden: boolean) {
  return moderate(adminId, listingId, { status: hidden ? "HIDDEN" : "ACTIVE" }, hidden ? "listing.hidden" : "listing.restored");
}

async function moderate(adminId: string, listingId: string, data: Prisma.SupplierListingUpdateInput, action: string) {
  return db.$transaction(async (tx) => {
    const exists = await tx.supplierListing.findUnique({ where: { id: listingId }, select: { id: true } });
    if (!exists) return { ok: false as const, error: "not_found" as const };
    await tx.supplierListing.update({ where: { id: listingId }, data });
    await writeAudit(tx, { actorId: adminId, action, entity: "SupplierListing", entityId: listingId });
    return { ok: true as const };
  });
}

