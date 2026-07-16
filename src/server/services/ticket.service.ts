import { prisma } from "@/lib/db";
import { rankAfter } from "@/lib/rank";
import { Prisma } from "@prisma/client";

/**
 * Service Ticket - accès données pur (autorisation dans les actions).
 * Génération de clé et rang initial faits en transaction.
 * Chaque lecture renvoie `type`/`priority` en `{ id, name, color }` (badges UI).
 */

export interface CreateTicketServiceInput {
  projectId: string;
  title: string;
  description?: string | null;
  typeId?: string;
  priorityId?: string;
  assigneeId?: string | null;
  sprintId?: string | null;
  labelIds?: string[];
}

/**
 * Crée un ticket dans la 1re colonne (order min) du projet.
 * Transaction : incrémente `ticketSeq`, calcule `number`/`key`, place en fin de
 * colonne (`rankAfter` du dernier rang), applique les labels.
 */
export function createTicket(input: CreateTicketServiceInput, reporterId: string) {
  return prisma.$transaction(async (tx) => {
    const project = await tx.project.update({
      where: { id: input.projectId },
      data: { ticketSeq: { increment: 1 } },
    });
    const number = project.ticketSeq;
    const key = `${project.key}-${number}`;

    const column = await tx.column.findFirst({
      where: { projectId: input.projectId },
      orderBy: { order: "asc" },
    });
    if (!column) throw new Error("Le projet ne possède aucune colonne.");

    const last = await tx.ticket.findFirst({
      where: { columnId: column.id },
      orderBy: { rank: "desc" },
    });
    const rank = rankAfter(last?.rank ?? null);

    // Type & priorité : à défaut d'id fourni, on prend le 1er du projet (order min).
    let typeId = input.typeId;
    if (!typeId) {
      const firstType = await tx.ticketType.findFirst({
        where: { projectId: input.projectId },
        orderBy: { order: "asc" },
        select: { id: true },
      });
      if (!firstType) throw new Error("Le projet ne possède aucun type de ticket.");
      typeId = firstType.id;
    }
    let priorityId = input.priorityId;
    if (!priorityId) {
      const firstPriority = await tx.ticketPriority.findFirst({
        where: { projectId: input.projectId },
        orderBy: { order: "asc" },
        select: { id: true },
      });
      if (!firstPriority) throw new Error("Le projet ne possède aucune priorité.");
      priorityId = firstPriority.id;
    }

    // M3 - cohérence projet : sprint, assigné et labels doivent être valides pour ce projet.
    let sprintId = input.sprintId ?? null;
    if (sprintId) {
      const sprint = await tx.sprint.findFirst({
        where: { id: sprintId, projectId: input.projectId },
        select: { id: true },
      });
      if (!sprint) sprintId = null;
    }

    let assigneeId = input.assigneeId ?? null;
    if (assigneeId) {
      const exists = await tx.user.findUnique({
        where: { id: assigneeId },
        select: { id: true },
      });
      if (!exists) assigneeId = null;
    }

    const requestedLabelIds = input.labelIds ?? [];
    const labelIds =
      requestedLabelIds.length > 0
        ? (
            await tx.label.findMany({
              where: { id: { in: requestedLabelIds }, projectId: input.projectId },
              select: { id: true },
            })
          ).map((l) => l.id)
        : [];

    return tx.ticket.create({
      data: {
        projectId: input.projectId,
        number,
        key,
        title: input.title,
        description: input.description ?? null,
        typeId,
        priorityId,
        columnId: column.id,
        rank,
        reporterId,
        assigneeId,
        sprintId,
        labels:
          labelIds.length > 0
            ? { create: labelIds.map((labelId) => ({ labelId })) }
            : undefined,
      },
      include: {
        column: true,
        assignee: true,
        labels: { include: { label: true } },
        type: { select: { id: true, name: true, color: true } },
        priority: { select: { id: true, name: true, color: true } },
      },
    });
  });
}

export interface TicketFilters {
  assigneeId?: string;
  labelId?: string;
  typeId?: string;
  priorityId?: string;
  sprintId?: string;
  columnId?: string;
  q?: string;
  page?: number;
  pageSize?: number;
}

const DEFAULT_PAGE_SIZE = 20;
const MAX_PAGE_SIZE = 100;

/** Liste paginée (tri `updatedAt desc`) avec filtres et recherche titre/description. */
export async function listTickets(projectId: string, filters: TicketFilters = {}) {
  const page = Math.max(1, filters.page ?? 1);
  const pageSize = Math.min(
    MAX_PAGE_SIZE,
    Math.max(1, filters.pageSize ?? DEFAULT_PAGE_SIZE),
  );

  const where: Prisma.TicketWhereInput = {
    projectId,
    ...(filters.assigneeId ? { assigneeId: filters.assigneeId } : {}),
    ...(filters.typeId ? { typeId: filters.typeId } : {}),
    ...(filters.priorityId ? { priorityId: filters.priorityId } : {}),
    ...(filters.sprintId ? { sprintId: filters.sprintId } : {}),
    ...(filters.columnId ? { columnId: filters.columnId } : {}),
    ...(filters.labelId ? { labels: { some: { labelId: filters.labelId } } } : {}),
    ...(filters.q
      ? {
          OR: [
            { title: { contains: filters.q, mode: Prisma.QueryMode.insensitive } },
            { description: { contains: filters.q, mode: Prisma.QueryMode.insensitive } },
          ],
        }
      : {}),
  };

  const [items, total] = await prisma.$transaction([
    prisma.ticket.findMany({
      where,
      orderBy: { updatedAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: {
        column: true,
        assignee: true,
        labels: { include: { label: true } },
        type: { select: { id: true, name: true, color: true } },
        priority: { select: { id: true, name: true, color: true } },
      },
    }),
    prisma.ticket.count({ where }),
  ]);

  return { items, total, page, pageSize };
}

/** Tickets d'un projet ordonnés par rang (pour la vue Kanban). */
export function listBoardTickets(projectId: string) {
  return prisma.ticket.findMany({
    where: { projectId },
    orderBy: { rank: "asc" },
    include: {
      assignee: true,
      labels: { include: { label: true } },
      type: { select: { id: true, name: true, color: true } },
      priority: { select: { id: true, name: true, color: true } },
    },
  });
}

export function getTicketById(id: string) {
  return prisma.ticket.findUnique({
    where: { id },
    include: {
      project: true,
      column: true,
      reporter: true,
      assignee: true,
      sprint: true,
      type: { select: { id: true, name: true, color: true } },
      priority: { select: { id: true, name: true, color: true } },
      labels: { include: { label: true } },
      attachments: { orderBy: { createdAt: "asc" } },
      comments: { include: { author: true }, orderBy: { createdAt: "asc" } },
    },
  });
}

/** Champs minimaux pour les vérifications d'autorisation (propriété du ticket). */
export function getTicketOwnership(id: string) {
  return prisma.ticket.findUnique({
    where: { id },
    select: {
      id: true,
      projectId: true,
      columnId: true,
      reporterId: true,
      assigneeId: true,
    },
  });
}

export interface UpdateTicketServiceInput {
  id: string;
  title?: string;
  description?: string | null;
  typeId?: string;
  priorityId?: string;
  assigneeId?: string | null;
  sprintId?: string | null;
  labelIds?: string[];
}

export function updateTicket(input: UpdateTicketServiceInput) {
  const { id, labelIds, ...rest } = input;
  return prisma.$transaction(async (tx) => {
    const ticket = await tx.ticket.findUnique({
      where: { id },
      select: { projectId: true },
    });
    if (!ticket) throw new Error("Ticket introuvable.");
    const { projectId } = ticket;

    // M3 - cohérence projet : on n'applique sprint/assigné/labels que s'ils sont valides.
    // Un sprint hors projet ou un assigné inexistant est ignoré (valeur non appliquée) ;
    // `null` reste appliqué (désassignation / retrait de sprint volontaires).
    let sprintId = rest.sprintId;
    if (sprintId) {
      const sprint = await tx.sprint.findFirst({
        where: { id: sprintId, projectId },
        select: { id: true },
      });
      if (!sprint) sprintId = undefined;
    }

    let assigneeId = rest.assigneeId;
    if (assigneeId) {
      const exists = await tx.user.findUnique({
        where: { id: assigneeId },
        select: { id: true },
      });
      if (!exists) assigneeId = undefined;
    }

    if (labelIds !== undefined) {
      const validLabelIds =
        labelIds.length > 0
          ? (
              await tx.label.findMany({
                where: { id: { in: labelIds }, projectId },
                select: { id: true },
              })
            ).map((l) => l.id)
          : [];
      await tx.labelOnTicket.deleteMany({ where: { ticketId: id } });
      if (validLabelIds.length > 0) {
        await tx.labelOnTicket.createMany({
          data: validLabelIds.map((labelId) => ({ ticketId: id, labelId })),
        });
      }
    }

    return tx.ticket.update({
      where: { id },
      data: {
        ...(rest.title !== undefined ? { title: rest.title } : {}),
        ...(rest.description !== undefined ? { description: rest.description } : {}),
        ...(rest.typeId !== undefined ? { typeId: rest.typeId } : {}),
        ...(rest.priorityId !== undefined ? { priorityId: rest.priorityId } : {}),
        ...(assigneeId !== undefined ? { assigneeId } : {}),
        ...(sprintId !== undefined ? { sprintId } : {}),
      },
      include: {
        column: true,
        assignee: true,
        labels: { include: { label: true } },
        type: { select: { id: true, name: true, color: true } },
        priority: { select: { id: true, name: true, color: true } },
      },
    });
  });
}

/** Remplace intégralement les labels d'un ticket. */
export function setTicketLabels(ticketId: string, labelIds: string[]) {
  return prisma.$transaction(async (tx) => {
    await tx.labelOnTicket.deleteMany({ where: { ticketId } });
    if (labelIds.length > 0) {
      await tx.labelOnTicket.createMany({
        data: labelIds.map((labelId) => ({ ticketId, labelId })),
      });
    }
    return tx.ticket.findUnique({
      where: { id: ticketId },
      include: { labels: { include: { label: true } } },
    });
  });
}

export function moveTicket(ticketId: string, columnId: string, rank: string) {
  return prisma.ticket.update({
    where: { id: ticketId },
    data: { columnId, rank },
    include: {
      column: true,
      assignee: true,
      labels: { include: { label: true } },
      type: { select: { id: true, name: true, color: true } },
      priority: { select: { id: true, name: true, color: true } },
    },
  });
}

export function deleteTicket(id: string) {
  return prisma.ticket.delete({ where: { id } });
}
