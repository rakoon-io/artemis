import type { TicketLinkType } from "@prisma/client";
import { prisma } from "@/lib/db";

/**
 * LIENS ENTRE TICKETS - accès aux données.
 *
 * La règle métier (quel libellé, quel sens, quels refus) vit dans
 * `@/lib/ticket-links`, sans base ni session. Ici, seulement les lectures et
 * écritures - et l'unique subtilité de stockage : un lien s'écrit une fois, mais
 * se cherche des DEUX côtés.
 */

/** Ticket voisin, tel qu'il s'affiche au bout d'un lien. */
const bout = {
  select: {
    id: true,
    key: true,
    title: true,
    column: { select: { name: true } },
    type: { select: { name: true, color: true } },
    assignee: { select: { id: true, name: true, email: true } },
  },
} as const;

/** Tous les liens d'un ticket, sortants et entrants confondus. */
export function listLinksForTicket(ticketId: string) {
  return prisma.ticketLink.findMany({
    where: { OR: [{ sourceId: ticketId }, { targetId: ticketId }] },
    include: { source: bout, target: bout },
    orderBy: { createdAt: "asc" },
  });
}

/**
 * Lien existant entre deux tickets, dans un sens OU dans l'autre.
 *
 * C'est la requête qui empêche les doublons symétriques. L'index unique porte
 * sur (source, cible) : sans cette recherche préalable, « A lié à B » et « B lié
 * à A » passeraient tous les deux et la fiche afficherait deux fois le même
 * fait.
 */
export function findLinkBetween(a: string, b: string) {
  return prisma.ticketLink.findFirst({
    where: {
      OR: [
        { sourceId: a, targetId: b },
        { sourceId: b, targetId: a },
      ],
    },
  });
}

/**
 * Pose un lien, en REMPLAÇANT celui qui existerait déjà entre les deux tickets.
 *
 * Deux tickets n'entretiennent qu'une relation à la fois : requalifier un
 * voisinage en dépendance bloquante, c'est corriger le lien, pas en ajouter un
 * second qui contredirait le premier. Le remplacement se fait en transaction, un
 * échec ne laissant sinon aucun lien là où il y en avait un.
 */
export async function linkTickets(
  sourceId: string,
  targetId: string,
  type: TicketLinkType,
  createdById: string,
) {
  const existant = await findLinkBetween(sourceId, targetId);
  return prisma.$transaction(async (tx) => {
    if (existant) await tx.ticketLink.delete({ where: { id: existant.id } });
    return tx.ticketLink.create({
      data: { sourceId, targetId, type, createdById },
    });
  });
}

export function getLinkOwnership(id: string) {
  return prisma.ticketLink.findUnique({
    where: { id },
    select: {
      id: true,
      source: { select: { id: true, projectId: true } },
      target: { select: { id: true, projectId: true } },
    },
  });
}

export function unlinkTickets(id: string) {
  return prisma.ticketLink.delete({ where: { id } });
}

/**
 * Tickets du projet auxquels se lier, hors celui d'où l'on part et hors ceux
 * déjà liés : proposer un ticket déjà lié inviterait à écraser un lien sans le
 * dire.
 */
export async function listLinkCandidates(projectId: string, ticketId: string) {
  const liens = await prisma.ticketLink.findMany({
    where: { OR: [{ sourceId: ticketId }, { targetId: ticketId }] },
    select: { sourceId: true, targetId: true },
  });
  const exclus = new Set<string>([ticketId]);
  for (const l of liens) {
    exclus.add(l.sourceId);
    exclus.add(l.targetId);
  }
  return prisma.ticket.findMany({
    where: { projectId, id: { notIn: [...exclus] } },
    select: { id: true, key: true, title: true },
    orderBy: { number: "desc" },
  });
}
