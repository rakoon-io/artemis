/**
 * Module EFFECTIF d'un ticket - module pur (aucune dépendance), donc testable.
 *
 * Le modèle autorise deux chemins vers un module, tous deux facultatifs :
 *   - indirect : le ticket désigne un composant, lequel appartient à un module ;
 *   - direct   : le ticket, s'il ne désigne aucun composant, porte son propre
 *                module (demande à grosse maille, sans écran précis).
 *
 * L'INVARIANT posé par `ticket.service` est que ces deux chemins ne sont jamais
 * empruntés en même temps : dès qu'un composant est choisi, le module propre du
 * ticket repasse à `null`. La règle de résolution ci-dessous fait malgré tout
 * primer le composant, afin qu'une donnée héritée ou écrite hors application
 * (import, SQL direct) ne puisse pas afficher un module contredisant le
 * composant visible à l'écran.
 */

/** Référence minimale d'un module, telle qu'affichée (badge, filtre, prompt). */
export interface ModuleRef {
  id: string;
  name: string;
  color: string;
}

/** Ticket vu sous l'angle de son rattachement fonctionnel. */
export interface ModuleBearingTicket {
  module?: ModuleRef | null;
  component?: { module?: ModuleRef | null } | null;
}

/**
 * Renvoie le module effectif du ticket, ou `null` s'il n'en a aucun.
 *
 * Le composant fait autorité DÈS QU'IL EST PRÉSENT, y compris lorsqu'il n'a
 * lui-même aucun module (cas d'un composant transverse). Écrire
 * `ticket.component?.module ?? ticket.module` serait plus court mais faux : sur
 * une donnée incohérente, un composant transverse laisserait remonter le module
 * propre du ticket, et l'écran afficherait un module que le composant choisi
 * contredit - précisément ce que l'invariant cherche à rendre impossible.
 */
export function effectiveModule(ticket: ModuleBearingTicket): ModuleRef | null {
  if (ticket.component) return ticket.component.module ?? null;
  return ticket.module ?? null;
}

/**
 * Applique l'invariant avant écriture : un ticket rattaché à un composant ne
 * porte pas de module propre. Centralisé ici pour que création et mise à jour
 * ne puissent pas diverger.
 *
 * `componentId` est le composant que le ticket AURA après l'écriture (en mise à
 * jour, l'appelant résout donc d'abord « valeur fournie, sinon valeur actuelle »).
 * Le générique préserve `undefined` en sortie, qui signifie « ne pas toucher au
 * champ » côté mise à jour partielle - une valeur `null` serait, elle, écrite.
 */
export function moduleIdForTicket<T extends string | null | undefined>(
  componentId: string | null | undefined,
  moduleId: T,
): T | null {
  return componentId ? null : moduleId;
}
