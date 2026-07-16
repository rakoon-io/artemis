import { prisma } from "@/lib/db";
import { rankAfter } from "@/lib/rank";

/**
 * Service Colonne - accès données pur.
 * Suppression : réaffecte les tickets vers la 1re colonne (order min) du projet
 * avant de supprimer, en réattribuant des rangs propres (voir ADR-0002).
 */

export function listColumns(projectId: string) {
  return prisma.column.findMany({
    where: { projectId },
    orderBy: { order: "asc" },
  });
}

export interface CreateColumnServiceInput {
  projectId: string;
  name: string;
  wipLimit?: number | null;
}

export async function createColumn(input: CreateColumnServiceInput) {
  const aggregate = await prisma.column.aggregate({
    where: { projectId: input.projectId },
    _max: { order: true },
  });
  const order = (aggregate._max.order ?? -1) + 1;
  return prisma.column.create({
    data: {
      projectId: input.projectId,
      name: input.name,
      wipLimit: input.wipLimit ?? null,
      order,
    },
  });
}

export interface UpdateColumnServiceInput {
  id: string;
  name?: string;
  wipLimit?: number | null;
}

export function updateColumn(input: UpdateColumnServiceInput) {
  return prisma.column.update({
    where: { id: input.id },
    data: {
      ...(input.name !== undefined ? { name: input.name } : {}),
      ...(input.wipLimit !== undefined ? { wipLimit: input.wipLimit } : {}),
    },
  });
}

/** Applique l'ordre donné : la position de chaque colonne = son index dans `orderedIds`. */
export async function reorderColumns(projectId: string, orderedIds: string[]) {
  await prisma.$transaction(
    orderedIds.map((id, order) =>
      prisma.column.updateMany({
        where: { id, projectId },
        data: { order },
      }),
    ),
  );
  return listColumns(projectId);
}

export async function deleteColumn(id: string) {
  return prisma.$transaction(async (tx) => {
    const column = await tx.column.findUnique({ where: { id } });
    if (!column) throw new Error("Colonne introuvable.");

    const fallback = await tx.column.findFirst({
      where: { projectId: column.projectId, id: { not: id } },
      orderBy: { order: "asc" },
    });
    if (!fallback) {
      throw new Error("Impossible de supprimer l'unique colonne du projet.");
    }

    // Réaffecte les tickets orphelins à la 1re colonne, en les rangeant à la suite
    // des tickets existants (rangs propres → pas de collision de `rank`).
    const orphans = await tx.ticket.findMany({
      where: { columnId: id },
      orderBy: { rank: "asc" },
    });
    if (orphans.length > 0) {
      const last = await tx.ticket.findFirst({
        where: { columnId: fallback.id },
        orderBy: { rank: "desc" },
      });
      let previous = last?.rank ?? null;
      for (const ticket of orphans) {
        previous = rankAfter(previous);
        await tx.ticket.update({
          where: { id: ticket.id },
          data: { columnId: fallback.id, rank: previous },
        });
      }
    }

    return tx.column.delete({ where: { id } });
  });
}
