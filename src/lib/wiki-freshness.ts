/**
 * FRAÎCHEUR d'une page de documentation.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * POURQUOI SEULEMENT L'IMPLÉMENTATION
 *
 * Les trois sections du wiki se distinguent par leur rapport au temps, et cette
 * distinction dit exactement où la fraîcheur a un sens :
 *
 *  - une SPÉCIFICATION vit en versions figées. La version 2 n'est pas
 *    « périmée », elle est ce qui a été promis à ce moment-là ; la questionner
 *    n'aurait aucun sens.
 *  - un COMPTE RENDU est cloué à une date. Une réunion de 2019 n'est pas
 *    obsolète, elle est de l'histoire, et le signaler serait absurde.
 *  - une page d'IMPLÉMENTATION, elle, n'a qu'un seul état valable : celui du
 *    système aujourd'hui. Son mode de défaillance propre est de DEVENIR FAUSSE
 *    EN SILENCE - le code bouge, la page ne bouge pas, et personne ne s'en
 *    aperçoit avant d'avoir suivi une procédure qui n'existe plus.
 *
 * D'où le choix de n'afficher la fraîcheur que là. Un badge « à relire » sur un
 * compte rendu apprendrait à ignorer les badges.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * QUELLE DATE FAIT FOI
 *
 * La PLUS RÉCENTE de la modification et de la relecture déclarée.
 *
 * Ne juger que par `updatedAt` condamnerait la page juste qui n'a pas besoin
 * d'être corrigée : elle vieillirait sans raison, et l'on n'aurait d'autre
 * remède que de la modifier pour rien. Ne juger que par `reviewedAt` ignorerait
 * qu'une page qu'on vient de réécrire a forcément été relue.
 */

export type Freshness = "fresh" | "ageing" | "stale";

/**
 * Seuils, en jours. Six mois pour l'alerte douce, un an pour la ferme.
 *
 * Ce ne sont pas des vérités : ce sont des ordres de grandeur, choisis pour
 * qu'une page relue à chaque semestre reste verte. Trop courts, ils feraient
 * clignoter tout le wiki et l'on cesserait de les lire ; trop longs, ils
 * laisseraient passer l'année où la documentation a divergé du produit.
 */
export const AGEING_AFTER_DAYS = 180;
export const STALE_AFTER_DAYS = 365;

const DAY_MS = 24 * 60 * 60 * 1000;

function toDate(value: Date | string | null | undefined): Date | null {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

export interface Reviewable {
  updatedAt: Date | string;
  reviewedAt?: Date | string | null;
}

/**
 * Date à laquelle on a vu cette page pour la dernière fois - écrite ou relue.
 * Renvoie `null` si aucune des deux n'est exploitable, plutôt qu'une date
 * inventée qui ferait passer une page inconnue pour fraîche.
 */
export function lastCheckedAt(page: Reviewable): Date | null {
  const updated = toDate(page.updatedAt);
  const reviewed = toDate(page.reviewedAt);
  if (!updated) return reviewed;
  if (!reviewed) return updated;
  return reviewed > updated ? reviewed : updated;
}

/** Jours écoulés depuis la dernière vérification ; `null` si indéterminable. */
export function daysSinceCheck(page: Reviewable, now: Date): number | null {
  const last = lastCheckedAt(page);
  if (!last) return null;
  // Plancher à zéro : une date future - horloge décalée, saisie manuelle -
  // donnerait un âge négatif, et « relue dans 3 jours » n'apprend rien.
  return Math.max(0, Math.floor((now.getTime() - last.getTime()) / DAY_MS));
}

/**
 * Niveau de fraîcheur. `null` quand on ne peut pas se prononcer : on préfère ne
 * rien dire à laisser croire qu'une page a été vérifiée alors qu'on l'ignore.
 */
export function freshnessOf(page: Reviewable, now: Date): Freshness | null {
  const days = daysSinceCheck(page, now);
  if (days === null) return null;
  if (days >= STALE_AFTER_DAYS) return "stale";
  if (days >= AGEING_AFTER_DAYS) return "ageing";
  return "fresh";
}
