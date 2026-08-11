import { prisma } from "@/lib/db";
import type { SprintState } from "@prisma/client";

/** Service Sprint - accès données pur. Les dates arrivent en ISO (string) depuis Zod. */

export function listSprints(projectId: string) {
  return prisma.sprint.findMany({
    where: { projectId },
    orderBy: { createdAt: "desc" },
  });
}

/** Projet d'un sprint (pour la garde d'accès des actions). */
export function getSprintProjectId(id: string): Promise<string | null> {
  return prisma.sprint
    .findUnique({ where: { id }, select: { projectId: true } })
    .then((s) => s?.projectId ?? null);
}

/** Sprints du projet avec leurs tickets (pour la vue Sprints qui liste le contenu). */
export function listSprintsWithTickets(projectId: string) {
  return prisma.sprint.findMany({
    where: { projectId },
    orderBy: { createdAt: "desc" },
    include: {
      // La VERSION dans laquelle sort ce sprint. L'information vit sur la page
      // Versions, où on la pose ; elle doit aussi se lire ici, sinon on ne
      // saurait pas, devant une itération, où son travail atterrit.
      release: { select: { id: true, name: true } },
      tickets: {
        orderBy: { rank: "asc" },
        select: {
          id: true,
          key: true,
          title: true,
          // Cf. `listBacklogTickets` : la poignée de déplacement se décide avec
          // les mêmes champs que l'autorisation serveur.
          reporterId: true,
          assigneeId: true,
          // `order` autant que `name` : le rang dit ce qui est ACHEVÉ (dernière
          // colonne), le nom ne sert qu'à l'afficher.
          column: { select: { name: true, order: true } },
          type: { select: { name: true, color: true } },
          priority: { select: { name: true, color: true } },
          assignee: { select: { name: true, email: true } },
        },
      },
    },
  });
}

export interface CreateSprintServiceInput {
  projectId: string;
  name: string;
  goal?: string | null;
  startDate?: string | null;
  endDate?: string | null;
}

export function createSprint(input: CreateSprintServiceInput) {
  return prisma.sprint.create({
    data: {
      projectId: input.projectId,
      name: input.name,
      goal: input.goal ?? null,
      startDate: input.startDate ? new Date(input.startDate) : null,
      endDate: input.endDate ? new Date(input.endDate) : null,
    },
  });
}

export interface UpdateSprintServiceInput {
  id: string;
  name?: string;
  goal?: string | null;
  startDate?: string | null;
  endDate?: string | null;
  state?: SprintState;
}

export function updateSprint(input: UpdateSprintServiceInput) {
  return prisma.sprint.update({
    where: { id: input.id },
    data: {
      ...(input.name !== undefined ? { name: input.name } : {}),
      ...(input.goal !== undefined ? { goal: input.goal } : {}),
      ...(input.startDate !== undefined
        ? { startDate: input.startDate ? new Date(input.startDate) : null }
        : {}),
      ...(input.endDate !== undefined
        ? { endDate: input.endDate ? new Date(input.endDate) : null }
        : {}),
      ...(input.state !== undefined ? { state: input.state } : {}),
    },
  });
}

export function setSprintState(id: string, state: SprintState) {
  return prisma.sprint.update({ where: { id }, data: { state } });
}

/** Supprime un sprint après avoir détaché ses tickets (`sprintId = null`). */
export async function deleteSprint(id: string) {
  return prisma.$transaction(async (tx) => {
    await tx.ticket.updateMany({
      where: { sprintId: id },
      data: { sprintId: null },
    });
    return tx.sprint.delete({ where: { id } });
  });
}

export function assignTicketToSprint(
  ticketId: string,
  sprintId: string | null,
) {
  return prisma.ticket.update({
    where: { id: ticketId },
    data: { sprintId },
  });
}

/**
 * Rattache un sprint à une version, ou l'en détache (`releaseId` nul).
 *
 * Aucune donnée de ticket n'est déplacée : l'appartenance se DÉDUIT du lien
 * (cf. `@/lib/release-scope`). Rattacher puis détacher laisse donc les tickets
 * exactement comme ils étaient, ce qui ne serait pas vrai d'une recopie.
 */
export function setSprintRelease(id: string, releaseId: string | null) {
  return prisma.sprint.update({ where: { id }, data: { releaseId } });
}

/** Sprint réduit à ce qui décide de son rattachement (garde d'accès + règle). */
export function getSprintScope(id: string) {
  return prisma.sprint.findUnique({
    where: { id },
    select: { id: true, projectId: true, releaseId: true },
  });
}

/** Sprints du projet et leur version, pour proposer un rattachement. */
export function listSprintsForRelease(projectId: string) {
  return prisma.sprint.findMany({
    where: { projectId },
    orderBy: { createdAt: "asc" },
    select: {
      id: true,
      name: true,
      state: true,
      releaseId: true,
      _count: { select: { tickets: true } },
    },
  });
}
