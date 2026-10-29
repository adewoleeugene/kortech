import type { GuideSection } from "@prisma/client";

// DRAFT starter content for the priority crops. Written as a starting point, NOT reviewed by an
// agronomist. Seeded as unpublished in production; an agronomist must review each section before
// farmers see it (PRD 6.3, 14). In development it is published and labelled "Sample, not reviewed".
// Deliberately gives no pesticide products or doses: those come from the label and extension officers.

export type GuideSeed = Partial<Record<GuideSection, string>>;

const ASK_EXTENSION = "Ask your extension officer before using any chemical. Read and follow the label, wear protective clothing, and keep chemicals away from children and water sources.";

export const guideSeeds: Record<string, GuideSeed> = {
  rice: {
    OVERVIEW: `Rice is the main food crop in Sierra Leone. It is grown on uplands, in inland valley swamps (IVS), in mangrove swamps and on riverine grasslands.

Good land preparation, clean seed and timely weeding give the biggest gains in yield.`,
    PLANTING_CALENDAR: `- Upland rice: sow with the first steady rains, usually May to June.
- Inland valley swamp: prepare the nursery in June and transplant in July to August.
- Seedlings are ready to transplant at about 21 days.
- Plan so the crop ripens after the heaviest rains, when it is easier to dry.`,
    SOIL: `- Uplands: avoid steep slopes; leave crop residue on the soil to protect it from erosion.
- Swamps: build bunds and channels so you can hold and drain water.
- Level the field well so water covers it evenly.`,
    FERTILISER: `- Organic matter (rice straw, compost, animal manure) improves soil over time.
- If you use mineral fertiliser, a common practice is a compound fertiliser at planting and urea as a top dressing at tillering.
- Do not apply fertiliser just before heavy rain: it washes away. Check the weather page first.
- Ask your extension officer for the right amount for your field.`,
    PESTS: `- Birds and rodents cause big losses near harvest: scare birds early in the morning and keep bunds clean.
- Stem borers: look for dead hearts and white heads. Remove and destroy affected tillers.
- Keep fields and bunds free of weeds that shelter pests.

${ASK_EXTENSION}`,
    DISEASES: `- Rice blast: diamond-shaped spots on leaves, broken necks. Use clean seed and resistant varieties.
- Rice yellow mottle virus: yellow, stunted plants. Remove infected plants early and control weeds.
- Report serious outbreaks to your extension officer quickly.`,
    HARVEST: `- Harvest when about 80 to 85 percent of the grains on the panicle are straw coloured.
- Harvesting too late increases shattering and bird damage.
- Thresh soon after cutting and do not leave bundles in the rain.`,
    STORAGE: `- Dry paddy well before storing. A grain that cracks cleanly between the teeth is dry enough.
- Store in clean bags on pallets, off the floor and away from walls.
- Keep the store dry and check often for insects and rats.`,
  },
  cassava: {
    OVERVIEW: `Cassava is grown across Sierra Leone for its roots (gari, fufu, foofoo) and its leaves (plasas). It tolerates poor soils and dry spells better than most crops.`,
    PLANTING_CALENDAR: `- Plant at the start of the rains (April to June), or near the end of the rains (September to October) where the soil stays moist.
- Use stems from healthy plants that are 8 to 18 months old.
- Plant cuttings 20 to 25 cm long, with at least 5 nodes.`,
    SOIL: `- Grows on most well-drained soils. Avoid waterlogged land.
- Ridges or mounds help in heavy or wet soils.`,
    FERTILISER: `- Cassava responds well to organic matter and to potassium.
- Intercropping with legumes such as groundnut can help the soil.
- Ask your extension officer before buying fertiliser for cassava.`,
    PESTS: `- Cassava mealybug and green mite: check under leaves in the dry season.
- Use clean planting material; do not take stems from infested fields.

${ASK_EXTENSION}`,
    DISEASES: `- Cassava mosaic disease: yellow, twisted leaves and small roots. Plant only clean cuttings from healthy plants and remove sick plants.
- Use improved, disease-tolerant varieties where you can get them.
- Report sudden or widespread disease to your extension officer.`,
    HARVEST: `- Most varieties are ready 9 to 18 months after planting.
- Harvest only what you can sell or process within 2 days: roots spoil quickly once dug.`,
    STORAGE: `- Fresh roots last only a few days. Process into gari, fufu or dried chips for longer storage.
- Store gari and chips dry, in sealed bags off the floor.`,
  },
  maize: {
    OVERVIEW: `Maize grows quickly and is eaten fresh or dry, and used for animal feed. It needs fertile soil and good weeding in the first weeks.`,
    PLANTING_CALENDAR: `- Main season: plant with the first rains, usually April to May.
- A second crop can be planted around August in some areas.
- Most varieties are ready 90 to 120 days after planting.`,
    SOIL: `- Prefers fertile, well-drained loam. Avoid waterlogged land.
- Plant in rows to make weeding easier.`,
    FERTILISER: `- Maize needs more nutrients than most local crops. Manure or compost helps a lot.
- A common practice is fertiliser at planting and a nitrogen top dressing about 4 to 6 weeks later.
- Do not apply before heavy rain. Ask your extension officer for the right amounts.`,
    PESTS: `- Fall armyworm: ragged holes in young leaves and sawdust-like droppings in the funnel. Check fields twice a week in the first 6 weeks.
- Stem borers and storage weevils also cause losses.

${ASK_EXTENSION}`,
    DISEASES: `- Maize streak virus: yellow streaks along the leaves. Plant early and use tolerant varieties.
- Remove and destroy badly affected plants.`,
    HARVEST: `- For dry grain, harvest when husks are dry and kernels are hard.
- Dry cobs in the sun on a clean surface, not on bare ground.`,
    STORAGE: `- Shell and dry grain well before storing.
- Store in clean, airtight containers or hermetic bags to reduce weevils and mould.
- Mouldy grain can make people and animals sick: do not eat or feed it.`,
  },
  groundnut: {
    OVERVIEW: `Groundnut is an important food and cash crop. As a legume it also adds nitrogen to the soil, which helps the next crop.`,
    PLANTING_CALENDAR: `- Plant with the steady rains, usually May to June.
- Most varieties are ready 90 to 120 days after planting.`,
    SOIL: `- Prefers light, sandy, well-drained soil so pods can form and be lifted easily.
- Avoid heavy clay and waterlogged land.`,
    FERTILISER: `- Groundnut needs little nitrogen fertiliser because it fixes its own.
- Calcium helps pods fill. Ask your extension officer about your soil.`,
    PESTS: `- Aphids, termites and rodents are common problems.
- Rotate groundnut with cereals to break pest cycles.

${ASK_EXTENSION}`,
    DISEASES: `- Rosette virus: stunted, bunched plants. Plant early and at the right spacing.
- Leaf spots: dark spots on leaves. Use clean seed and rotate crops.`,
    HARVEST: `- Harvest when most leaves turn yellow and the inside of the shell has darkened.
- Late harvest leaves pods in the soil.`,
    STORAGE: `- Dry pods quickly and well. Damp groundnuts can grow a mould that makes aflatoxin, which is harmful to health.
- Sort out damaged, shrivelled or mouldy nuts.
- Store dry, off the floor, in clean bags.`,
  },
  cocoa: {
    OVERVIEW: `Cocoa is a major export crop, mainly in the Eastern Province. Trees produce for many years with good care, shade management and pruning.`,
    PLANTING_CALENDAR: `- Raise seedlings in a nursery and transplant at the start of the rains.
- Young trees need temporary shade (for example plantain).
- The main harvest season is usually from around September to January.`,
    SOIL: `- Needs deep, well-drained soil that holds moisture.
- Keep leaf litter under the trees to protect the soil.`,
    FERTILISER: `- Mulch and leaf litter feed the soil over time.
- Ask your extension officer before buying fertiliser for cocoa.`,
    PESTS: `- Capsids (mirids) damage young shoots and pods.
- Keep the farm clean and prune to let in light and air.

${ASK_EXTENSION}`,
    DISEASES: `- Black pod: pods turn brown and black, worst in the rains. Remove and bury infected pods regularly.
- Prune to reduce humidity under the trees.
- Report swollen shoots or sudden tree death to your extension officer.`,
    HARVEST: `- Harvest ripe pods every 2 to 3 weeks.
- Use a sharp tool and do not damage the cushion where new flowers grow.`,
    STORAGE: `- Ferment beans 5 to 7 days, turning them, then dry them in the sun on raised mats.
- Store dry beans in clean jute bags, away from smoke and strong smells.`,
  },
  "oil-palm": {
    OVERVIEW: `Oil palm gives palm oil, kernel oil and many local products. Improved varieties give much more oil than wild palms.`,
    PLANTING_CALENDAR: `- Transplant nursery seedlings at the start of the rains.
- Palms begin to bear about 3 to 4 years after planting.
- Harvest is heaviest in the dry season.`,
    SOIL: `- Needs deep soil and steady moisture. Avoid sites that flood for long periods.
- Plant cover crops between young palms to protect the soil.`,
    FERTILISER: `- Return empty fruit bunches and fronds to the field as mulch.
- Ask your extension officer about fertiliser for your palms.`,
    PESTS: `- Rhinoceros beetles damage young palms. Remove rotting trunks and heaps where they breed.
- Rats eat fruit: keep the area around palms clean.

${ASK_EXTENSION}`,
    DISEASES: `- Report yellowing fronds, rotting spear leaves or dying palms to your extension officer.
- Remove and destroy dead palms so disease does not spread.`,
    HARVEST: `- Harvest bunches when a few loose fruits have fallen to the ground.
- Process within 1 to 2 days of harvest for better quality oil.`,
    STORAGE: `- Store palm oil in clean, closed containers away from sunlight.
- Keep kernels dry to prevent mould.`,
  },
  pepper: {
    OVERVIEW: `Pepper is a valuable market crop, grown in home gardens and in dry-season gardens near swamps and streams.`,
    PLANTING_CALENDAR: `- Raise seedlings in a nursery for 4 to 6 weeks, then transplant.
- Dry-season gardens need regular watering.
- First picking usually starts 2 to 3 months after transplanting.`,
    SOIL: `- Well-drained soil with plenty of compost. Raised beds help in the rains.
- Do not plant pepper where tomato, pepper or garden eggs grew last season.`,
    FERTILISER: `- Compost or well-rotted manure before transplanting.
- Ask your extension officer about top dressing.`,
    PESTS: `- Aphids, whiteflies and mites: check under leaves often.
- Remove weeds that shelter pests.

${ASK_EXTENSION}`,
    DISEASES: `- Wilting plants may have bacterial wilt: remove them and do not replant pepper there next season.
- Avoid wetting leaves when watering.`,
    HARVEST: `- Pick regularly, every few days, to keep plants producing.
- Pick in the cool morning.`,
    STORAGE: `- Fresh pepper keeps a few days in a cool, shaded place.
- Dry pepper fully in the sun on clean mats for longer storage.`,
  },
  okra: {
    OVERVIEW: `Okra is easy to grow and sells well in local markets. Pods must be picked young and often.`,
    PLANTING_CALENDAR: `- Sow seed directly in the field; soaking seed overnight helps germination.
- Grows in the rains and, with watering, in the dry season.
- First pods are ready about 2 months after sowing.`,
    SOIL: `- Prefers fertile, well-drained soil with compost.
- Avoid waterlogged beds.`,
    FERTILISER: `- Compost or manure at planting. Ask your extension officer about extra fertiliser.`,
    PESTS: `- Flea beetles, aphids and pod borers are common.
- Remove damaged pods and keep the field clean.

${ASK_EXTENSION}`,
    DISEASES: `- Yellow vein mosaic: yellow network on leaves. Remove sick plants and control whiteflies.
- Rotate with crops from another family.`,
    HARVEST: `- Pick pods young and tender, every 2 to 3 days. Old pods become hard and fibrous.`,
    STORAGE: `- Sell or cook fresh pods quickly; they keep only a few days.
- Slice and sun-dry okra for longer storage.`,
  },
  tomato: {
    OVERVIEW: `Tomato fetches good prices, especially in the dry season. It needs careful care against pests, diseases and too much rain.`,
    PLANTING_CALENDAR: `- Raise seedlings in a nursery for 3 to 5 weeks, then transplant.
- The dry season, with watering, is usually the best time; rainy-season tomato suffers more disease.
- First harvest is about 2 to 3 months after transplanting.`,
    SOIL: `- Well-drained, fertile soil with compost. Raised beds in wet areas.
- Do not plant where tomato, pepper or garden eggs grew last season.`,
    FERTILISER: `- Compost or manure before transplanting.
- Ask your extension officer about top dressing during fruiting.`,
    PESTS: `- Whiteflies, fruit worms and the tomato leaf miner (Tuta absoluta) cause big losses. Check plants often.
- Remove and destroy damaged fruit.

${ASK_EXTENSION}`,
    DISEASES: `- Bacterial wilt: whole plants wilt quickly. Remove them; rotate to another crop family.
- Blight: dark patches on leaves and fruit in wet weather. Stake plants and avoid wetting leaves.
- Report serious outbreaks to your extension officer.`,
    HARVEST: `- Pick when fruits start to change colour; they ripen on the way to market.
- Handle gently to avoid bruising.`,
    STORAGE: `- Keep in a cool, shaded, airy place in shallow crates, not deep sacks.
- Sort out damaged fruit so it does not spoil the rest.`,
  },
};
