/**
 * Selection (pure, testable) des destinataires d'une notification de ticket.
 * « Les concernes » d'un ticket sont son rapporteur et son assigne. On ne notifie
 * jamais l'auteur de l'action (pas d'auto-notification) et on deduplique par e-mail.
 */

export interface Person {
  id: string;
  email: string | null;
  name: string | null;
}

/**
 * Destinataires d'une notification de commentaire : rapporteur + assigne, sans
 * l'auteur du commentaire, dedupliques par e-mail, et uniquement s'ils ont un e-mail.
 */
export function commentRecipients(
  reporter: Person | null,
  assignee: Person | null,
  authorId: string,
): Person[] {
  const out: Person[] = [];
  const seen = new Set<string>();
  for (const p of [reporter, assignee]) {
    if (!p || !p.email) continue;
    if (p.id === authorId) continue;
    const key = p.email.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(p);
  }
  return out;
}

/** Tronque un texte a `max` caracteres (ajoute une ellipse si coupe). */
export function truncate(text: string, max = 600): string {
  const t = text.trim();
  return t.length > max ? `${t.slice(0, max)}...` : t;
}
