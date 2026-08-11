import { prisma } from "@/lib/db";
import { rankAfter } from "@/lib/rank";

/**
 * Service Colonne - accès données pur.
 * Suppression : réaffecte les tickets vers la 1re colonne (order min) du projet
 * avant de supprimer, en réattribuant des rangs propres.
 */

/**
 * Projet auquel appartient une colonne, ou `null` si elle n'existe pas.
 *
 * Sert aux gardes : une colonne reçue du client n'est acceptable que si elle
 * relève du même projet que l'objet qu'on y déplace (cf. `moveTicketAction`).
 */
export function getColumnProject(id: string) {
  return prisma.column.findUnique({ where: { id }, select: { projectId: true } });
}

export function listColumns(projectId: string) {
  return prisma.column.findMany({
    where: { projectId },
    orderBy: { order: "asc" },
  });
}

/**
 * Rangs extrêmes des colonnes, par projet : l'entrée du workflow et sa fin.
 *
 * Situer un ticket demande de savoir où commence et où s'arrête le tableau de
 * SON projet. Les charger colonne par colonne ferait une requête par projet
 * pour n'en retenir que deux nombres ; une agrégation en rend l'essentiel d'un
 * seul appel, quel que soit le nombre de projets.
 *
 * `projectIds` restreint la lecture ; `undefined` prend tous les projets.
 * Un projet sans colonne n'apparaît tout simplement pas dans le résultat.
 */
export async function listColumnBounds(
  projectIds?: string[],
): Promise<Map<string, { first: number; last: number }>> {
  const groups = await prisma.column.groupBy({
    by: ["projectId"],
    ...(projectIds ? { where: { projectId: { in: projectIds } } } : {}),
    _min: { order: true },
    _max: { order: true },
  });
  const bounds = new Map<string, { first: number; last: number }>();
  for (const g of groups) {
    if (g._min.order == null || g._max.order == null) continue;
    bounds.set(g.projectId, { first: g._min.order, last: g._max.order });
  }
  return bounds;
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
