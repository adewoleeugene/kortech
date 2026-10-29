import "server-only";
import { cookies } from "next/headers";
import { createTranslator, defaultLocale, isLocale, type Locale } from ".";

export const LOCALE_COOKIE = "sf_lang";

export async function getLocale(): Promise<Locale> {
  const value = (await cookies()).get(LOCALE_COOKIE)?.value;
  return isLocale(value) ? value : defaultLocale;
}

export async function getTranslator() {
  const locale = await getLocale();
  return { locale, t: createTranslator(locale) };
}
