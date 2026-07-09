import { prisma } from "@/lib/db";
import type { SprintState } from "@prisma/client";

/** Service Sprint — accès données pur. Les dates arrivent en ISO (string) depuis Zod. */

export function listSprints(projectId: string) {
  return prisma.sprint.findMany({
    where: { projectId },
    orderBy: { createdAt: "desc" },
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
