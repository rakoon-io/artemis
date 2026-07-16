import { prisma } from "@/lib/db";
import {
  appBaseUrl,
  isEmailConfigured,
  sendEmail,
  ticketEmailHtml,
} from "@/lib/email";
import { commentRecipients, truncate } from "@/lib/notify-recipients";

/**
 * Notifications par e-mail (Mailjet) sur les evenements de ticket. Ces fonctions
 * sont **non bloquantes et ne levent jamais** : une panne d'e-mail ne doit pas
 * casser l'action de l'utilisateur. Elles ne font rien si l'e-mail n'est pas
 * configure. Les appelants les lancent en « fire-and-forget » (`void notify...`).
 */

const ticketSelect = {
  id: true,
  key: true,
  title: true,
  reporter: { select: { id: true, email: true, name: true } },
  assignee: { select: { id: true, email: true, name: true } },
  project: { select: { key: true } },
} as const;

function ticketUrl(projectKey: string, ticketId: string): string {
  return `${appBaseUrl()}/projects/${projectKey}/tickets/${ticketId}`;
}

/** Notifie le rapporteur et l'assigne d'un nouveau commentaire (hors auteur). */
export async function notifyNewComment(
  ticketId: string,
  authorId: string,
  body: string,
): Promise<void> {
  try {
    if (!isEmailConfigured()) return;
    const t = await prisma.ticket.findUnique({
      where: { id: ticketId },
      select: ticketSelect,
    });
    if (!t) return;
    const recipients = commentRecipients(t.reporter, t.assignee, authorId);
    if (recipients.length === 0) return;

    const url = ticketUrl(t.project.key, t.id);
    const html = ticketEmailHtml({
      heading: `Nouveau commentaire sur ${t.key}`,
      intro: "Un nouveau commentaire a ete ajoute sur ce ticket.",
      ticketKey: t.key,
      ticketTitle: t.title,
      url,
      quote: truncate(body),
    });
    await Promise.all(
      recipients.map((r) =>
        sendEmail({
          to: r.email!,
          toName: r.name ?? undefined,
          subject: `[${t.key}] Nouveau commentaire`,
          html,
        }),
      ),
    );
  } catch (error) {
    console.error("[notify] commentaire:", error);
  }
}

/**
 * Notifie le nouvel assigne qu'un ticket lui a ete attribue. Ne notifie pas si
 * l'assignation est faite par la personne elle-meme (pas d'auto-notification).
 */
export async function notifyTicketAssigned(
  ticketId: string,
  newAssigneeId: string | null | undefined,
  actorId: string,
): Promise<void> {
  try {
    if (!isEmailConfigured()) return;
    if (!newAssigneeId || newAssigneeId === actorId) return;
    const t = await prisma.ticket.findUnique({
      where: { id: ticketId },
      select: ticketSelect,
    });
    // Coherence : l'assigne courant doit bien etre la personne notifiee.
    if (!t || t.assignee?.id !== newAssigneeId || !t.assignee.email) return;

    const url = ticketUrl(t.project.key, t.id);
    const html = ticketEmailHtml({
      heading: `Ticket assigne : ${t.key}`,
      intro: "Ce ticket vient de vous etre assigne.",
      ticketKey: t.key,
      ticketTitle: t.title,
      url,
    });
    await sendEmail({
      to: t.assignee.email,
      toName: t.assignee.name ?? undefined,
      subject: `[${t.key}] Ticket assigne`,
      html,
    });
  } catch (error) {
    console.error("[notify] assignation:", error);
  }
}
