import en from "@/locales/en.json";

// English is the source of truth: every other locale must have the same keys.
// Krio ("kri") will be added here once translations exist (PRD 7, Localisation).
export const locales = ["en"] as const;
export type Locale = (typeof locales)[number];
export const defaultLocale: Locale = "en";

export type Dictionary = typeof en;

const dictionaries: Record<Locale, Dictionary> = { en };

// "home.title" | "errors.retry" | ... derived from en.json.
type Leaves<T, Prefix extends string = ""> = {
  [K in keyof T & string]: T[K] extends string
    ? `${Prefix}${K}`
    : Leaves<T[K], `${Prefix}${K}.`>;
}[keyof T & string];
export type TranslationKey = Leaves<Dictionary>;

export function isLocale(value: string | undefined | null): value is Locale {
  return !!value && (locales as readonly string[]).includes(value);
}

function lookup(dict: Dictionary, key: string): string | undefined {
  let node: unknown = dict;
  for (const part of key.split(".")) {
    if (typeof node !== "object" || node === null) return undefined;
    node = (node as Record<string, unknown>)[part];
  }
  return typeof node === "string" ? node : undefined;
}

export type Translator = (key: TranslationKey, vars?: Record<string, string | number>) => string;

// Missing keys fall back to English, then to the key itself, so a gap never breaks a page.
export function createTranslator(locale: Locale): Translator {
  const dict = dictionaries[locale];
  return (key, vars) => {
    const template = lookup(dict, key) ?? lookup(dictionaries[defaultLocale], key) ?? key;
    if (!vars) return template;
    return template.replace(/\{(\w+)\}/g, (match, name: string) =>
      name in vars ? String(vars[name]) : match,
    );
  };
}
