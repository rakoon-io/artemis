import { prisma } from "@/lib/db";
import { rankAfter } from "@/lib/rank";
import { moduleIdForTicket } from "@/lib/effective-module";
import {
  checkReportDescription,
  reportRequirementMessage,
} from "@/lib/ticket-template";
import { Prisma, TicketTemplate } from "@prisma/client";

/**
 * Service Ticket - accès données pur (autorisation dans les actions).
 * Génération de clé et rang initial faits en transaction.
 * Chaque lecture renvoie `type`/`priority` en `{ id, name, color }` (badges UI)
 * et `component` en `{ id, name, kind, color }` (ou `null` : champ facultatif).
 */

/** Sélection d'un module telle qu'attendue par les vues (badge, filtre, détail). */
const moduleSelect = { select: { id: true, name: true, color: true } } as const;

/**
 * Sélection d'un composant, avec SON module : le module effectif d'un ticket se
 * lit d'abord là (cf. `@/lib/effective-module`), il doit donc être présent
 * partout où l'on charge le composant.
 */
const componentSelect = {
  select: {
    id: true,
    name: true,
    kind: true,
    color: true,
    module: moduleSelect,
  },
} as const;

/**
 * Impose les rubriques du modèle porté par le type, s'il en porte un.
 *
 * Point d'application UNIQUE de la règle : toutes les voies de création passent
 * par ce service - formulaire, ajout rapide, IA, MCP -, aucune ne peut donc y
 * échapper. C'est la traduction de « l'UI masque, le serveur impose » : le
 * formulaire structuré n'est qu'un confort, la contrainte est ici.
 */
function assertReportTemplate(
  type: { name: string; template: TicketTemplate },
  description: string | null | undefined,
): void {
  if (type.template !== TicketTemplate.REPORT) return;
  const check = checkReportDescription(description);
  if (!check.ok) {
    throw new Error(reportRequirementMessage(type.name, check.missing));
  }
}

export interface CreateTicketServiceInput {
  projectId: string;
  title: string;
  description?: string | null;
  typeId?: string;
  priorityId?: string;
  /** Composant concerné (facultatif) : contextualise la demande. */
  componentId?: string | null;
  /**
   * Module propre du ticket (facultatif), pour une demande à grosse maille sans
   * écran précis. Ignoré si un composant est fourni : le module effectif est
   * alors celui du composant (cf. `@/lib/effective-module`).
   */
  moduleId?: string | null;
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

    // Type : à défaut d'id fourni - ou si l'id ne relève pas de ce projet -, on
    // retient un type du projet, comme le font déjà sprint, composant et assigné.
    const types = await tx.ticketType.findMany({
      where: { projectId: input.projectId },
      orderBy: { order: "asc" },
      select: { id: true, name: true, template: true },
    });
    if (types.length === 0) {
      throw new Error("Le projet ne possède aucun type de ticket.");
    }
    const type =
      types.find((candidate) => candidate.id === input.typeId) ??
      // Sans type explicite, on préfère un type qui n'impose PAS de modèle.
      // C'est ce qui laisse vivre l'ajout rapide du Kanban (un titre, rien
      // d'autre) une fois le modèle activé sur « Bug », et le geste reste juste :
      // une capture à la volée est une tâche à trier, pas un rapport qualifié.
      types.find((candidate) => candidate.template === TicketTemplate.NONE) ??
      types[0];

    assertReportTemplate(type, input.description);
    const typeId = type.id;

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

    // M3 - cohérence projet : sprint, composant, assigné et labels doivent être
    // valides pour ce projet.
    let sprintId = input.sprintId ?? null;
    if (sprintId) {
      const sprint = await tx.sprint.findFirst({
        where: { id: sprintId, projectId: input.projectId },
        select: { id: true },
      });
      if (!sprint) sprintId = null;
    }

    let componentId = input.componentId ?? null;
    if (componentId) {
      const component = await tx.component.findFirst({
        where: { id: componentId, projectId: input.projectId },
        select: { id: true },
      });
      if (!component) componentId = null;
    }

    // Module propre : validé comme les autres relations, puis soumis à
    // l'invariant (un ticket rattaché à un composant n'en porte pas).
    let ownModuleId = input.moduleId ?? null;
    if (ownModuleId) {
      const target = await tx.module.findFirst({
        where: { id: ownModuleId, projectId: input.projectId },
        select: { id: true },
      });
      if (!target) ownModuleId = null;
    }
    const moduleId = moduleIdForTicket(componentId, ownModuleId);

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
        componentId,
        moduleId,
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
        component: componentSelect,
        module: moduleSelect,
      },
    });
  });
}

export interface TicketFilters {
  assigneeId?: string;
  labelId?: string;
  typeId?: string;
  priorityId?: string;
  componentId?: string;
  /**
   * Filtre par module EFFECTIF : retient les tickets rattachés au module par
   * leur composant, comme ceux qui le portent directement (cf. l'invariant dans
   * `@/lib/effective-module`).
   */
  moduleId?: string;
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
    ...(filters.componentId ? { componentId: filters.componentId } : {}),
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
    // Le module effectif se lit sur deux chemins : via le composant, ou en
    // direct. D'où un OR - encapsulé dans un `AND` car la clef `OR` est déjà
    // prise par la recherche plein texte ci-dessus, et une seconde l'écraserait.
    ...(filters.moduleId
      ? {
          AND: [
            {
              OR: [
                { component: { moduleId: filters.moduleId } },
                // `componentId: null` est indispensable : le composant fait
                // autorité (cf. `effectiveModule`), donc un ticket qui en a un
                // ne doit JAMAIS être retenu via son module propre - sinon le
                // filtre et l'affichage divergeraient sur une donnée héritée.
                { componentId: null, moduleId: filters.moduleId },
              ],
            },
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
        component: componentSelect,
        module: moduleSelect,
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
      component: componentSelect,
      module: moduleSelect,
    },
  });
}

/** Tickets du projet sans sprint (backlog), pour la vue Sprints. */
export function listBacklogTickets(projectId: string) {
  return prisma.ticket.findMany({
    where: { projectId, sprintId: null },
    orderBy: { updatedAt: "desc" },
    select: {
      id: true,
      key: true,
      title: true,
      column: { select: { name: true } },
      type: { select: { name: true, color: true } },
      priority: { select: { name: true, color: true } },
      assignee: { select: { name: true, email: true } },
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
      // `template` n'est chargé QU'ICI : seule la page de détail a besoin de
      // savoir si la description doit suivre le modèle. Les listes et le Kanban
      // affichent le type, ils n'en éditent pas la description.
      type: { select: { id: true, name: true, color: true, template: true } },
      priority: { select: { id: true, name: true, color: true } },
      component: componentSelect,
      module: moduleSelect,
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
  /** `undefined` = ne pas toucher ; `null` = détacher le composant. */
  componentId?: string | null;
  /** `undefined` = ne pas toucher ; `null` = détacher. Ignoré si un composant reste posé. */
  moduleId?: string | null;
  assigneeId?: string | null;
  sprintId?: string | null;
  labelIds?: string[];
}

export function updateTicket(input: UpdateTicketServiceInput) {
  const { id, labelIds, ...rest } = input;
  return prisma.$transaction(async (tx) => {
    const ticket = await tx.ticket.findUnique({
      where: { id },
      // `componentId` est nécessaire pour trancher l'invariant du module quand
      // l'appelant ne touche pas au composant (mise à jour partielle) ;
      // `typeId`, pour savoir quel modèle s'applique quand le type n'est pas
      // lui-même modifié.
      select: { projectId: true, componentId: true, typeId: true },
    });
    if (!ticket) throw new Error("Ticket introuvable.");
    const { projectId } = ticket;

    // Modèle de ticket : contrôlé UNIQUEMENT lorsque la description est soumise.
    // L'imposer à toute mise à jour rendrait immodifiable l'historique du
    // projet - on ne pourrait plus même réassigner un ticket rédigé avant
    // l'activation du modèle. La contrainte porte sur l'ÉCRITURE d'une
    // description, jamais sur l'existence d'un ticket.
    if (rest.description !== undefined) {
      const type = await tx.ticketType.findFirst({
        where: { id: rest.typeId ?? ticket.typeId, projectId },
        select: { name: true, template: true },
      });
      if (type) assertReportTemplate(type, rest.description);
    }

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

    let componentId = rest.componentId;
    if (componentId) {
      const component = await tx.component.findFirst({
        where: { id: componentId, projectId },
        select: { id: true },
      });
      if (!component) componentId = undefined;
    }

    let ownModuleId = rest.moduleId;
    if (ownModuleId) {
      const target = await tx.module.findFirst({
        where: { id: ownModuleId, projectId },
        select: { id: true },
      });
      if (!target) ownModuleId = undefined;
    }

    // Invariant : le module propre ne subsiste que si le ticket n'a AUCUN
    // composant à l'issue de la mise à jour. `componentId` valant `undefined`
    // (champ non touché), c'est le composant actuel qui tranche.
    const nextComponentId =
      componentId !== undefined ? componentId : ticket.componentId;
    const moduleId = moduleIdForTicket(nextComponentId, ownModuleId);

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
        ...(componentId !== undefined ? { componentId } : {}),
        ...(moduleId !== undefined ? { moduleId } : {}),
        ...(assigneeId !== undefined ? { assigneeId } : {}),
        ...(sprintId !== undefined ? { sprintId } : {}),
      },
      include: {
        column: true,
        assignee: true,
        labels: { include: { label: true } },
        type: { select: { id: true, name: true, color: true } },
        priority: { select: { id: true, name: true, color: true } },
        component: componentSelect,
        module: moduleSelect,
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
      component: componentSelect,
      module: moduleSelect,
    },
  });
}

export function deleteTicket(id: string) {
  return prisma.ticket.delete({ where: { id } });
}
