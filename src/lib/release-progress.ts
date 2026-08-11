/**
 * CE QUI EST FAIT, ET CE QUI RESTE - logique pure (aucun accès base, aucune
 * horloge lue ici :
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
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * LA MÊME RÈGLE POUR LES VERSIONS ET POUR LES SPRINTS
 *
 * Les deux répondent à la même question - « où en est-on ? » - et doivent y
 * répondre pareil. Deux définitions de « terminé » à deux endroits auraient fini
 * par diverger, et l'on aurait vu un sprint achevé nourrir une version qui ne
 * l'était pas.
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
  return tickets.filter((ticket) => ticket.column.order >= lastColumnOrder)
    .length;
}

/** Ce ticket est-il achevé ? Il l'est s'il a atteint la dernière colonne. */
export function isTicketDone(
  ticket: { column: { order: number } },
  lastColumnOrder: number,
): boolean {
  return ticket.column.order >= lastColumnOrder;
}

/**
 * CE QUI RESTE À FAIRE D'ABORD.
 *
 * Une liste où l'achevé se mêle au reste oblige à le trier de l'œil à chaque
 * lecture, et c'est le reste qui intéresse : le fait est acquis, le reste est le
 * travail. L'achevé n'est pas caché pour autant - il dit ce que l'itération a
 * produit, et le masquer donnerait l'illusion d'un lot plus petit qu'il n'est.
 *
 * Le tri est STABLE, et c'est ce qui compte ici : à l'intérieur de chaque
 * groupe, l'ordre d'origine est conservé au ticket près - rang du tableau pour
 * une version, ordre de la requête pour un sprint. Un tri qui remélangerait ces
 * deux ordres ferait sautiller les lignes à chaque changement de colonne.
 */
export function undoneFirst<T extends { column: { order: number } }>(
  tickets: readonly T[],
  lastColumnOrder: number,
): T[] {
  const restants: T[] = [];
  const acheves: T[] = [];
  for (const ticket of tickets) {
    (isTicketDone(ticket, lastColumnOrder) ? acheves : restants).push(ticket);
  }
  return [...restants, ...acheves];
}
