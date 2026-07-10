import { prisma } from "@/lib/db";

/**
 * Service Priorité de ticket — accès données pur (autorisation dans les actions).
 * Configurable par projet ; ordre stable via `order` ; unicité `(projectId, name)`
 * garantie en base. Suppression refusée si des tickets l'utilisent.
 */

export function listTicketPriorities(projectId: string) {
  return prisma.ticketPriority.findMany({
    where: { projectId },
    orderBy: { order: "asc" },
  });
}

export interface CreateTicketPriorityServiceInput {
  projectId: string;
  name: string;
  color: string;
}

/** Crée une priorité placée en fin de liste (order = max + 1). */
export async function createTicketPriority(input: CreateTicketPriorityServiceInput) {
  const aggregate = await prisma.ticketPriority.aggregate({
    where: { projectId: input.projectId },
    _max: { order: true },
  });
  const order = (aggregate._max.order ?? -1) + 1;
  return prisma.ticketPriority.create({
    data: {
      projectId: input.projectId,
      name: input.name,
      color: input.color,
      order,
    },
  });
}

export interface UpdateTicketPriorityServiceInput {
  id: string;
  name?: string;
  color?: string;
}

export function updateTicketPriority(input: UpdateTicketPriorityServiceInput) {
  return prisma.ticketPriority.update({
    where: { id: input.id },
    data: {
      ...(input.name !== undefined ? { name: input.name } : {}),
      ...(input.color !== undefined ? { color: input.color } : {}),
    },
  });
}

/** Supprime une priorité ; refuse si au moins un ticket l'utilise (message explicite). */
export async function deleteTicketPriority(id: string) {
  const inUse = await prisma.ticket.count({ where: { priorityId: id } });
  if (inUse > 0) {
    throw new Error(
      "Cette priorité est utilisée par des tickets et ne peut pas être supprimée.",
    );
  }
  return prisma.ticketPriority.delete({ where: { id } });
}

/** Applique l'ordre donné : la position de chaque priorité = son index dans `orderedIds`. */
export async function reorderTicketPriorities(
  projectId: string,
  orderedIds: string[],
) {
  await prisma.$transaction(
    orderedIds.map((id, order) =>
      prisma.ticketPriority.updateMany({
        where: { id, projectId },
        data: { order },
      }),
    ),
  );
  return listTicketPriorities(projectId);
}
