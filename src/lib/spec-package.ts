import { readingOrder, type FlatPage } from "./wiki-tree";

/**
 * PAQUET DE SPÉCIFICATIONS - logique pure du versionnement (aucun accès base,
 * testable isolément : voir spec-package.test.ts).
 *
 * Un paquet est un SOUS-ARBRE du wiki : une page racine et toutes ses
 * descendantes, traitées comme un document unique. Publier une version consiste
 * à figer ce sous-arbre - le contenu de chaque page, son titre, sa place dans
 * l'ordre de lecture et son chemin dans l'arborescence.
 *
 * QUELLES pages, DANS QUEL ORDRE et sous QUEL chemin : la réponse est
 * `readingOrder`, dans `wiki-tree.ts`. Elle vivait ici sous le nom
 * `specSubtree`, ce qui laissait croire qu'un paquet de spécifications avait
 * son propre parcours d'arbre. Il n'en a jamais eu : c'est le parcours du wiki,
 * et l'export d'une page avec ses sous-pages s'en sert désormais aussi.
 *
 * Deux propriétés en découlent, et méritent d'être dites ici :
 *  - l'ordre est celui de la LECTURE, le même que celui du plan : une version
 *    publiée se lit donc comme le document qu'elle archive ;
 *  - le chemin est figé À LA PUBLICATION. Réorganiser le wiki ensuite ne réécrit
 *    pas le passé : une version publiée dit où se trouvait la page ce jour-là.
 */

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
  return readingOrder(pages, rootId).some((entry) => entry.page.id === pageId);
}
