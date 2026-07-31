/**
 * ÉTAT D'UNE VERSION - logique pure (aucun accès base, aucune horloge lue ici :
 * l'instant est passé en argument, ce qui rend la fonction testable et le
 * résultat reproductible).
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * L'AVANCEMENT SE DÉDUIT
 *
 * « Terminés » = les tickets parvenus à la DERNIÈRE colonne du tableau. Aucun
 * champ à tenir à jour, aucun pourcentage à corriger : ce qui est fait est ce
 * qu'on a déplacé jusqu'au bout. Un avancement saisi à la main ment dès la
 * première semaine.
 *
 * On se fie au RANG de la colonne, jamais à son nom : un projet renomme ses
 * colonnes, en ajoute, les traduit.
 */

export interface ReleaseLike {
  state: "PLANNED" | "RELEASED";
  dueDate: Date | null;
}

/** Une version est en retard si sa date visée est passée et qu'elle n'est pas livrée. */
export function isReleaseLate(release: ReleaseLike, now: number): boolean {
  if (release.state !== "PLANNED") return false;
  return release.dueDate != null && release.dueDate.getTime() < now;
}

/** Nombre de tickets achevés parmi ceux d'une version. */
export function countDone(
  tickets: readonly { column: { order: number } }[],
  lastColumnOrder: number,
): number {
  return tickets.filter((ticket) => ticket.column.order >= lastColumnOrder).length;
}
