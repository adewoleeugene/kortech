import { describe, expect, it } from "vitest";
import { createTranslator, isLocale, type TranslationKey } from "@/lib/i18n";
import en from "@/locales/en.json";

const t = createTranslator("en");

describe("translator", () => {
  it("returns the English string for a key", () => {
    expect(t("app.name")).toBe("SmartFarm Sierra Leone");
  });

  it("interpolates variables", () => {
    expect(t("home.districtsServed", { count: 16 })).toBe("Districts served: 16");
  });

  it("leaves unknown placeholders untouched", () => {
    expect(t("home.districtsServed", {})).toBe("Districts served: {count}");
  });

  it("falls back to the key for a missing translation instead of throwing", () => {
    expect(t("does.not.exist" as TranslationKey)).toBe("does.not.exist");
  });

  it("only accepts supported locales", () => {
    expect(isLocale("en")).toBe(true);
    expect(isLocale("fr")).toBe(false);
    expect(isLocale(undefined)).toBe(false);
  });

  it("has no empty strings in the English file", () => {
    const empty: string[] = [];
    const walk = (node: unknown, path: string) => {
      if (typeof node === "string") {
        if (!node.trim()) empty.push(path);
      } else if (node && typeof node === "object") {
        for (const [k, v] of Object.entries(node)) walk(v, path ? `${path}.${k}` : k);
      }
    };
    walk(en, "");
    expect(empty).toEqual([]);
  });
});
