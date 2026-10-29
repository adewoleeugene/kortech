import { describe, expect, it } from "vitest";
import { crops } from "@/prisma/data/crops";
import { districts } from "@/prisma/data/districts";

// Rough bounding box of Sierra Leone, to catch swapped or mistyped coordinates.
const SL_BOUNDS = { minLat: 6.9, maxLat: 10.0, minLon: -13.4, maxLon: -10.2 };

describe("district seed data", () => {
  it("has all 16 districts with unique names and slugs", () => {
    expect(districts).toHaveLength(16);
    expect(new Set(districts.map((d) => d.name)).size).toBe(16);
    expect(new Set(districts.map((d) => d.slug)).size).toBe(16);
  });

  it("covers all five provinces / areas", () => {
    expect(new Set(districts.map((d) => d.province))).toEqual(
      new Set(["Eastern", "Northern", "North West", "Southern", "Western Area"]),
    );
  });

  it.each(districts)("$name has coordinates inside Sierra Leone", (d) => {
    expect(d.latitude).toBeGreaterThan(SL_BOUNDS.minLat);
    expect(d.latitude).toBeLessThan(SL_BOUNDS.maxLat);
    expect(d.longitude).toBeGreaterThan(SL_BOUNDS.minLon);
    expect(d.longitude).toBeLessThan(SL_BOUNDS.maxLon);
  });

  it.each(districts)("$name has at least one chiefdom and no duplicates", (d) => {
    expect(d.chiefdoms.length).toBeGreaterThan(0);
    expect(new Set(d.chiefdoms).size).toBe(d.chiefdoms.length);
  });
});

describe("crop seed data", () => {
  it("includes every MVP priority crop", () => {
    const slugs = crops.filter((c) => c.isPriority).map((c) => c.slug);
    expect(slugs.sort()).toEqual(
      ["cassava", "cocoa", "groundnut", "maize", "oil-palm", "okra", "pepper", "rice", "tomato"].sort(),
    );
  });

  it("has unique, URL-safe slugs", () => {
    expect(new Set(crops.map((c) => c.slug)).size).toBe(crops.length);
    for (const c of crops) expect(c.slug).toMatch(/^[a-z0-9-]+$/);
  });
});
