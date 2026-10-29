import { describe, expect, it } from "vitest";
import { parseGuideContent } from "@/lib/guides/guides";
import { guideSeeds } from "@/prisma/data/guides";
import { crops } from "@/prisma/data/crops";

describe("parseGuideContent", () => {
  it("splits paragraphs on blank lines and joins wrapped lines", () => {
    expect(parseGuideContent("First line\ncontinues here.\n\nSecond paragraph.")).toEqual([
      { type: "p", text: "First line continues here." },
      { type: "p", text: "Second paragraph." },
    ]);
  });

  it("turns '- ' lines into a bullet list", () => {
    expect(parseGuideContent("Intro.\n\n- one\n- two\r\n- three")).toEqual([
      { type: "p", text: "Intro." },
      { type: "ul", items: ["one", "two", "three"] },
    ]);
  });

  it("keeps HTML as plain text (React escapes it when rendering)", () => {
    expect(parseGuideContent("<script>alert(1)</script>")).toEqual([{ type: "p", text: "<script>alert(1)</script>" }]);
  });
});

describe("draft guide content", () => {
  const all = Object.entries(guideSeeds).flatMap(([crop, sections]) => Object.entries(sections).map(([section, text]) => ({ crop, section, text: text! })));

  it("covers all 8 sections for every priority crop", () => {
    for (const c of crops.filter((x) => x.isPriority)) {
      expect(Object.keys(guideSeeds[c.slug] ?? {}).sort(), c.slug).toEqual(
        ["DISEASES", "FERTILISER", "HARVEST", "OVERVIEW", "PESTS", "PLANTING_CALENDAR", "SOIL", "STORAGE"],
      );
    }
  });

  it("every pests section sends farmers to an extension officer and the label", () => {
    for (const { crop, section, text } of all.filter((s) => s.section === "PESTS")) {
      expect(text, `${crop} ${section}`).toMatch(/extension officer/);
      expect(text, `${crop} ${section}`).toMatch(/label/);
    }
  });

  it("gives no chemical doses (no amounts per litre, hectare or acre)", () => {
    for (const { crop, section, text } of all) {
      expect(text, `${crop} ${section}`).not.toMatch(/\d+\s*(ml|g|kg|l|litres?)\s*(per|\/)\s*(litre|l|ha|hectare|acre|knapsack)/i);
    }
  });
});
