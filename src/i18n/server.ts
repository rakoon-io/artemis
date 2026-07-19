import { cookies } from "next/headers";
import {
  defaultLocale,
  isLocale,
  LOCALE_COOKIE,
  type Locale,
} from "./config";
import { dictionaries, type Messages } from "./index";

/**
 * Acces i18n cote serveur (RSC, actions, routes). Lit la langue depuis le cookie
 * `locale` ; retombe sur la langue par defaut si absente ou invalide.
 */
export async function getLocale(): Promise<Locale> {
  const store = await cookies();
  const value = store.get(LOCALE_COOKIE)?.value;
  return isLocale(value) ? value : defaultLocale;
}

/** Dictionnaire correspondant a la langue courante (a await dans un composant serveur). */
export async function getDictionary(): Promise<Messages> {
  return dictionaries[await getLocale()];
}
