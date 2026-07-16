import { generateKeyBetween, generateNKeysBetween } from "fractional-indexing";

/**
 * Ordre lexicographique des cartes (lexorank) - voir ADR-0002.
 * S'appuie sur `fractional-indexing` (éprouvé) : insérer entre deux voisines
 * ne recalcule qu'un seul `rank`, sans renuméroter la colonne.
 */

/** Rang strictement compris entre `a` et `b` (chacun peut être null pour un bord). */
export function rankBetween(a: string | null, b: string | null): string {
  return generateKeyBetween(a ?? null, b ?? null);
}

/** Rang à la fin d'une liste dont la dernière valeur est `last` (null si vide). */
export function rankAfter(last: string | null): string {
  return generateKeyBetween(last ?? null, null);
}

/** Rang au début d'une liste dont la première valeur est `first` (null si vide). */
export function rankBefore(first: string | null): string {
  return generateKeyBetween(null, first ?? null);
}

/** `n` rangs initiaux, régulièrement espacés (pour un seed / une colonne neuve). */
export function initialRanks(n: number): string[] {
  return generateNKeysBetween(null, null, n);
}
