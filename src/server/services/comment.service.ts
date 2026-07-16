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
