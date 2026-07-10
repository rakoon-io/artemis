import { prisma } from "@/lib/db";

/**
 * Service Type de ticket — accès données pur (autorisation dans les actions).
 * Configurable par projet ; ordre stable via `order` ; unicité `(projectId, name)`
 * garantie en base. Suppression refusée si des tickets l'utilisent.
 */

export function listTicketTypes(projectId: string) {
  return prisma.ticketType.findMany({
    where: { projectId },
    orderBy: { order: "asc" },
  });
}

export interface CreateTicketTypeServiceInput {
  projectId: string;
  name: string;
  color: string;
}

/** Crée un type placé en fin de liste (order = max + 1). */
export async function createTicketType(input: CreateTicketTypeServiceInput) {
  const aggregate = await prisma.ticketType.aggregate({
    where: { projectId: input.projectId },
    _max: { order: true },
  });
  const order = (aggregate._max.order ?? -1) + 1;
  return prisma.ticketType.create({
    data: {
      projectId: input.projectId,
      name: input.name,
      color: input.color,
      order,
    },
  });
}

export interface UpdateTicketTypeServiceInput {
  id: string;
  name?: string;
  color?: string;
}

export function updateTicketType(input: UpdateTicketTypeServiceInput) {
  return prisma.ticketType.update({
    where: { id: input.id },
    data: {
      ...(input.name !== undefined ? { name: input.name } : {}),
      ...(input.color !== undefined ? { color: input.color } : {}),
    },
  });
}

/** Supprime un type ; refuse si au moins un ticket l'utilise (message explicite). */
export async function deleteTicketType(id: string) {
  const inUse = await prisma.ticket.count({ where: { typeId: id } });
  if (inUse > 0) {
    throw new Error(
      "Ce type est utilisé par des tickets et ne peut pas être supprimé.",
    );
  }
  return prisma.ticketType.delete({ where: { id } });
}

/** Applique l'ordre donné : la position de chaque type = son index dans `orderedIds`. */
export async function reorderTicketTypes(projectId: string, orderedIds: string[]) {
  await prisma.$transaction(
    orderedIds.map((id, order) =>
      prisma.ticketType.updateMany({
        where: { id, projectId },
        data: { order },
      }),
    ),
  );
  return listTicketTypes(projectId);
}
