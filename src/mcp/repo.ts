import { prisma } from "@/lib/db";

/**
 * Requetes Prisma propres au serveur MCP (l'IA reference les tickets par leur
 * cle « RKN-123 », pas par id). Aucune autorisation ici : voir src/mcp/service.ts.
 */

/** Ticket complet a partir de sa cle (« RKN-123 »), avec ses relations. */
export function getTicketByKey(key: string) {
  return prisma.ticket.findFirst({
    where: { key },
    include: {
      project: { select: { id: true, key: true, name: true } },
      column: { select: { id: true, name: true, order: true } },
      reporter: { select: { name: true, email: true } },
      assignee: { select: { id: true, name: true, email: true } },
      sprint: { select: { name: true, state: true } },
      type: { select: { name: true } },
      priority: { select: { name: true } },
      labels: { include: { label: { select: { name: true } } } },
      comments: {
        include: { author: { select: { name: true, email: true } } },
        orderBy: { createdAt: "asc" },
      },
      attachments: { select: { filename: true, contentType: true } },
    },
  });
}

/**
 * Tickets d'un projet pour le MCP (colonne / assigne optionnels). `assigneeId`
 * a `null` filtre les tickets non assignes ; `undefined` ne filtre pas.
 */
export function listProjectTickets(
  projectId: string,
  opts: { columnId?: string; assigneeId?: string | null; limit: number },
) {
  return prisma.ticket.findMany({
    where: {
      projectId,
      ...(opts.columnId ? { columnId: opts.columnId } : {}),
      ...(opts.assigneeId === null
        ? { assigneeId: null }
        : opts.assigneeId
          ? { assigneeId: opts.assigneeId }
          : {}),
    },
    orderBy: { updatedAt: "desc" },
    take: opts.limit,
    include: {
      column: { select: { name: true } },
      assignee: { select: { name: true, email: true } },
      type: { select: { name: true } },
      priority: { select: { name: true } },
    },
  });
}

/** Dernier rang (le plus grand) d'une colonne, pour inserer une carte a la fin. */
export async function lastRankInColumn(
  columnId: string,
): Promise<string | null> {
  const t = await prisma.ticket.findFirst({
    where: { columnId },
    orderBy: { rank: "desc" },
    select: { rank: true },
  });
  return t?.rank ?? null;
}

/** Identifiant d'un utilisateur a partir de son e-mail (filtre par assigne). */
export async function findUserIdByEmail(email: string): Promise<string | null> {
  const u = await prisma.user.findUnique({
    where: { email: email.toLowerCase() },
    select: { id: true },
  });
  return u?.id ?? null;
}
