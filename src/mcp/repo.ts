import { prisma } from "@/lib/db";

/**
 * Requetes Prisma propres au serveur MCP (l'IA reference les tickets par leur
 * cle « RKN-123 », pas par id). Aucune autorisation ici : voir src/mcp/service.ts.
 */

/**
 * Reference d'un module telle qu'attendue par `effectiveModule` : c'est ce
 * helper partage qui tranche entre le module du composant et celui du ticket,
 * d'ou la forme `ModuleRef` complete plutot que le seul nom.
 */
const moduleSelect = {
  select: { id: true, name: true, color: true },
} as const;

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
      component: {
        select: {
          name: true,
          kind: true,
          module: moduleSelect,
        },
      },
      module: moduleSelect,
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
 * Tickets d'un projet pour le MCP (colonne / assigne / composant / module
 * optionnels). `assigneeId` a `null` filtre les tickets non assignes ;
 * `undefined` ne filtre pas. Le filtre `moduleId` suit l'invariant du service :
 * un ticket appartient a un module via son composant OU via son propre module.
 */
export function listProjectTickets(
  projectId: string,
  opts: {
    columnId?: string;
    assigneeId?: string | null;
    componentId?: string;
    moduleId?: string;
    limit: number;
  },
) {
  return prisma.ticket.findMany({
    where: {
      projectId,
      ...(opts.columnId ? { columnId: opts.columnId } : {}),
      ...(opts.componentId ? { componentId: opts.componentId } : {}),
      ...(opts.moduleId
        ? {
            OR: [
              { component: { moduleId: opts.moduleId } },
              // `componentId: null` : le composant fait autorite (cf.
              // effectiveModule), un ticket qui en a un ne doit pas remonter
              // via son module propre - sinon le filtre et le champ `module`
              // renvoye divergeraient sur une donnee heritee.
              { componentId: null, moduleId: opts.moduleId },
            ],
          }
        : {}),
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
      component: {
        select: {
          name: true,
          kind: true,
          module: moduleSelect,
        },
      },
      module: moduleSelect,
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
