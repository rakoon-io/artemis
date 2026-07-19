"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { isLocale, LOCALE_COOKIE, type Locale } from "./config";

/**
 * Memorise la langue choisie dans le cookie `locale` et revalide le rendu pour
 * que toute l'interface (serveur + client) bascule immediatement.
 */
export async function setLocaleAction(locale: Locale): Promise<void> {
  if (!isLocale(locale)) return;
  const store = await cookies();
  store.set(LOCALE_COOKIE, locale, {
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
    sameSite: "lax",
  });
  revalidatePath("/", "layout");
}
