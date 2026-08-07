import { prisma } from "@/lib/db";

/** Service Commentaire - accès données pur. */

export function listComments(ticketId: string) {
  return prisma.comment.findMany({
    where: { ticketId },
    orderBy: { createdAt: "asc" },
    include: { author: true },
  });
}

export function createComment(ticketId: string, authorId: string, body: string) {
  return prisma.comment.create({
    data: { ticketId, authorId, body },
    include: { author: true },
  });
}

/** Auteur et ticket d'un commentaire : de quoi vérifier qui a le droit d'y toucher. */
export function getCommentOwnership(id: string) {
  return prisma.comment.findUnique({
    where: { id },
    select: { id: true, authorId: true, ticketId: true },
  });
}

/**
 * Retouche le corps d'un commentaire et DATE la retouche : le fil garde trace
 * que ce qui s'y lit n'est plus ce qui y avait été écrit.
 */
export function updateComment(id: string, body: string) {
  return prisma.comment.update({
    where: { id },
    data: { body, editedAt: new Date() },
    include: { author: true },
  });
}
