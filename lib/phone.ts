// Sierra Leone phone numbers only for the MVP: +232 followed by 8 digits.
// Accepts the ways people actually type them: "076 123456", "76123456",
// "+232 76 123 456", "232-76-123456", "0023276123456".

const SL_COUNTRY_CODE = "232";
const NATIONAL_DIGITS = 8;

export function normalizeSierraLeonePhone(input: string): string | null {
  let digits = input.replace(/[\s\-().]/g, "");
  if (!/^\+?\d+$/.test(digits)) return null;
  digits = digits.replace(/^\+/, "");

  if (digits.startsWith("00" + SL_COUNTRY_CODE)) digits = digits.slice(2 + SL_COUNTRY_CODE.length);
  else if (digits.startsWith(SL_COUNTRY_CODE) && digits.length === SL_COUNTRY_CODE.length + NATIONAL_DIGITS) {
    digits = digits.slice(SL_COUNTRY_CODE.length);
  } else if (digits.startsWith("0") && digits.length === NATIONAL_DIGITS + 1) digits = digits.slice(1);

  if (digits.length !== NATIONAL_DIGITS || digits.startsWith("0")) return null;
  return `+${SL_COUNTRY_CODE}${digits}`;
}

// "+23276123456" -> "076 123 456" for display.
export function formatPhoneForDisplay(e164: string): string {
  const national = e164.replace(/^\+232/, "0");
  return `${national.slice(0, 3)} ${national.slice(3, 6)} ${national.slice(6)}`;
}
