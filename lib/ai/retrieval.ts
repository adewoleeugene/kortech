import type { GuideSection } from "@prisma/client";
import { db } from "@/lib/db";

// Finds the crop guide sections most relevant to a question (PRD 6.3: answers grounded in our own
// reviewed content first). Simple keyword scoring is enough for ~72 short sections; swap in
// Postgres full-text or embeddings behind this function when the guide library grows.

export type GuideSource = {
  guideId: string;
  crop: string;
  cropSlug: string;
  section: GuideSection;
  content: string;
  score: number;
};

const SECTION_KEYWORDS: Record<GuideSection, string[]> = {
  OVERVIEW: ["about", "grow", "growing", "variety", "varieties"],
  PLANTING_CALENDAR: ["plant", "planting", "sow", "sowing", "when", "season", "nursery", "transplant", "seedling", "seedlings", "spacing"],
  SOIL: ["soil", "land", "slope", "swamp", "bund", "bunds", "erosion", "drain", "drainage", "ridge", "ridges"],
  FERTILISER: ["fertiliser", "fertilizer", "npk", "urea", "manure", "compost", "nutrient", "nutrients", "feed", "yellow"],
  PESTS: ["pest", "pests", "insect", "insects", "worm", "worms", "armyworm", "borer", "borers", "beetle", "beetles", "aphid", "aphids", "bird", "birds", "rat", "rats", "rodent", "rodents", "weevil", "weevils", "spray", "eating"],
  DISEASES: ["disease", "diseases", "spot", "spots", "rot", "rotting", "wilt", "wilting", "virus", "blight", "mosaic", "blast", "sick", "dying", "mould", "mold"],
  HARVEST: ["harvest", "harvesting", "ripe", "pick", "picking", "ready", "cut", "thresh", "threshing"],
  STORAGE: ["store", "storage", "storing", "dry", "drying", "keep", "bag", "bags", "spoil", "mould", "weevils", "aflatoxin"],
};

const STOPWORDS = new Set(
  "the a an and or but of to in on at for with my our your is are was were be been do does did can could should would how what when why which who where i we you it this that these those have has had not no yes there their them from by as get got make please help".split(" "),
);

// Crop names farmers use, including local and alternative names.
const CROP_ALIASES: Record<string, string[]> = {
  rice: ["rice", "paddy", "nerica"],
  cassava: ["cassava", "gari", "fufu", "plasas"],
  maize: ["maize", "corn"],
  groundnut: ["groundnut", "groundnuts", "peanut", "peanuts", "g-nut"],
  cocoa: ["cocoa", "cacao"],
  "oil-palm": ["palm", "oil palm", "palm oil"],
  pepper: ["pepper", "peppers", "chilli", "chili"],
  okra: ["okra", "okro"],
  tomato: ["tomato", "tomatoes"],
};

export function tokenize(text: string): string[] {
  return (text.toLowerCase().match(/[a-z][a-z-]+/g) ?? []).filter((w) => w.length > 2 && !STOPWORDS.has(w));
}

export function mentionedCrops(question: string): string[] {
  const lower = question.toLowerCase();
  return Object.entries(CROP_ALIASES)
    .filter(([, names]) => names.some((n) => new RegExp(`\\b${n}\\b`).test(lower)))
    .map(([slug]) => slug);
}

type Candidate = { id: string; section: GuideSection; content: string; crop: { name: string; slug: string } };

// Scores one section. Exported for unit tests.
export function scoreSection(candidate: Candidate, words: string[], cropsInQuestion: string[], farmerCrops: string[]) {
  const content = tokenize(candidate.content);
  const contentSet = new Set(content);
  let score = 0;
  for (const w of new Set(words)) {
    if (contentSet.has(w)) score += 1;
    if (SECTION_KEYWORDS[candidate.section].includes(w)) score += 3;
  }
  if (score === 0) return 0;
  // Strongly prefer the crop the farmer asked about; mildly prefer crops they grow.
  if (cropsInQuestion.length) score *= cropsInQuestion.includes(candidate.crop.slug) ? 3 : 0.2;
  else if (farmerCrops.includes(candidate.crop.slug)) score *= 1.5;
  return score;
}

export const MAX_SOURCES = 3;
const MIN_SCORE = 4;

export async function findGuideSources(
  question: string,
  opts: { farmerCropSlugs?: string[]; includeSamples?: boolean } = {},
): Promise<GuideSource[]> {
  const words = tokenize(question);
  if (!words.length) return [];
  const cropsInQuestion = mentionedCrops(question);

  // Only published sections; unreviewed sample text only when explicitly allowed (development).
  const candidates = await db.cropGuide.findMany({
    where: { published: true, ...(opts.includeSamples ? {} : { isSample: false }) },
    select: { id: true, section: true, content: true, crop: { select: { name: true, slug: true } } },
  });

  const ranked = candidates
    .map((c) => ({ c, score: scoreSection(c, words, cropsInQuestion, opts.farmerCropSlugs ?? []) }))
    .filter((x) => x.score >= MIN_SCORE)
    .sort((a, b) => b.score - a.score);
  // Drop weak matches: a section must score at least half as well as the best one.
  const best = ranked[0]?.score ?? 0;
  return ranked
    .filter((x) => x.score >= best / 2)
    .slice(0, MAX_SOURCES)
    .map(({ c, score }) => ({ guideId: c.id, crop: c.crop.name, cropSlug: c.crop.slug, section: c.section, content: c.content, score }));
}
