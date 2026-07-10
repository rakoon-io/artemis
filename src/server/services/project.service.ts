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

/** Types de tickets créés par défaut à la naissance d'un projet (order 0..3). */
export const DEFAULT_TICKET_TYPES = [
  { name: "Bug", color: "#EF4444" },
  { name: "Fonctionnalité", color: "#6366F1" },
  { name: "Tâche", color: "#0EA5E9" },
  { name: "Corvée", color: "#64748B" },
] as const;

/** Priorités de tickets créées par défaut à la naissance d'un projet (order 0..3). */
export const DEFAULT_TICKET_PRIORITIES = [
  { name: "Basse", color: "#94A3B8" },
  { name: "Moyenne", color: "#0EA5E9" },
  { name: "Haute", color: "#F59E0B" },
  { name: "Urgente", color: "#EF4444" },
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
      ticketTypes: {
        create: DEFAULT_TICKET_TYPES.map((t, order) => ({ ...t, order })),
      },
      ticketPriorities: {
        create: DEFAULT_TICKET_PRIORITIES.map((p, order) => ({ ...p, order })),
      },
    },
    include: { columns: { orderBy: { order: "asc" } } },
  });
}

export interface UpdateProjectServiceInput {
  name: string;
  description?: string | null;
  accentColor?: string | null;
}

/** Met à jour le nom / la description / la couleur d'accent (aucune autorisation ici). */
export function updateProject(id: string, data: UpdateProjectServiceInput) {
  return prisma.project.update({
    where: { id },
    data: {
      name: data.name,
      description: data.description ?? null,
      // `undefined` = ne pas toucher ; `null` = revenir à la charte par défaut.
      ...(data.accentColor !== undefined ? { accentColor: data.accentColor } : {}),
    },
  });
}
