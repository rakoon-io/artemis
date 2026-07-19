import { fr } from "./dictionaries/fr";
import { en } from "./dictionaries/en";
import type { Locale } from "./config";

export type { Messages } from "./dictionaries/fr";

/** Dictionnaires indexes par langue. */
export const dictionaries: Record<Locale, typeof fr> = { fr, en };

/**
 * Interpole les {clefs} d'un gabarit avec les valeurs fournies.
 * Ex. fmt("{done} / {total} termines", { done: 2, total: 5 }) -> "2 / 5 termines".
 */
export function fmt(
  template: string,
  vars: Record<string, string | number>,
): string {
  return template.replace(/\{(\w+)\}/g, (_, key) =>
    key in vars ? String(vars[key]) : `{${key}}`,
  );
}
