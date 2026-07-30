/**
 * SLUGS - fabrication d'identifiants lisibles pour les URL (module pur, testable
 * isolément : voir slug.test.ts).
 *
 * Un slug sert à ce qu'une adresse se lise, se retienne et se mette en favori :
 * `…/wiki?page=guide-du-projet` plutôt que `…/wiki?page=clx3f8a1b0000abcd`. Il
 * n'a aucune valeur d'identité - c'est l'identifiant technique qui fait foi en
 * base ; le slug n'est qu'une clef d'accès commode.
 *
 * Trois exigences, dans cet ordre :
 *  1. STABLE dans le temps pour un même titre : sinon un favori se périmerait au
 *     moindre redéploiement.
 *  2. SÛR dans une URL : ASCII, minuscules, sans espace ni ponctuation, donc
 *     jamais d'échappement en travers de la lisibilité recherchée.
 *  3. UNIQUE dans son projet : deux pages peuvent porter le même titre, l'adresse
 *     doit pourtant désigner l'une d'elles sans ambiguïté.
 */

/**
 * Longueur maximale. Un slug n'est pas un résumé : au-delà, la lisibilité ne
 * gagne plus rien et l'adresse devient impossible à relire d'un coup d'œil.
 */
export const MAX_SLUG_LENGTH = 80;

/** Repli lorsqu'un titre ne laisse aucun caractère exploitable (« ??? », « 日本 »). */
export const FALLBACK_SLUG = "page";

/**
 * Transforme un titre en slug : sans accents, en minuscules, les séparateurs
 * réduits à un tiret unique.
 *
 * La décomposition NFD sépare « é » en « e » + accent, que l'on retire ensuite :
 * c'est ce qui donne « spécification » -> « specification » plutôt que de perdre
 * la lettre entière. Un titre entièrement non latin ne laisse rien : on renvoie
 * alors le repli, jamais une chaîne vide qui produirait une URL cassée.
 */
export function slugify(title: string): string {
  const slug = title
    .normalize("NFD")
    // Signes diacritiques isolés par la décomposition NFD.
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    // Tout ce qui n'est ni lettre ASCII ni chiffre devient un séparateur.
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, MAX_SLUG_LENGTH)
    // La troncature peut retomber sur un tiret : on le retire après coup.
    .replace(/-+$/g, "");
  return slug || FALLBACK_SLUG;
}

/**
 * Rend un slug unique en le suffixant d'un compteur : `guide`, `guide-2`,
 * `guide-3`… Le premier arrivé garde le slug nu, ce qui rend le résultat
 * indépendant de l'ordre d'appel pour toutes les pages sauf les homonymes.
 *
 * `taken` contient les slugs DÉJÀ pris dans le projet ; l'appelant l'obtient
 * d'une requête, la vérification finale restant la contrainte d'unicité en base.
 */
export function uniqueSlug(base: string, taken: Iterable<string>): string {
  const used = new Set(taken);
  if (!used.has(base)) return base;
  // On borne la base pour que le suffixe ne pousse pas le slug au-delà du
  // maximum : un slug tronqué APRÈS coup perdrait justement son suffixe.
  for (let n = 2; ; n += 1) {
    const suffix = `-${n}`;
    const candidate = `${base.slice(0, MAX_SLUG_LENGTH - suffix.length).replace(/-+$/g, "")}${suffix}`;
    if (!used.has(candidate)) return candidate;
  }
}

/**
 * Slug d'un titre, unique dans son projet, éventuellement PRÉFIXÉ. Point d'entrée
 * unique : les services n'ont pas à connaître l'enchaînement `slugify` puis
 * `uniqueSlug`.
 *
 * Le préfixe sert aux comptes rendus de réunion, datés : la date en tête rend
 * l'adresse parlante (`2026-07-28-point-hebdomadaire`) et range les comptes
 * rendus par ordre chronologique partout où l'on trie sur le slug. Il est
 * normalisé comme le reste - un appelant ne peut pas y glisser de caractère
 * inapte à une URL.
 */
export function slugForTitle(
  title: string,
  taken: Iterable<string>,
  prefix?: string | null,
): string {
  const cleanPrefix = prefix ? slugify(prefix) : "";
  const body = slugify(title);
  // La borne s'applique à l'ENSEMBLE : préfixer ne doit pas faire déborder.
  const base =
    cleanPrefix && cleanPrefix !== FALLBACK_SLUG
      ? `${cleanPrefix}-${body}`.slice(0, MAX_SLUG_LENGTH).replace(/-+$/g, "")
      : body;
  return uniqueSlug(base, taken);
}

/**
 * Préfixe de date d'un compte rendu, au format `AAAA-MM-JJ`. Lu en UTC, comme
 * les dates sont écrites (minuit UTC) : le jour affiché est celui qui a été saisi.
 */
export function datePrefix(date: Date | string | null | undefined): string | null {
  if (!date) return null;
  const value = date instanceof Date ? date : new Date(date);
  return Number.isNaN(value.getTime()) ? null : value.toISOString().slice(0, 10);
}
