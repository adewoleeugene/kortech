import { z } from "zod";
import { db } from "@/lib/db";

export const farmerProfileSchema = z.object({
  name: z.string().trim().min(2).max(80),
  districtId: z.string().min(1),
  chiefdomId: z.string().optional().transform((v) => v || undefined),
  cropIds: z.array(z.string().min(1)).min(1).max(20),
  // Form fields arrive as strings; empty means "not given".
  farmSize: z.preprocess(
    (v) => (v === "" || v === null || v === undefined ? undefined : Number(v)),
    z.number().positive().max(100_000).optional(),
  ),
  farmSizeUnit: z.enum(["ACRE", "HECTARE"]),
});

export type FarmerProfileInput = z.input<typeof farmerProfileSchema>;

export type ProfileFieldError = "name" | "districtId" | "chiefdomId" | "cropIds" | "farmSize" | "farmSizeUnit";

export type SaveProfileResult = { ok: true } | { ok: false; fieldErrors: ProfileFieldError[] };

export async function saveFarmerProfile(userId: string, input: FarmerProfileInput): Promise<SaveProfileResult> {
  const parsed = farmerProfileSchema.safeParse(input);
  if (!parsed.success) {
    const fields = new Set(parsed.error.issues.map((i) => i.path[0] as ProfileFieldError));
    return { ok: false, fieldErrors: [...fields] };
  }
  const data = parsed.data;

  // Reference data must exist, and the chiefdom must belong to the chosen district.
  const [district, chiefdom, crops] = await Promise.all([
    db.district.findUnique({ where: { id: data.districtId } }),
    data.chiefdomId ? db.chiefdom.findUnique({ where: { id: data.chiefdomId } }) : null,
    db.crop.findMany({ where: { id: { in: data.cropIds } }, select: { id: true } }),
  ]);
  const errors: ProfileFieldError[] = [];
  if (!district) errors.push("districtId");
  if (data.chiefdomId && chiefdom?.districtId !== data.districtId) errors.push("chiefdomId");
  if (crops.length !== new Set(data.cropIds).size) errors.push("cropIds");
  if (errors.length) return { ok: false, fieldErrors: errors };

  const profile = {
    districtId: data.districtId,
    chiefdomId: data.chiefdomId ?? null,
    farmSize: data.farmSize ?? null,
    farmSizeUnit: data.farmSizeUnit,
  };
  const cropRefs = crops.map((c) => ({ id: c.id }));
  await db.user.update({
    where: { id: userId },
    data: {
      name: data.name,
      farmerProfile: {
        upsert: {
          create: { ...profile, crops: { connect: cropRefs } },
          update: { ...profile, crops: { set: cropRefs } },
        },
      },
    },
  });
  return { ok: true };
}

export function getFarmerProfile(userId: string) {
  return db.farmerProfile.findUnique({
    where: { userId },
    include: { district: true, chiefdom: true, crops: { orderBy: { name: "asc" } } },
  });
}
