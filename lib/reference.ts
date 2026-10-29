import { db } from "@/lib/db";

// Read-only access to seeded reference data (districts, chiefdoms, crops).

export function listDistricts() {
  return db.district.findMany({ orderBy: { name: "asc" } });
}

export function countDistricts() {
  return db.district.count();
}

export function listChiefdoms(districtId: string) {
  return db.chiefdom.findMany({ where: { districtId }, orderBy: { name: "asc" } });
}

export function listCrops() {
  return db.crop.findMany({ orderBy: { name: "asc" } });
}
