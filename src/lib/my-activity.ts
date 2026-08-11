import { isTicketDone } from "./release-progress";

/**
 * MON ACTIVITÉ - où en est chacune de mes tâches, logique pure (aucun accès
 * base, aucune horloge).
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * TROIS ÉTATS, DÉDUITS DU RANG DES COLONNES
 *
 * Le modèle ne porte aucun drapeau « en cours » ni « terminé » : un statut est
 * une COLONNE, et chaque projet nomme les siennes comme il l'entend. On se fie
 * donc au RANG, jamais au nom - même règle que `release-progress`, pour la même
 * raison : un projet renomme ses colonnes, les traduit, en ajoute.
 *
 *   - `done`  : la dernière colonne est atteinte (règle commune `isTicketDone`) ;
 *   - `todo`  : le ticket n'a pas bougé de la colonne d'entrée (le plus petit
 *               rang) - il m'est assigné, mais rien n'est commencé ;
 *   - `doing` : tout le reste, c'est-à-dire sorti de l'entrée sans avoir atteint
 *               la fin - le travail engagé.
 *
 * Ce découpage est GROSSIER par construction, et c'est assumé : entre l'entrée
 * et la fin, un projet peut aligner « À faire », « En cours », « En revue ».
 * L'affichage rattrape la nuance en montrant, sur chaque ligne, le nom réel de
 * la colonne - le regroupement situe, le libellé précise.
 *
 * Cas limite : un projet d'UNE seule colonne a `first === last`. `done` est
 * évalué en premier, tout y est donc terminé - le seul verdict cohérent quand
 * l'entrée est aussi la sortie.
 */

/** Les trois états d'une tâche vue depuis l'accueil. */
export type ActivityState = "todo" | "doing" | "done";

/** Rangs extrêmes des colonnes d'un projet : l'entrée et la fin du workflow. */
export interface ColumnBounds {
  first: number;
  last: number;
}

/** Où en est ce ticket, au sens des trois états ci-dessus. */
export function ticketActivityState(
  ticket: { column: { order: number } },
  bounds: ColumnBounds,
): ActivityState {
  if (isTicketDone(ticket, bounds.last)) return "done";
  return ticket.column.order > bounds.first ? "doing" : "todo";
}

/** Mes tâches réparties dans les trois états, l'ordre d'entrée étant conservé. */
export interface Activity<T> {
  todo: T[];
  doing: T[];
  done: T[];
}

/**
 * Répartit des tickets dans les trois états. Le tri d'origine est PRÉSERVÉ à
 * l'intérieur de chaque groupe (l'appelant trie par date de mise à jour : le
 * plus frais reste en tête).
 *
 * Un ticket dont le projet n'a aucune colonne connue est ignoré : sans rang de
 * référence, on ne saurait pas le situer, et l'inventer le rangerait au hasard.
 */
export function groupByActivity<
  T extends { projectId: string; column: { order: number } },
>(
  tickets: readonly T[],
  boundsByProject: ReadonlyMap<string, ColumnBounds>,
): Activity<T> {
  const activity: Activity<T> = { todo: [], doing: [], done: [] };
  for (const ticket of tickets) {
    const bounds = boundsByProject.get(ticket.projectId);
    if (!bounds) continue;
    activity[ticketActivityState(ticket, bounds)].push(ticket);
  }
  return activity;
}
