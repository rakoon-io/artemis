import type { FlatPage } from "./wiki-tree";

/**
 * PAQUET DE SPÉCIFICATIONS - logique pure du versionnement (aucun accès base,
 * testable isolément : voir spec-package.test.ts).
 *
 * Un paquet est un SOUS-ARBRE du wiki : une page racine et toutes ses
 * descendantes, traitées comme un document unique. Publier une version consiste
 * à figer ce sous-arbre - le contenu de chaque page, son titre, sa place dans
 * l'ordre de lecture et son chemin dans l'arborescence.
 *
 * Ce module répond à la seule question délicate de l'opération : QUELLES pages,
 * DANS QUEL ORDRE, et sous QUEL chemin. Le reste (écrire les lignes) est du
 * ressort du service.
 *
 * Deux propriétés sont recherchées :
 *  - l'ordre est celui de la LECTURE (parcours en profondeur, frères par ordre
 *    alphabétique), le même que celui du sommaire du wiki : une version publiée
 *    se lit donc comme le document qu'elle archive ;
 *  - le chemin est figé À LA PUBLICATION. Réorganiser le wiki ensuite ne réécrit
 *    pas le passé : une version publiée dit où se trouvait la page ce jour-là.
 */

/** Une page du paquet, à sa place dans le document. */
export interface SpecEntry<T> {
  page: T;
  /** Position dans l'ordre de lecture (0 = la page racine). */
  order: number;
  /** Chemin lisible depuis la racine du paquet, incluse (« Spéc / Champs »). */
  path: string;
  /** Profondeur relative à la racine (0 pour la racine elle-même). */
  depth: number;
}

/** Séparateur de chemin, choisi lisible plutôt que technique. */
export const PATH_SEPARATOR = " / ";

/**
 * Comparaison des titres, identique à celle de l'arborescence du wiki
 * (`wiki-tree.ts`) : l'ordre d'une version publiée doit être celui que l'on voit
 * dans le sommaire, sans quoi le document archivé serait dans un autre ordre que
 * l'original.
 */
function byTitle(a: FlatPage, b: FlatPage): number {
  return a.title.localeCompare(b.title, "fr", { sensitivity: "base" });
}

/**
 * Pages du paquet ancré sur `rootId`, dans l'ordre de lecture, avec leur chemin.
 * Renvoie un tableau vide si la racine n'existe pas.
 *
 * Le garde-fou `visited` protège d'un cycle parent/enfant : la base l'interdit
 * en pratique (l'action anti-cycle du wiki), mais une boucle ferait ici une
 * récursion infinie au lieu d'un simple résultat tronqué.
 */
export function specSubtree<T extends FlatPage>(
  pages: T[],
  rootId: string,
): SpecEntry<T>[] {
  const root = pages.find((page) => page.id === rootId);
  if (!root) return [];

  const childrenOf = new Map<string, T[]>();
  for (const page of pages) {
    if (!page.parentId) continue;
    const siblings = childrenOf.get(page.parentId);
    if (siblings) siblings.push(page);
    else childrenOf.set(page.parentId, [page]);
  }
  for (const siblings of childrenOf.values()) siblings.sort(byTitle);

  const entries: SpecEntry<T>[] = [];
  const visited = new Set<string>();

  const walk = (page: T, depth: number, trail: string[]): void => {
    if (visited.has(page.id)) return;
    visited.add(page.id);
    const path = [...trail, page.title];
    entries.push({
      page,
      order: entries.length,
      path: path.join(PATH_SEPARATOR),
      depth,
    });
    for (const child of childrenOf.get(page.id) ?? []) {
      walk(child, depth + 1, path);
    }
  };

  walk(root, 0, []);
  return entries;
}

/**
 * Numéro de la prochaine version. Se fonde sur le MAXIMUM et non sur le nombre
 * de versions : si une version était supprimée un jour, recycler son numéro
 * ferait pointer deux documents différents sur « v3 ».
 */
export function nextVersionNumber(existingNumbers: readonly number[]): number {
  return existingNumbers.reduce((max, n) => (n > max ? n : max), 0) + 1;
}

/**
 * Intitulé d'une version : « v3 » seul, ou « v3 — Recette client » lorsqu'un
 * libellé a été saisi. Le numéro reste toujours en tête : c'est lui qui ordonne,
 * un libellé peut être vide, répété, ou changer de convention en cours de route.
 */
export function formatVersionLabel(
  number: number,
  label?: string | null,
): string {
  const trimmed = label?.trim();
  return trimmed ? `v${number} — ${trimmed}` : `v${number}`;
}

/**
 * Une page appartient-elle au paquet ancré sur `rootId` ? Sert à savoir, depuis
 * n'importe quelle page consultée, si l'on se trouve dans une spécification.
 */
export function isInSpecSubtree<T extends FlatPage>(
  pages: T[],
  rootId: string,
  pageId: string,
): boolean {
  return specSubtree(pages, rootId).some((entry) => entry.page.id === pageId);
}
