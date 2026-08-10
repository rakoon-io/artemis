/**
 * CE QU'UNE VERSION CONTIENT - logique pure, sans base ni horloge.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * DEUX FAÇONS D'ÊTRE DANS UNE VERSION
 *
 * Un ticket y est parce qu'on l'y a mis (`releaseId`), ou parce qu'il appartient
 * à un SPRINT que l'on a rattaché à cette version. La seconde évite de ranger un
 * par un ce qu'une itération entière va livrer : on déclare « ce sprint sort en
 * 1.3 », et son contenu suit.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * LE RATTACHEMENT EXPLICITE L'EMPORTE
 *
 * Un ticket d'un sprint rattaché à la 1.3, mais rangé à la main dans la 1.4,
 * appartient à la 1.4. Le geste porté sur CE ticket est plus précis que la règle
 * qui vaut pour tout le sprint - c'est d'ailleurs à cela qu'il sert : sortir une
 * chose du lot. La règle inverse rendrait le rattachement individuel inopérant,
 * et un ticket compterait dans deux versions à la fois.
 *
 * L'invariant qui en découle : un ticket appartient à AU PLUS une version.
 */

/** D'où vient l'appartenance d'un ticket à la version qui l'affiche. */
export type TicketOrigin = "DIRECT" | "SPRINT";

export interface ScopedTicket {
  id: string;
  /** Version rattachée à la main. `null` = aucune. */
  releaseId?: string | null;
}

export interface SprintScope<T> {
  id: string;
  name: string;
  tickets: T[];
}

/**
 * Contenu d'une version : ses tickets rattachés à la main, puis ceux de ses
 * sprints qui n'en ont pas d'autre.
 *
 * Le dédoublonnage n'est pas un luxe : un ticket peut être rattaché à la fois à
 * la version ET à l'un de ses sprints, cas parfaitement ordinaire dès qu'on a
 * rangé quelques tickets avant de rattacher l'itération. Sans cela il compterait
 * deux fois dans l'avancement, et la barre dépasserait son propre total.
 */
export type ScopedResult<T> = T & {
  origin: TicketOrigin;
  /** Renseigné pour les seuls tickets hérités : de quelle itération ils viennent. */
  fromSprint?: { id: string; name: string };
};

export function releaseContent<T extends ScopedTicket>(
  direct: T[],
  sprints: SprintScope<T>[],
): ScopedResult<T>[] {
  const vus = new Set(direct.map((t) => t.id));
  const sortie: ScopedResult<T>[] = direct.map((t) => ({
    ...t,
    origin: "DIRECT" as const,
  }));

  for (const sprint of sprints) {
    for (const ticket of sprint.tickets) {
      // Rattaché ailleurs à la main : il appartient à cette autre version.
      if (ticket.releaseId != null) continue;
      if (vus.has(ticket.id)) continue;
      vus.add(ticket.id);
      sortie.push({
        ...ticket,
        origin: "SPRINT" as const,
        fromSprint: { id: sprint.id, name: sprint.name },
      });
    }
  }
  return sortie;
}

/**
 * Un sprint peut-il être rattaché à cette version ?
 *
 * Refusé s'il appartient déjà à une AUTRE version : un sprint ne sort pas deux
 * fois. Le détacher d'abord est un geste explicite, et c'est bien ainsi - sans
 * quoi rattacher ici retirerait en silence d'ailleurs.
 */
export function sprintAssignable(
  sprint: { releaseId: string | null },
  releaseId: string,
): boolean {
  return sprint.releaseId == null || sprint.releaseId === releaseId;
}
