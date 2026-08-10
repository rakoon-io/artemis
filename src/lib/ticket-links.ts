import type { TicketLinkType } from "@prisma/client";

/**
 * LIENS ENTRE TICKETS - la règle, sans la base.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * POURQUOI CE MODULE EXISTE À PART
 *
 * Un lien n'est écrit QU'UNE FOIS, orienté de la source vers la cible. Tout le
 * reste - le libellé à afficher, le côté depuis lequel on regarde, ce qui vaut
 * doublon - se DÉDUIT de cette ligne unique. Ces déductions sont la seule chose
 * qui puisse être fausse ici, et elles ne demandent ni base de données ni
 * session : elles vivent donc dans un module pur, et se testent comme tel.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * ORIENTÉ, MAIS LU DES DEUX BOUTS
 *
 * « A bloque B » et « B est bloqué par A » sont le même fait. Le stocker deux
 * fois obligerait à créer, modifier et supprimer les deux lignes ensemble, à
 * jamais - et la première divergence afficherait une dépendance sur une seule
 * des deux fiches, sans que rien ne signale l'incohérence.
 */

/** Depuis quel bout du lien on le regarde. */
export type LinkDirection = "OUT" | "IN";

/**
 * Clef de libellé à afficher, selon le type et le bout depuis lequel on lit.
 * `RELATES` est symétrique : le même mot des deux côtés, ce qui est exactement
 * ce qu'on attend d'un simple voisinage.
 */
export type LinkLabelKey =
  | "blocks"
  | "blockedBy"
  | "duplicates"
  | "duplicatedBy"
  | "relates";

export function linkLabelKey(
  type: TicketLinkType,
  direction: LinkDirection,
): LinkLabelKey {
  if (type === "RELATES") return "relates";
  if (type === "BLOCKS") return direction === "OUT" ? "blocks" : "blockedBy";
  return direction === "OUT" ? "duplicates" : "duplicatedBy";
}

/**
 * Ce lien exprime-t-il une DÉPENDANCE bloquante subie par le ticket regardé ?
 * Sert à mettre en avant ce qui empêche d'avancer, plutôt que de noyer la
 * contrainte au milieu de voisinages sans conséquence.
 */
export function isBlocking(
  type: TicketLinkType,
  direction: LinkDirection,
): boolean {
  return type === "BLOCKS" && direction === "IN";
}

export interface StoredLink {
  id: string;
  type: TicketLinkType;
  sourceId: string;
  targetId: string;
}

export interface ResolvedLink<T> {
  id: string;
  type: TicketLinkType;
  direction: LinkDirection;
  labelKey: LinkLabelKey;
  blocking: boolean;
  /** L'AUTRE ticket : celui qui n'est pas celui qu'on regarde. */
  other: T;
}

/**
 * Ramène les liens sortants et entrants d'un ticket à une liste unique, chacun
 * vu depuis ce ticket. L'appelant n'a plus à savoir de quel côté la ligne a été
 * écrite - ce qui est précisément la complexité que le stockage orienté crée et
 * que l'affichage ne doit pas hériter.
 *
 * Les liens bloquants d'abord : c'est ce qui conditionne le travail.
 */
export function resolveLinks<T>(
  ticketId: string,
  links: (StoredLink & { source: T; target: T })[],
): ResolvedLink<T>[] {
  return links
    .map((l) => {
      const direction: LinkDirection = l.sourceId === ticketId ? "OUT" : "IN";
      return {
        id: l.id,
        type: l.type,
        direction,
        labelKey: linkLabelKey(l.type, direction),
        blocking: isBlocking(l.type, direction),
        other: direction === "OUT" ? l.target : l.source,
      };
    })
    .sort((a, b) => Number(b.blocking) - Number(a.blocking));
}

/** Motif de refus d'un lien, ou `null` si le lien est recevable. */
export type LinkRefusal = "SELF" | "OTHER_PROJECT" | null;

/**
 * Un ticket peut-il être lié à un autre ?
 *
 * Deux refus, et deux seulement. Se lier à soi-même n'exprime rien. Lier deux
 * projets créerait une dépendance qu'aucune des deux fiches ne pourrait montrer
 * en entier, puisque l'accès se donne projet par projet : la moitié des lecteurs
 * verrait une référence vers un ticket qu'ils n'ont pas le droit d'ouvrir.
 */
export function refuseLink(
  source: { id: string; projectId: string },
  target: { id: string; projectId: string },
): LinkRefusal {
  if (source.id === target.id) return "SELF";
  if (source.projectId !== target.projectId) return "OTHER_PROJECT";
  return null;
}
