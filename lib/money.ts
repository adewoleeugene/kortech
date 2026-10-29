// Leones (SLE) are stored as integer minor units: 1 SLE = 100 minor units (PRD 7, Currency).

const MAX_MINOR = 1_000_000_000_00; // SLE 1 billion: well above any listing price

// "1,250.50" -> 125050. Empty -> null (no price). Invalid -> undefined.
export function parseSleToMinor(input: string): number | null | undefined {
  const cleaned = input.replace(/[,\s]/g, "").replace(/^(SLE|Le)/i, "");
  if (cleaned === "") return null;
  if (!/^\d+(\.\d{1,2})?$/.test(cleaned)) return undefined;
  const [whole, fraction = ""] = cleaned.split(".");
  const minor = Number(whole) * 100 + Number(fraction.padEnd(2, "0"));
  return minor > 0 && minor <= MAX_MINOR ? minor : undefined;
}

// 125050 -> "SLE 1,250.50"; 25000 -> "SLE 250"
export function formatSle(minor: number, locale = "en"): string {
  const amount = new Intl.NumberFormat(locale, {
    minimumFractionDigits: minor % 100 === 0 ? 0 : 2,
    maximumFractionDigits: 2,
  }).format(minor / 100);
  return `SLE ${amount}`;
}

// For pre-filling forms: 125050 -> "1250.50"
export function minorToInput(minor: number | null): string {
  if (minor === null) return "";
  return minor % 100 === 0 ? String(minor / 100) : (minor / 100).toFixed(2);
}
