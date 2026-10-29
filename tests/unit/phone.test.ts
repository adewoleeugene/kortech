import { describe, expect, it } from "vitest";
import { formatPhoneForDisplay, normalizeSierraLeonePhone } from "@/lib/phone";

describe("normalizeSierraLeonePhone", () => {
  it.each([
    ["076123456", "+23276123456"],
    ["076 123 456", "+23276123456"],
    ["76123456", "+23276123456"],
    ["+232 76 123 456", "+23276123456"],
    ["232-76-123456", "+23276123456"],
    ["0023276123456", "+23276123456"],
    ["(030) 123-456", "+23230123456"],
  ])("normalises %s to E.164", (input, expected) => {
    expect(normalizeSierraLeonePhone(input)).toBe(expected);
  });

  it.each([
    ["", "empty"],
    ["12345", "too short"],
    ["0761234567", "too long"],
    ["+44 7700 900123", "another country"],
    ["07612345a", "letters"],
    ["00000000", "national number starting with 0"],
  ])("rejects %s (%s)", (input) => {
    expect(normalizeSierraLeonePhone(input)).toBeNull();
  });
});

describe("formatPhoneForDisplay", () => {
  it("shows the local format", () => {
    expect(formatPhoneForDisplay("+23276123456")).toBe("076 123 456");
  });
});
