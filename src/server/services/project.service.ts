import { prisma } from "@/lib/db";

/**
 * Service Projet - accès données pur (aucune autorisation ici : voir les actions).
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
  { name: "Maintenance", color: "#64748B" },
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

/**
 * Projets avec statistiques pour les cartes : nombre de tickets, tickets terminés
 * (dans la dernière colonne du workflow) et nombre de sprints. 2 requêtes.
 * `projectIds` (facultatif) restreint aux projets accessibles ; `[]` = aucun.
 */
export async function listProjectsWithStats(projectIds?: string[]) {
  const projectWhere = projectIds ? { id: { in: projectIds } } : {};
  const columnWhere = projectIds ? { projectId: { in: projectIds } } : {};
  const [projects, columns] = await Promise.all([
    prisma.project.findMany({
      where: projectWhere,
      orderBy: { createdAt: "desc" },
      include: { _count: { select: { tickets: true, sprints: true } } },
    }),
    prisma.column.findMany({
      where: columnWhere,
      select: {
        projectId: true,
        order: true,
        _count: { select: { tickets: true } },
      },
    }),
  ]);

  // Tickets « terminés » = ceux de la colonne d'ordre le plus élevé (dernière).
  const doneByProject = new Map<string, number>();
  const lastOrderByProject = new Map<string, number>();
  for (const c of columns) {
    const prev = lastOrderByProject.get(c.projectId);
    if (prev === undefined || c.order > prev) {
      lastOrderByProject.set(c.projectId, c.order);
      doneByProject.set(c.projectId, c._count.tickets);
    }
  }

  return projects.map((p) => ({
    id: p.id,
    key: p.key,
    name: p.name,
    description: p.description,
    ticketCount: p._count.tickets,
    sprintCount: p._count.sprints,
    doneCount: doneByProject.get(p.id) ?? 0,
  }));
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
