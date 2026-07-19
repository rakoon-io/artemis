/**
 * Configuration i18n : langues supportees et langue par defaut.
 * L'app est bilingue (francais par defaut, anglais en plus). La langue choisie
 * est memorisee dans un cookie, sans changement d'URL.
 */
export const locales = ["fr", "en"] as const;

export type Locale = (typeof locales)[number];

export const defaultLocale: Locale = "fr";

/** Nom du cookie qui memorise la langue choisie. */
export const LOCALE_COOKIE = "locale";

/** Libelles des langues, tels qu'affiches dans le selecteur. */
export const localeNames: Record<Locale, string> = {
  fr: "Français",
  en: "English",
};

/** Garde de type : la valeur est-elle une langue supportee ? */
export function isLocale(value: string | undefined | null): value is Locale {
  return value === "fr" || value === "en";
}
