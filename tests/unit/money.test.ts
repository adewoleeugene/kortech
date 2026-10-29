import { describe, expect, it } from "vitest";
import { telLink, whatsappLink } from "@/lib/contact-links";
import { formatSle, minorToInput, parseSleToMinor } from "@/lib/money";

describe("parseSleToMinor", () => {
  it.each([
    ["250", 25000],
    ["1,250.50", 125050],
    ["1250.5", 125050],
    ["SLE 45", 4500],
    ["Le 0.25", 25],
    [" 18 500 ", 1850000],
  ])("%s -> %d minor units", (input, expected) => {
    expect(parseSleToMinor(input)).toBe(expected);
  });

  it("treats empty input as no price", () => {
    expect(parseSleToMinor("")).toBeNull();
    expect(parseSleToMinor("  ")).toBeNull();
  });

  it.each(["abc", "-5", "0", "1.234", "12.3.4", "100000000001"])("rejects %s", (input) => {
    expect(parseSleToMinor(input)).toBeUndefined();
  });
});

describe("formatSle", () => {
  it("shows whole Leones without decimals and cents with two", () => {
    expect(formatSle(25000)).toBe("SLE 250");
    expect(formatSle(125050)).toBe("SLE 1,250.50");
    expect(formatSle(1850000)).toBe("SLE 18,500");
  });

  it("round-trips through the form value", () => {
    expect(minorToInput(125050)).toBe("1250.50");
    expect(minorToInput(25000)).toBe("250");
    expect(minorToInput(null)).toBe("");
    expect(parseSleToMinor(minorToInput(125050))).toBe(125050);
  });
});

describe("contact links", () => {
  it("builds a phone link and a WhatsApp link without the plus sign", () => {
    expect(telLink("+23276123456")).toBe("tel:+23276123456");
    expect(whatsappLink("+23276123456")).toBe("https://wa.me/23276123456");
    expect(whatsappLink("+23276123456", "Hello & thanks")).toBe("https://wa.me/23276123456?text=Hello%20%26%20thanks");
  });
});
