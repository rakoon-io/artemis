import { prisma } from "@/lib/db";

/**
 * Service Projet — accès données pur (aucune autorisation ici : voir les actions).
 * Un projet neuf reçoit 5 colonnes Kanban par défaut (ADR-0002).
 */

/** Colonnes créées automatiquement à la naissance d'un projet (order 0..4). */
export const DEFAULT_COLUMNS = [
  "Backlog",
  "À faire",
  "En cours",
  "En revue",
  "Terminé",
] as const;

export function listProjects() {
  return prisma.project.findMany({ orderBy: { createdAt: "desc" } });
}

export function getProjectByKey(key: string) {
  return prisma.project.findUnique({ where: { key } });
}

export function getProjectById(id: string) {
  return prisma.project.findUnique({ where: { id } });
}

export interface CreateProjectServiceInput {
  name: string;
  key: string;
  description?: string | null;
}

export function createProject(input: CreateProjectServiceInput) {
  return prisma.project.create({
    data: {
      name: input.name,
      key: input.key,
      description: input.description ?? null,
      columns: {
        create: DEFAULT_COLUMNS.map((name, order) => ({ name, order })),
      },
    },
    include: { columns: { orderBy: { order: "asc" } } },
  });
}
