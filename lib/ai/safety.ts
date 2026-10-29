// Server-side safety rule (PRD 6.3): the assistant must never give doses for restricted or hazardous
// pesticides. The system prompt says so too; this check makes sure even if the model doesn't comply.
//
// List: highly hazardous pesticides that are banned or severely restricted under the Rotterdam and
// Stockholm conventions or in the region, plus common brand names farmers use for them.
// Agronomists should review and extend this list (PRD 15).
export const HAZARDOUS_PESTICIDES: { name: string; aliases: string[] }[] = [
  { name: "paraquat", aliases: ["gramoxone"] },
  { name: "endosulfan", aliases: ["thiodan"] },
  { name: "carbofuran", aliases: ["furadan"] },
  { name: "monocrotophos", aliases: ["nuvacron"] },
  { name: "methyl parathion", aliases: ["parathion"] },
  { name: "methamidophos", aliases: ["tamaron"] },
  { name: "aldicarb", aliases: ["temik"] },
  { name: "dichlorvos", aliases: ["ddvp", "nuvan"] },
  { name: "lindane", aliases: ["gammalin", "gamma bhc"] },
  { name: "DDT", aliases: [] },
  { name: "phorate", aliases: ["thimet"] },
  { name: "aluminium phosphide", aliases: ["aluminum phosphide", "phostoxin", "phosphine"] },
];

function matchHazardous(text: string): string | null {
  const lower = text.toLowerCase();
  for (const p of HAZARDOUS_PESTICIDES) {
    for (const term of [p.name, ...p.aliases]) {
      if (new RegExp(`\\b${term.toLowerCase().replace(/ /g, "\\s+")}\\b`).test(lower)) return p.name;
    }
  }
  return null;
}

// "how much", "dose", "rate", "mix", "per litre", "per acre", "how many ml"...
const DOSAGE_QUESTION = /\b(how\s+much|how\s+many|dose|dosage|rate|ratio|mix|mixing|dilut\w*|quantity|amount|measure|per\s+(litre|liter|acre|hectare|ha|knapsack|bag)|ml|millilit\w*|cap(ful)?s?|spoons?)\b/i;
// A quantity with a unit, as an answer would state it: "50 ml", "2 litres", "1.5 kg per acre".
const QUANTITY = /\b\d+([.,]\d+)?\s*(ml|cl|l|litres?|liters?|g|grams?|kg|cc|caps?(ful)?s?|spoons?|tablespoons?|teaspoons?|sachets?|tablets?)\b/i;

export type SafetyCheck = { blocked: false } | { blocked: true; chemical: string };

// Before calling the model: a question asking for a dose of a hazardous pesticide gets the safe reply directly.
export function checkQuestion(question: string): SafetyCheck {
  const chemical = matchHazardous(question);
  return chemical && DOSAGE_QUESTION.test(question) ? { blocked: true, chemical } : { blocked: false };
}

// After the model answers: an answer that names a hazardous pesticide and states a quantity is replaced.
export function checkAnswer(answer: string): SafetyCheck {
  const chemical = matchHazardous(answer);
  return chemical && QUANTITY.test(answer) ? { blocked: true, chemical } : { blocked: false };
}
