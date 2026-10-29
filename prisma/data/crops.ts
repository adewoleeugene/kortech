// Priority crops for the MVP (PRD 6.3 [DECISION]).

export type CropSeed = {
  name: string;
  slug: string;
  group: "cereal" | "root" | "legume" | "tree" | "vegetable";
  isPriority: boolean;
};

export const crops: CropSeed[] = [
  { name: "Rice", slug: "rice", group: "cereal", isPriority: true },
  { name: "Maize", slug: "maize", group: "cereal", isPriority: true },
  { name: "Cassava", slug: "cassava", group: "root", isPriority: true },
  { name: "Groundnut", slug: "groundnut", group: "legume", isPriority: true },
  { name: "Cocoa", slug: "cocoa", group: "tree", isPriority: true },
  { name: "Oil palm", slug: "oil-palm", group: "tree", isPriority: true },
  { name: "Pepper", slug: "pepper", group: "vegetable", isPriority: true },
  { name: "Okra", slug: "okra", group: "vegetable", isPriority: true },
  { name: "Tomato", slug: "tomato", group: "vegetable", isPriority: true },
];
