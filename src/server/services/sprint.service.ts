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
      tickets: {
        orderBy: { rank: "asc" },
        select: {
          id: true,
          key: true,
          title: true,
          column: { select: { name: true } },
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

export function assignTicketToSprint(ticketId: string, sprintId: string | null) {
  return prisma.ticket.update({
    where: { id: ticketId },
    data: { sprintId },
  });
}
